import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PublicStudentResultsUnlockDto } from './dto/public-student-results.dto';
import { PublicStudentResultsService } from './public-student-results.service';

/** Unauthenticated student results via ID-card QR + portal password. */
@Controller('public/student-results')
export class PublicStudentResultsController {
  constructor(private readonly service: PublicStudentResultsService) {}

  @Get('meta')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  meta(@Query('s') schoolCode: string, @Query('c') cardCode: string) {
    return this.service.meta(schoolCode ?? '', cardCode ?? '');
  }

  @Post('unlock')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  unlock(@Body() dto: PublicStudentResultsUnlockDto) {
    return this.service.unlock(dto.schoolCode, dto.cardCode, dto.password);
  }
}
