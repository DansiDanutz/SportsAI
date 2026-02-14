import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MappingService } from './mapping.service';
import { PrismaService } from '../prisma/prisma.service';
import { ArbitrageService } from '../arbitrage/arbitrage.service';

@Injectable()
export class SyncService implements OnModuleInit {
  private readonly logger = new Logger(SyncService.name);
  private readonly provider = 'theodds';

  // In-memory status for observability/debugging (safe to expose as aggregates).
  lastSyncStartedAt: Date | null = null;
  lastSyncFinishedAt: Date | null = null;
  lastSyncError: string | null = null;
  lastSyncedSports: string[] = [];
  lastSyncedCounts:
    | {
        sports: number;
        leagues: number;
        teams: number;
        upcomingEvents: number;
        oddsQuotes24h: number;
      }
    | null = null;

  constructor(
    private mappingService: MappingService,
    private prisma: PrismaService,
    private arbitrageService: ArbitrageService,
  ) {}

  async onModuleInit() {
    this.logger.log('Sync Service initialized. Starting initial data fetch...');
    // Initial sync on startup so the UI is not empty after first login.
    // This is live data ingestion (requires THE_ODDS_API_KEY).
    this.syncUpcomingOdds().catch((e) => {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Initial sync skipped/failed: ${msg}`);
    });
  }

  /**
   * Syncs upcoming odds from The Odds API every 30 minutes.
   * This is the primary trigger for arbitrage detection.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async syncUpcomingOdds() {
    this.logger.log('CRON: Syncing upcoming odds from The Odds API...');
    
    // For MVP, focus on major soccer leagues
    const sportsToSync = ['soccer_epl', 'soccer_spain_la_liga', 'soccer_italy_serie_a', 'soccer_germany_bundesliga', 'soccer_france_ligue_one', 'basketball_nba'];
    
    await this.syncOddsForSports(sportsToSync);
  }

  /**
   * Public helper: sync a list of The Odds API sport keys now.
   */
  async syncOddsForSports(sportsToSync: string[]) {
    this.lastSyncStartedAt = new Date();
    this.lastSyncFinishedAt = null;
    this.lastSyncError = null;
    this.lastSyncedSports = [...sportsToSync];

    for (const sportKey of sportsToSync) {
      try {
        const oddsData = await this.mappingService.fetchOddsWithFallbacks(sportKey);
        if (Array.isArray(oddsData) && oddsData.length > 0) {
          await this.processOddsData(oddsData);
        } else {
          this.logger.warn(`No odds returned for ${sportKey} (provider unconfigured or no markets).`);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.lastSyncError = this.lastSyncError ? `${this.lastSyncError}; ${sportKey}: ${msg}` : `${sportKey}: ${msg}`;
        this.logger.error(`Failed to sync odds for ${sportKey}: ${msg}`);
      }
    }

    this.lastSyncFinishedAt = new Date();

    try {
      const now = new Date();
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [sports, leagues, teams, upcomingEvents, oddsQuotes24h] = await Promise.all([
        this.prisma.sport.count(),
        this.prisma.league.count(),
        this.prisma.team.count(),
        this.prisma.event.count({ where: { status: { in: ['upcoming', 'live'] }, startTimeUtc: { gte: now } } }),
        this.prisma.oddsQuote.count({ where: { timestamp: { gte: since } } }),
      ]);
      this.lastSyncedCounts = { sports, leagues, teams, upcomingEvents, oddsQuotes24h };
    } catch (e) {
      // Ignore count failures; sync may still have succeeded.
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
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to sync live scores: ${msg}`);
    }
  }

  private getInternalSportKey(providerSportKey: string): { sportKey: string; sportName: string } {
    // The Odds API uses keys like soccer_epl, basketball_nba, etc.
    const prefix = providerSportKey.split('_')[0];
    switch (prefix) {
      case 'soccer':
        return { sportKey: 'soccer', sportName: 'Soccer' };
      case 'basketball':
        return { sportKey: 'basketball', sportName: 'Basketball' };
      case 'tennis':
        return { sportKey: 'tennis', sportName: 'Tennis' };
      case 'baseball':
        return { sportKey: 'baseball', sportName: 'Baseball' };
      case 'american':
        return { sportKey: 'american_football', sportName: 'American Football' };
      case 'ice':
        return { sportKey: 'ice_hockey', sportName: 'Ice Hockey' };
      default:
        return { sportKey: prefix, sportName: prefix };
    }
  }

  private mapOutcomeKey(outcomeName: string, homeTeam: string, awayTeam: string): 'home' | 'away' | 'draw' | null {
    const n = outcomeName.trim().toLowerCase();
    if (n === homeTeam.trim().toLowerCase()) return 'home';
    if (n === awayTeam.trim().toLowerCase()) return 'away';
    if (n === 'draw' || n === 'tie') return 'draw';
    return null;
  }

  private async processOddsData(oddsData: any[]) {
    for (const entry of oddsData) {
      try {
        const providerSportKey = String(entry.sport_key || '');
        const { sportKey: internalSportKey, sportName } = this.getInternalSportKey(providerSportKey);
        const leagueName = String(entry.sport_title || providerSportKey || 'Unknown League');
        const homeTeamName = String(entry.home_team || '').trim();
        const awayTeamName = String(entry.away_team || '').trim();
        if (!homeTeamName || !awayTeamName) continue;

        // 1) Upsert Sport
        const sport = await this.prisma.sport.upsert({
          where: { key: internalSportKey },
          update: { name: sportName },
          create: { key: internalSportKey, name: sportName },
        });

        // 2) Resolve or create League (no unique constraint, so find-or-create)
        let league = await this.prisma.league.findFirst({
          where: { sportId: sport.id, name: leagueName },
        });
        if (!league) {
          league = await this.prisma.league.create({
            data: { sportId: sport.id, name: leagueName, country: null, tier: 1 },
          });
        }

        // 3) Resolve or create Teams (per league)
        let home = await this.prisma.team.findFirst({
          where: { leagueId: league.id, name: homeTeamName },
        });
        if (!home) {
          home = await this.prisma.team.create({
            data: {
              leagueId: league.id,
              name: homeTeamName,
              externalIds: JSON.stringify({ [this.provider]: homeTeamName }),
            },
          });
        }

        let away = await this.prisma.team.findFirst({
          where: { leagueId: league.id, name: awayTeamName },
        });
        if (!away) {
          away = await this.prisma.team.create({
            data: {
              leagueId: league.id,
              name: awayTeamName,
              externalIds: JSON.stringify({ [this.provider]: awayTeamName }),
            },
          });
        }

        // 4) Resolve or create Event by externalIds
        const externalNeedle = `"${this.provider}":"${entry.id}"`;
        let event = await this.prisma.event.findFirst({
          where: {
            externalIds: { contains: externalNeedle },
          },
        });
        if (!event) {
          event = await this.prisma.event.create({
            data: {
              sportId: sport.id,
              leagueId: league.id,
              homeId: home.id,
              awayId: away.id,
              startTimeUtc: new Date(entry.commence_time),
              status: 'upcoming',
              externalIds: JSON.stringify({ [this.provider]: String(entry.id) }),
            },
          });
        } else {
          event = await this.prisma.event.update({
            where: { id: event.id },
            data: {
              sportId: sport.id,
              leagueId: league.id,
              homeId: home.id,
              awayId: away.id,
              startTimeUtc: new Date(entry.commence_time),
              status: event.status === 'finished' ? event.status : 'upcoming',
            },
          });
        }

        // 5) Ensure canonical Market for this sport
        const marketKey = 'h2h';
        let market = await this.prisma.market.findFirst({
          where: { sportId: sport.id, marketKey },
        });
        if (!market) {
          market = await this.prisma.market.create({
            data: { sportId: sport.id, marketKey, name: 'Moneyline (H2H)', liveSupported: false },
          });
        }

        // 6) Upsert bookmakers + store odds quotes using canonical outcomeKey (home/away/draw)
        for (const bookie of entry.bookmakers || []) {
          const bookmakerKey = String(bookie.key || '').trim();
          const bookmakerBrand = String(bookie.title || bookmakerKey || 'Bookmaker').trim();
          if (!bookmakerKey) continue;

          const bookmaker = await this.prisma.bookmaker.upsert({
            where: { key: bookmakerKey },
            update: { brand: bookmakerBrand },
            create: { key: bookmakerKey, brand: bookmakerBrand },
          });

          const m = (bookie.markets || []).find((mm: any) => mm.key === 'h2h');
          if (!m) continue;

          for (const outcome of m.outcomes || []) {
            const mapped = this.mapOutcomeKey(String(outcome.name || ''), homeTeamName, awayTeamName);
            if (!mapped) continue;

            await this.prisma.oddsQuote.create({
              data: {
                eventId: event.id,
                bookmakerId: bookmaker.id,
                marketId: market.id,
                outcomeKey: mapped,
                odds: Number(outcome.price),
                timestamp: new Date(bookie.last_update || Date.now()),
                isLive: false,
                sourceProvider: this.provider,
                confidence: 1.0,
              },
            });
          }
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Error processing event ${entry.id}: ${msg}`);
      }
    }
  }
}
