import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EmailPreferencesService } from './email-preferences.service';

describe('email preferences', () => {
  function setup() {
    const prisma = {
      schoolEmailPreference: {
        findUnique: jest.fn(),
        upsert: jest.fn(
          ({
            where,
            create,
          }: {
            where: { schoolId: string };
            create: object;
          }) => ({
            schoolId: where.schoolId,
            ...create,
          }),
        ),
      },
      parentEmailPreference: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
      },
    };
    Object.assign(prisma, {
      $transaction: jest.fn((callback: (tx: typeof prisma) => unknown) =>
        callback(prisma),
      ),
    });
    return { prisma, service: new EmailPreferencesService(prisma as never) };
  }

  it('keeps one school preference from changing another school', async () => {
    const { prisma, service } = setup();
    await service.updateSchool('school-a', { absenceEnabled: false });
    expect(prisma.schoolEmailPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { schoolId: 'school-a' } }),
    );
    const call = prisma.schoolEmailPreference.upsert.mock.calls[0][0] as {
      where: { schoolId: string };
    };
    expect(call.where.schoolId).not.toBe('school-b');
  });

  it('refuses a parent update outside the actor school', async () => {
    const { prisma, service } = setup();
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(
      service.updateParentAsAdmin('school-b', 'parent-from-a', {
        absenceEnabled: false,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: 'parent-from-a', schoolId: 'school-b', role: 'parent' },
      select: { id: true },
    });
  });

  it('refuses to update a preference row belonging to another school', async () => {
    const { prisma, service } = setup();
    prisma.user.findFirst.mockResolvedValue({ id: 'parent-1' });
    prisma.parentEmailPreference.findUnique.mockResolvedValue({
      userId: 'parent-1',
      schoolId: 'school-b',
    });

    await expect(
      service.updateOwn(
        { id: 'parent-1', schoolId: 'school-a', role: 'parent' },
        { absenceEnabled: false },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.parentEmailPreference.update).not.toHaveBeenCalled();
  });

  it('rejects a concurrent preference create if the winning row belongs to another school', async () => {
    const { prisma, service } = setup();
    prisma.user.findFirst.mockResolvedValue({ id: 'parent-1' });
    prisma.parentEmailPreference.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        userId: 'parent-1',
        schoolId: 'school-b',
      });
    prisma.parentEmailPreference.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.updateOwn(
        { id: 'parent-1', schoolId: 'school-a', role: 'parent' },
        { absenceEnabled: false },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.parentEmailPreference.create).toHaveBeenCalledTimes(1);
    expect(prisma.parentEmailPreference.update).not.toHaveBeenCalled();
    expect(prisma.user.findFirst).toHaveBeenCalledTimes(2);
    expect(prisma.parentEmailPreference.findUnique).toHaveBeenCalledTimes(2);
  });

  it('lets a parent change only their own preferences', async () => {
    const { prisma, service } = setup();
    prisma.user.findFirst.mockResolvedValue({ id: 'parent-1' });
    prisma.parentEmailPreference.findUnique.mockResolvedValue(null);
    prisma.parentEmailPreference.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => ({
        userId: 'parent-1',
        schoolId: 'school-a',
        enabled: false,
        absenceEnabled: true,
        lateEnabled: true,
        examinationEnabled: true,
        announcementEnabled: true,
        paymentReminderEnabled: true,
        paymentConfirmationEnabled: true,
        reportCardEnabled: true,
        ...data,
      }),
    );
    await expect(
      service.updateOwn(
        { id: 'teacher-1', schoolId: 'school-a', role: 'teacher' },
        { enabled: false },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await service.updateOwn(
      { id: 'parent-1', schoolId: 'school-a', role: 'parent' },
      { enabled: false },
    );
    const createCalls = prisma.parentEmailPreference.create.mock
      .calls as unknown as Array<[{ data: Record<string, unknown> }]>;
    const createCall = createCalls[0][0];
    expect(createCall.data).toMatchObject({
      userId: 'parent-1',
      schoolId: 'school-a',
      enabled: false,
    });
  });
});
