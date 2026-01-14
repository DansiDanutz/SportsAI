import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SyncService } from '../integrations/sync.service';

@Controller()
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private syncService: SyncService,
  ) {}

  @Get('healthz')
  healthz(): { status: string; service: string; version?: string; commit?: string } {
    // Render exposes RENDER_GIT_COMMIT in the runtime env for Git-based deploys.
    // We surface it so we can verify the running code matches the expected commit.
    const commit = process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT;
    const version = process.env.npm_package_version || process.env.APP_VERSION;
    return { status: 'ok', service: 'sportsai-backend', version, commit };
  }

  // Convenience alias (some tools default to /health)
  @Get('health')
  health(): { status: string; service: string; version?: string; commit?: string } {
    const commit = process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT;
    const version = process.env.npm_package_version || process.env.APP_VERSION;
    return { status: 'ok', service: 'sportsai-backend', version, commit };
  }

  /**
   * Aggregate live-data status (safe to expose publicly).
   * Helps diagnose "empty app" by showing if the DB has events/odds and when sync last ran.
   */
  @Get('healthz/data')
  async dataStatus() {
    const now = new Date();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [sports, leagues, teams, upcomingEvents, oddsQuotes24h] = await Promise.all([
      this.prisma.sport.count(),
      this.prisma.league.count(),
      this.prisma.team.count(),
      this.prisma.event.count({ where: { status: { in: ['upcoming', 'live'] }, startTimeUtc: { gte: now } } }),
      this.prisma.oddsQuote.count({ where: { timestamp: { gte: since } } }),
    ]);

    return {
      status: 'ok',
      data: {
        sports,
        leagues,
        teams,
        upcomingEvents,
        oddsQuotes24h,
      },
      oddsSync: {
        lastSyncStartedAt: this.syncService.lastSyncStartedAt,
        lastSyncFinishedAt: this.syncService.lastSyncFinishedAt,
        lastSyncError: this.syncService.lastSyncError,
        lastSyncedSports: this.syncService.lastSyncedSports,
      },
    };
  }

  @Get('health/data')
  async dataStatusAlias() {
    return this.dataStatus();
  }
}

