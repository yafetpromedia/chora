import { Injectable } from '@nestjs/common';
import { UserRole } from '../common/auth.types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(role: UserRole, schoolId: string) {
    const [announcements, userCounts] = await Promise.all([
      this.prisma.announcement.count({ where: { schoolId } }),
      this.prisma.user.groupBy({
        by: ['role'],
        where: { schoolId },
        _count: { _all: true },
      }),
    ]);

    const countByRole = Object.fromEntries(
      userCounts.map((item) => [item.role, item._count._all]),
    ) as Record<string, number>;

    const common = {
      schoolId,
      announcements,
      unreadNotifications: 3,
    };

    if (role === 'teacher') {
      return { ...common, classesToday: 5, pendingGrades: 18 };
    }
    if (role === 'student') {
      return { ...common, attendanceRate: 96, upcomingAssignments: 2 };
    }
    if (role === 'parent') {
      return { ...common, children: 1, alerts: 1 };
    }
    return {
      ...common,
      activeUsers:
        (countByRole.admin ?? 0) +
        (countByRole.teacher ?? 0) +
        (countByRole.student ?? 0) +
        (countByRole.parent ?? 0),
      totalTeachers: countByRole.teacher ?? 0,
    };
  }
}
