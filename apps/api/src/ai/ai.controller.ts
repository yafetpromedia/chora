import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { AiService } from './ai.service';
import { AiChatDto } from './dto/ai-chat.dto';
import { AnnouncementDraftDto } from './dto/announcement-draft.dto';
import { ReportCommentDraftDto } from './dto/report-comment.dto';
import { StudyAssistDto } from './dto/study-assist.dto';

@Controller('schools/ai')
@UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('status')
  @Roles('admin', 'staff', 'teacher', 'student', 'parent')
  status() {
    return {
      configured: this.ai.isConfigured(),
      model: this.ai.isConfigured() ? this.ai.getModel() : null,
    };
  }

  @Post('study')
  @Roles('admin', 'staff', 'teacher', 'student')
  study(@Body() dto: StudyAssistDto) {
    return this.ai.studyAssist(dto.action, dto.text, {
      title: dto.title,
      subject: dto.subject,
    });
  }

  @Post('announcement-draft')
  @Roles('admin', 'staff')
  announcementDraft(@Body() dto: AnnouncementDraftDto) {
    return this.ai.draftAnnouncement(dto.prompt, dto.audience);
  }

  @Post('report-comment')
  @Roles('admin', 'staff', 'teacher')
  reportComment(@Body() dto: ReportCommentDraftDto) {
    return this.ai.draftReportComment(dto.kind, dto.context, {
      studentName: dto.studentName,
      termName: dto.termName,
    });
  }

  @Post('chat')
  @Roles('admin', 'staff', 'teacher', 'student', 'parent')
  chat(@Body() dto: AiChatDto, @CurrentUser() user: AuthUser) {
    return this.ai.chat(dto.messages, dto.pageContext, user.role);
  }
}
