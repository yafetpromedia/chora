import { Injectable } from '@nestjs/common';

import { AttendanceStatus } from '@prisma/client';

import { UserRole } from '../common/auth.types';

import { PrismaService } from '../prisma/prisma.service';

import { NotificationsService } from '../notifications/notifications.service';

import { SchoolDayDashboardService } from './school-day-dashboard.service';



@Injectable()

export class DashboardsService {

  constructor(

    private readonly prisma: PrismaService,

    private readonly notificationsService: NotificationsService,

    private readonly schoolDay: SchoolDayDashboardService,

  ) {}



  async getDashboard(role: UserRole, schoolId: string, userId: string) {

    const today = new Date();

    today.setUTCHours(0, 0, 0, 0);



    const [announcements, userCounts, todayRecords, unreadNotifications] =

      await Promise.all([

        this.prisma.announcement.count({ where: { schoolId } }),

        this.prisma.user.groupBy({

          by: ['role'],

          where: { schoolId },

          _count: { _all: true },

        }),

        this.prisma.attendanceRecord.findMany({

          where: { schoolId, date: today, periodNumber: 0 },

          select: { status: true },

        }),

        role === 'parent'

          ? this.notificationsService.unreadCount(userId, schoolId)

          : Promise.resolve(0),

      ]);



    const countByRole = Object.fromEntries(

      userCounts.map((item) => [item.role, item._count._all]),

    ) as Record<string, number>;



    const marked = todayRecords.length;

    const presentToday = todayRecords.filter(

      (r) =>

        r.status === AttendanceStatus.present ||

        r.status === AttendanceStatus.late ||

        r.status === AttendanceStatus.excused,

    ).length;

    const todayRate =

      marked > 0 ? Math.round((presentToday / marked) * 100) : null;



    const common = {

      schoolId,

      announcements,

      unreadNotifications,

    };



    if (role === 'teacher') {

      const day = await this.schoolDay.getTeacherDay(schoolId, userId);

      return {

        ...common,

        day,

        classesToday: day.classesToday,

        attendancePendingCount: day.attendancePendingCount,

        resultsPendingCount: day.resultsPendingCount,

        pendingGrades: day.resultsPendingCount,

      };

    }



    if (role === 'student') {

      const profile = await this.prisma.studentProfile.findUnique({

        where: { userId },

      });

      let attendanceRate = 100;

      if (profile) {

        const records = await this.prisma.attendanceRecord.findMany({

          where: {

            schoolId,

            studentProfileId: profile.id,

            periodNumber: 0,

          },

          take: 90,

        });

        if (records.length > 0) {

          const attended = records.filter(

            (r) =>

              r.status === AttendanceStatus.present ||

              r.status === AttendanceStatus.late ||

              r.status === AttendanceStatus.excused,

          ).length;

          attendanceRate = Math.round((attended / records.length) * 100);

        }

      }

      return { ...common, attendanceRate, upcomingAssignments: 2 };

    }



    if (role === 'parent') {

      const day = await this.schoolDay.getParentDay(userId, schoolId);

      return {

        ...common,

        day,

        children: day.children.length,

        alerts: unreadNotifications,

        totalDueCents: day.totalDueCents,

      };

    }



    if (role === 'admin' || role === 'staff') {

      const day = await this.schoolDay.getAdminDay(schoolId);

      return {

        ...common,

        day,

        activeUsers:

          (countByRole.admin ?? 0) +

          (countByRole.staff ?? 0) +

          (countByRole.teacher ?? 0) +

          (countByRole.student ?? 0) +

          (countByRole.parent ?? 0),

        parentCount: countByRole.parent ?? 0,

        studentCount: countByRole.student ?? 0,

        staffCount: countByRole.staff ?? 0,

        totalTeachers: countByRole.teacher ?? 0,

        attendanceToday: day.attendance.rate ?? todayRate,

        studentsMarkedToday: day.attendance.marked,

      };

    }



    return {

      ...common,

      activeUsers:

        (countByRole.admin ?? 0) +

        (countByRole.staff ?? 0) +

        (countByRole.teacher ?? 0) +

        (countByRole.student ?? 0) +

        (countByRole.parent ?? 0),

      parentCount: countByRole.parent ?? 0,

      studentCount: countByRole.student ?? 0,

      staffCount: countByRole.staff ?? 0,

      totalTeachers: countByRole.teacher ?? 0,

      attendanceToday: todayRate,

      studentsMarkedToday: marked,

    };

  }

}


