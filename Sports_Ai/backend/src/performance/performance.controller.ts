import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PerformanceService } from './performance.service';

@Controller('v1/performance')
@UseGuards(JwtAuthGuard)
export class PerformanceController {
  constructor(private performanceService: PerformanceService) {}

  @Get('stats')
  async getStats(
    @Request() req: any,
    @Query('timeRange') timeRange: string = '30d',
  ) {
    const validRanges = ['7d', '30d', '90d', 'all'];
    const range = validRanges.includes(timeRange) ? timeRange : '30d';
    return this.performanceService.getPerformanceStats(req.user.id, range);
  }
}
