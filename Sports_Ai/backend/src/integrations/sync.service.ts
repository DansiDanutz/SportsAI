import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MappingService } from './mapping.service';
import { PrismaService } from '../prisma/prisma.service';
import { ArbitrageService } from '../arbitrage/arbitrage.service';

@Injectable()
export class SyncService implements OnModuleInit {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private mappingService: MappingService,
    private prisma: PrismaService,
    @Inject(forwardRef(() => ArbitrageService))
    private arbitrageService: ArbitrageService,
  ) {}

  async onModuleInit() {
    this.logger.log('Sync Service initialized. Starting initial data fetch...');
    // Initial sync on startup (disable by setting RUN_INITIAL_SYNC=false)
    const runInitial = (process.env.RUN_INITIAL_SYNC || 'true').toLowerCase() === 'true';
    if (runInitial) {
      // Small delay to allow Nest to finish booting before hitting external APIs
      setTimeout(() => {
        this.syncUpcomingOdds();
        this.syncLiveScores();
      }, 5000);
    }
  }

  /**
   * Syncs upcoming odds from The Odds API every 30 minutes.
   * This is the primary trigger for arbitrage detection.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async syncUpcomingOdds() {
    this.logger.log('CRON: Syncing upcoming odds from The Odds API...');
    
    // For MVP, focus on major soccer leagues
    const sportsToSync = ['soccer_epl', 'soccer_spain_la_liga', 'soccer_italy_serie_a', 'basketball_nba'];
    
    for (const sportKey of sportsToSync) {
      try {
        const oddsData = await this.mappingService.fetchOddsWithFallbacks(sportKey);
        if (oddsData) {
          await this.processOddsData(oddsData);
        }
      } catch (error: any) {
        this.logger.error(`Failed to sync odds for ${sportKey}: ${error?.message || String(error)}`);
      }
    }
  }

  /**
   * Syncs live scores and fixtures every 10 minutes.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async syncLiveScores() {
    this.logger.log('CRON: Syncing live scores from API-Sports...');
    try {
      const liveFixtures = await this.mappingService.fetchFixturesWithFallbacks('football', { live: 'all' });
      if (liveFixtures) {
        // Process live fixtures and update Event status in DB
        this.logger.log(`Received ${liveFixtures.length} live fixtures`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to sync live scores: ${error?.message || String(error)}`);
    }
  }

  private async processOddsData(oddsData: any[]) {
    for (const entry of oddsData) {
      try {
        // 1) Resolve Sport + League from TheOdds API sport_key (e.g. soccer_epl, basketball_nba)
        const sportKey: string = entry.sport_key;
        const baseSportKey =
          sportKey.startsWith('soccer_') ? 'soccer' :
          sportKey.startsWith('basketball_') ? 'basketball' :
          sportKey.startsWith('baseball_') ? 'baseball' :
          sportKey;

        const sport = await this.prisma.sport.upsert({
          where: { key: baseSportKey },
          update: {},
          create: {
            key: baseSportKey,
            name: baseSportKey.replace(/(^|_)([a-z])/g, (_, __, c) => c.toUpperCase()),
            icon: baseSportKey,
          } as any,
        });

        const league = await this.prisma.league.upsert({
          where: { id: sportKey },
          update: { sportId: sport.id },
          create: {
            id: sportKey,
            sportId: sport.id,
            name: sportKey,
            country: 'Unknown',
            tier: 1,
          } as any,
        });

        // 2) Ensure Teams exist (create stable IDs using league prefix + slug)
        const slug = (s: string) =>
          String(s || 'team')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
            .slice(0, 64);

        const homeName = entry.home_team;
        const awayName = entry.away_team;
        const homeId = `${sportKey}-${slug(homeName)}`;
        const awayId = `${sportKey}-${slug(awayName)}`;

        await this.prisma.team.upsert({
          where: { id: homeId },
          update: { name: homeName, leagueId: league.id },
          create: {
            id: homeId,
            leagueId: league.id,
            name: homeName,
            shortName: homeName.slice(0, 3).toUpperCase(),
            country: 'Unknown',
          } as any,
        });

        await this.prisma.team.upsert({
          where: { id: awayId },
          update: { name: awayName, leagueId: league.id },
          create: {
            id: awayId,
            leagueId: league.id,
            name: awayName,
            shortName: awayName.slice(0, 3).toUpperCase(),
            country: 'Unknown',
          } as any,
        });

        // 3) Resolve or Create Event
        const event = await this.prisma.event.upsert({
          where: { id: `event_${entry.id}` },
          update: {
            startTimeUtc: new Date(entry.commence_time),
            status: 'upcoming',
          },
          create: {
            id: `event_${entry.id}`,
            sportId: sport.id,
            leagueId: league.id,
            homeId,
            awayId,
            startTimeUtc: new Date(entry.commence_time),
            status: 'upcoming',
          },
        });

        // 4) Save Odds Quotes and Detect Arbs
        const oddsByOutcome: Record<string, number[]> = {};

        for (const bookie of entry.bookmakers) {
          const market = bookie.markets.find((m: any) => m.key === 'h2h');
          if (!market) continue;

          for (const outcome of market.outcomes) {
            await this.prisma.oddsQuote.create({
              data: {
                eventId: event.id,
                bookmakerId: bookie.key,
                marketId: 'h2h',
                outcomeKey: outcome.name,
                odds: outcome.price,
                timestamp: new Date(),
              },
            });

            if (!oddsByOutcome[outcome.name]) oddsByOutcome[outcome.name] = [];
            oddsByOutcome[outcome.name].push(outcome.price);
          }
        }

        // 5. Trigger Arbitrage Detection
        // This would call arbitrageService.detect() with the fresh data
      } catch (error: any) {
        this.logger.error(`Error processing event ${entry.id}: ${error?.message || String(error)}`);
      }
    }
  }
}
