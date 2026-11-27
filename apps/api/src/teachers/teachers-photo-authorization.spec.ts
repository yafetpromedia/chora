import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { TeachersService } from './teachers.service';

describe('TeachersService photo authorization', () => {
  const prisma = {
    user: {
      findFirst: jest.fn(),
    },
    teacherProfile: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const service = new TeachersService(prisma as never, {} as never);

  const allowedRoles = [UserRole.admin, UserRole.staff, UserRole.teacher];

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findFirst.mockResolvedValue(null);
  });

  it('rejects setting photos for accounts outside the staff role allowlist', async () => {
    await expect(
      service.adminSetPhoto('school-a', 'parent-1', 'admin-1', {
        photoUrl: 'data:image/png;base64,AAAA',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'parent-1',
        schoolId: 'school-a',
        role: { in: allowedRoles },
      },
      include: { teacherProfile: true },
    });

    expect(prisma.teacherProfile.create).not.toHaveBeenCalled();
    expect(prisma.teacherProfile.update).not.toHaveBeenCalled();
  });

  it('rejects clearing photos for accounts outside the staff role allowlist', async () => {
    await expect(
      service.adminClearPhoto('school-a', 'student-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'student-1',
        schoolId: 'school-a',
        role: { in: allowedRoles },
      },
      select: { id: true },
    });

    expect(prisma.teacherProfile.findFirst).not.toHaveBeenCalled();
    expect(prisma.teacherProfile.update).not.toHaveBeenCalled();
  });
  it.each(['png', 'jpeg', 'webp'])(
    'accepts a valid %s Base64 photo upload',
    async (format) => {
      const photoUrl = `data:image/${format};base64,${'A'.repeat(32)}`;
      const submittedAt = new Date();
      prisma.teacherProfile.findFirst.mockResolvedValue({ id: 'profile-1' });
      prisma.teacherProfile.update.mockResolvedValue({
        photoUrl: null,
        pendingPhotoUrl: photoUrl,
        photoReviewStatus: 'PENDING',
        photoSubmittedAt: submittedAt,
        photoReviewedAt: null,
        photoReviewNote: null,
      });

      await service.submitMyPhoto('school-a', 'teacher-1', { photoUrl });

      expect(prisma.teacherProfile.update).toHaveBeenCalledTimes(1);
      const updateCalls = prisma.teacherProfile.update.mock
        .calls as unknown as Array<[{ data: { pendingPhotoUrl: string } }]>;
      const updateCall = updateCalls[0][0];
      expect(updateCall.data.pendingPhotoUrl).toBe(photoUrl);
    },
  );

  it.each([
    ['HTTPS URL', 'https://example.com/photo.png'],
    ['SVG data URL', `data:image/svg+xml;base64,${'A'.repeat(32)}`],
    ['malformed Base64', 'data:image/png;base64,not-valid!'],
    ['invalid image subtype', `data:image/gif;base64,${'A'.repeat(32)}`],
    ['oversized data URL', `data:image/png;base64,${'A'.repeat(3_000_000)}`],
  ])('rejects %s teacher photos', async (_label, photoUrl) => {
    await expect(
      service.submitMyPhoto('school-a', 'teacher-1', { photoUrl }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.teacherProfile.findFirst).not.toHaveBeenCalled();
  });
});
