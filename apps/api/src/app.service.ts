import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Edu OS API';
  }

  getHealth() {
    return {
      status: 'ok',
      service: 'edu-os-api',
      timestamp: new Date().toISOString(),
    };
  }

  getAdminOverview(schoolId: string) {
    return {
      schoolId,
      metrics: {
        students: 480,
        teachers: 32,
        classes: 16,
      },
    };
  }
}
