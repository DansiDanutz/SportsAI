import { Controller, Get, Query, Req } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private leaderboardService: LeaderboardService) {}

  @Get()
  async getLeaderboard(
    @Query('period') period = '30d',
    @Query('category') category = 'overall',
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.leaderboardService.getLeaderboard(period, category, userId);
  }
}
