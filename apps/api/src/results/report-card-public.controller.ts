import { Controller, Get, Query } from '@nestjs/common';
import { AcademicsService } from './academics.service';

/** Unauthenticated report-card verification for QR scans. */
@Controller('public/report-cards')
export class ReportCardPublicController {
  constructor(private readonly academicsService: AcademicsService) {}

  @Get('verify')
  verify(@Query('t') token: string) {
    return this.academicsService.verifyReportCardPublic(token ?? '');
  }
}
