import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EmailPreferencesService } from './email-preferences.service';

describe('email preferences', () => {
  function setup() {
    const prisma = {
      schoolEmailPreference: {
        findUnique: jest.fn(),
        upsert: jest.fn(async ({ where, create }: { where: { schoolId: string }; create: object }) => ({
          schoolId: where.schoolId,
          ...create,
        })),
      },
      parentEmailPreference: {
        findFirst: jest.fn(),
        upsert: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
      },
    };
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

  it('lets a parent change only their own preferences', async () => {
    const { prisma, service } = setup();
    prisma.parentEmailPreference.upsert.mockResolvedValue({
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
    });
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
    expect(prisma.parentEmailPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'parent-1' },
        create: expect.objectContaining({ schoolId: 'school-a', enabled: false }),
      }),
    );
  });
});
