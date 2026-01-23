import { Controller, Post, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SyncService } from '../integrations/sync.service';
import { UsersService } from '../users/users.service';

@Controller('v1/admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(
    private readonly syncService: SyncService,
    private readonly usersService: UsersService,
  ) {}

  @Post('sync')
  async triggerSync(@Request() req: any) {
    const user = await this.usersService.findById(req.user.id);
    if (user?.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    // Trigger async sync
    const sports = ['soccer_epl', 'soccer_spain_la_liga', 'soccer_italy_serie_a', 'basketball_nba'];
    this.syncService.syncOddsForSports(sports).catch(err => {
      console.error('Manual sync failed:', err);
    });

    return {
      success: true,
      message: 'Sync process initiated for major leagues.',
      timestamp: new Date().toISOString(),
    };
  }
}
