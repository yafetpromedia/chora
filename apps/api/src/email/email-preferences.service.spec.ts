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
    const client = { ...prisma, $transaction: jest.fn() };
    client.$transaction.mockImplementation(
      (run: (tx: typeof client) => Promise<unknown>) => run(client),
    );
    return {
      prisma: client,
      service: new EmailPreferencesService(client as never),
    };
  }

  const sameSchoolRow = {
    userId: 'parent-1',
    schoolId: 'school-a',
    enabled: true,
    absenceEnabled: true,
    lateEnabled: true,
    examinationEnabled: true,
    announcementEnabled: true,
    paymentReminderEnabled: true,
    paymentConfirmationEnabled: true,
    reportCardEnabled: true,
  };

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
    prisma.user.findFirst.mockResolvedValue({ id: 'parent-1' });
    prisma.parentEmailPreference.findUnique.mockResolvedValue(sameSchoolRow);
    prisma.parentEmailPreference.update.mockImplementation(
      ({ data }: { data: { enabled?: boolean } }) => ({
        ...sameSchoolRow,
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
    expect(prisma.parentEmailPreference.update).toHaveBeenCalledWith({
      where: { userId: 'parent-1' },
      data: { enabled: false },
    });
  });

  it('refuses to update a preference stored for another school', async () => {
    const { prisma, service } = setup();
    prisma.user.findFirst.mockResolvedValue({ id: 'parent-1' });
    prisma.parentEmailPreference.findUnique.mockResolvedValue({
      ...sameSchoolRow,
      schoolId: 'school-a',
    });

    await expect(
      service.updateOwn(
        { id: 'parent-1', schoolId: 'school-b', role: 'parent' },
        { enabled: false },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.parentEmailPreference.update).not.toHaveBeenCalled();
    expect(prisma.parentEmailPreference.create).not.toHaveBeenCalled();
  });

  it('does not reassign an existing preference to the caller school', async () => {
    const { prisma, service } = setup();
    prisma.user.findFirst.mockResolvedValue({ id: 'parent-1' });
    prisma.parentEmailPreference.findUnique.mockResolvedValue({
      ...sameSchoolRow,
      schoolId: 'school-a',
    });

    await expect(
      service.updateParentAsAdmin('school-b', 'parent-1', {
        absenceEnabled: false,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.parentEmailPreference.update).not.toHaveBeenCalled();
  });

  it('keeps a concurrently created row in its original school', async () => {
    const { prisma, service } = setup();
    prisma.user.findFirst.mockResolvedValue({ id: 'parent-1' });
    prisma.parentEmailPreference.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...sameSchoolRow, schoolId: 'school-b' });
    prisma.parentEmailPreference.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.updateOwn(
        { id: 'parent-1', schoolId: 'school-a', role: 'parent' },
        { enabled: false },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.parentEmailPreference.update).not.toHaveBeenCalled();
  });

  it('updates flags after a same-school create race without moving the row', async () => {
    const { prisma, service } = setup();
    prisma.user.findFirst.mockResolvedValue({ id: 'parent-1' });
    prisma.parentEmailPreference.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(sameSchoolRow);
    prisma.parentEmailPreference.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    prisma.parentEmailPreference.update.mockImplementation(
      ({ data }: { data: Record<string, boolean> }) => ({
        ...sameSchoolRow,
        ...data,
      }),
    );

    await service.updateOwn(
      { id: 'parent-1', schoolId: 'school-a', role: 'parent' },
      { enabled: false },
    );

    expect(prisma.parentEmailPreference.update).toHaveBeenCalledWith({
      where: { userId: 'parent-1' },
      data: { enabled: false },
    });
  });
});
