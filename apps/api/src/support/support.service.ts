import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { SupportTicketCategory, SupportTicketStatus } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto';

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly email?: EmailService,
  ) {}

  private readonly ticketInclude = {
    school: {
      select: {
        id: true,
        name: true,
        slug: true,
        joinCode: true,
        email: true,
        phone: true,
        status: true,
      },
    },
    createdBy: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    },
  } as const;

  async create(schoolId: string, userId: string, dto: CreateSupportTicketDto) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        schoolId,
        createdById: userId,
        subject: dto.subject.trim(),
        body: dto.body.trim(),
        category: dto.category ?? SupportTicketCategory.OTHER,
      },
      include: this.ticketInclude,
    });
    if (ticket.createdBy.email) {
      await this.email?.enqueueSafe({
        to: ticket.createdBy.email,
        schoolId,
        category: 'support_confirmation',
        templateId: 'support_confirmation',
        idempotencyKey: `support:${ticket.id}`,
        vars: {
          firstName: ticket.createdBy.firstName,
          title: ticket.subject,
          schoolName: ticket.school.name,
        },
      });
    }
    return this.serialize(ticket);
  }

  async listForSchool(schoolId: string) {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { schoolId },
      include: this.ticketInclude,
      orderBy: { createdAt: 'desc' },
    });
    return tickets.map((t) => this.serialize(t));
  }

  async getForSchool(schoolId: string, id: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, schoolId },
      include: this.ticketInclude,
    });
    if (!ticket) throw new NotFoundException('Support ticket not found');
    return this.serialize(ticket);
  }

  async listForPlatform(filters?: {
    status?: SupportTicketStatus;
    schoolId?: string;
  }) {
    const tickets = await this.prisma.supportTicket.findMany({
      where: {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.schoolId ? { schoolId: filters.schoolId } : {}),
      },
      include: this.ticketInclude,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
    return tickets.map((t) => this.serialize(t));
  }

  async getForPlatform(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: this.ticketInclude,
    });
    if (!ticket) throw new NotFoundException('Support ticket not found');
    return this.serialize(ticket);
  }

  async updateForPlatform(id: string, dto: UpdateSupportTicketDto) {
    const existing = await this.prisma.supportTicket.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        subject: true,
        schoolId: true,
        createdById: true,
        platformNote: true,
      },
    });
    if (!existing) throw new NotFoundException('Support ticket not found');

    const nextStatus = dto.status ?? existing.status;
    const resolved =
      nextStatus === SupportTicketStatus.RESOLVED ||
      nextStatus === SupportTicketStatus.CLOSED;
    const nextNote =
      dto.platformNote !== undefined
        ? dto.platformNote.trim() || null
        : existing.platformNote;
    const becameResolved =
      resolved &&
      existing.status !== SupportTicketStatus.RESOLVED &&
      existing.status !== SupportTicketStatus.CLOSED;
    const noteChanged =
      dto.platformNote !== undefined && nextNote !== existing.platformNote;
    const shouldNotify = becameResolved || noteChanged;

    const ticket = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.platformNote !== undefined ? { platformNote: nextNote } : {}),
        resolvedAt: resolved ? new Date() : null,
      },
      include: this.ticketInclude,
    });

    if (shouldNotify) {
      const title = resolved
        ? `Support resolved: ${ticket.subject}`
        : `Support update: ${ticket.subject}`;
      const body =
        nextNote?.trim() ||
        (resolved
          ? 'Your support report was marked resolved. Open Support to review.'
          : 'Your support report was updated. Open Support to review.');
      await this.prisma.announcement.create({
        data: {
          schoolId: ticket.schoolId,
          title,
          body,
          createdBy: ticket.createdById,
          recipientUserId: ticket.createdById,
        },
      });
    }

    return this.serialize(ticket);
  }

  private serialize(ticket: {
    id: string;
    schoolId: string;
    createdById: string;
    subject: string;
    body: string;
    category: SupportTicketCategory;
    status: SupportTicketStatus;
    platformNote: string | null;
    resolvedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    school: {
      id: string;
      name: string;
      slug: string;
      joinCode: string;
      email: string | null;
      phone: string | null;
      status: string;
    };
    createdBy: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
    };
  }) {
    return {
      id: ticket.id,
      schoolId: ticket.schoolId,
      subject: ticket.subject,
      body: ticket.body,
      category: ticket.category,
      status: ticket.status,
      platformNote: ticket.platformNote,
      resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      school: ticket.school,
      reporter: {
        id: ticket.createdBy.id,
        name: `${ticket.createdBy.firstName} ${ticket.createdBy.lastName}`.trim(),
        email: ticket.createdBy.email,
        role: ticket.createdBy.role,
      },
    };
  }
}
