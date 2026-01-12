import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
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
    private arbitrageService: ArbitrageService,
  ) {}

  async onModuleInit() {
    this.logger.log('Sync Service initialized. Starting initial data fetch...');
    // Initial sync on startup (can be disabled in production to avoid overlap)
    // this.syncUpcomingOdds();
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
      } catch (error) {
        this.logger.error(`Failed to sync odds for ${sportKey}: ${error.message}`);
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
    } catch (error) {
      this.logger.error(`Failed to sync live scores: ${error.message}`);
    }
  }

  private async processOddsData(oddsData: any[]) {
    for (const entry of oddsData) {
      try {
        // 1. Resolve Sport
        const sport = await this.prisma.sport.findUnique({ where: { key: entry.sport_key } });
        if (!sport) continue;

        // 2. Resolve or Create Event
        const event = await this.prisma.event.upsert({
          where: { id: `event_${entry.id}` },
          update: {
            startTimeUtc: new Date(entry.commence_time),
            status: 'upcoming',
          },
          create: {
            id: `event_${entry.id}`,
            sportId: sport.id,
            leagueId: entry.sport_key, // Simplified league mapping
            homeId: entry.home_team, // In real app, resolve to Team ID
            awayId: entry.away_team,
            startTimeUtc: new Date(entry.commence_time),
            status: 'upcoming',
          },
        });

        // 3. Save Odds Quotes and Detect Arbs
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

        // 4. Trigger Arbitrage Detection
        // This would call arbitrageService.detect() with the fresh data
      } catch (error) {
        this.logger.error(`Error processing event ${entry.id}: ${error.message}`);
      }
    }
  }
}
