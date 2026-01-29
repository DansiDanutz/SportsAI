import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FlashscoreService } from '../flashscore/flashscore.service';

// Types for Apify API responses
export interface ApifyOddsResult {
  team1: string;
  team2: string;
  gameTime: string;
  league: string;
  moneyline?: {
    team1: number;
    team2: number;
    draw?: number;
  };
  spread?: {
    team1: number;
    team1Odds: number;
    team2: number;
    team2Odds: number;
  };
  total?: {
    over: number;
    overOdds: number;
    under: number;
    underOdds: number;
  };
  bookmaker: string;
  timestamp: string;
}

export interface ApifySofaScoreMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status: 'scheduled' | 'live' | 'finished';
  startTime: string;
  tournament: string;
  sport: string;
  statistics?: Record<string, unknown>;
}

export interface ApifyPrediction {
  event: string;
  prediction: string;
  confidence: number;
  source: string;
  odds: number;
  timestamp: string;
}

export interface ApifyRunStatus {
  actorRunId: string;
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'ABORTED';
  startedAt: string;
  finishedAt?: string;
  datasetId?: string;
}

interface ApifyRunResponse {
  data: {
    id: string;
    status: string;
    defaultDatasetId?: string;
    startedAt?: string;
    finishedAt?: string;
  };
}

interface ApifyRunListResponse {
  data: {
    items: Array<{
      id: string;
      status: string;
      startedAt: string;
      finishedAt?: string;
      defaultDatasetId?: string;
    }>;
  };
}

export type ApifyMatchProvider = 'sofascore' | 'flashscore';
export type ApifyMatchProviderRequest = ApifyMatchProvider | 'auto';

@Injectable()
export class ApifyService {
  private readonly logger = new Logger(ApifyService.name);
  private readonly apiToken: string;
  private readonly baseUrl = 'https://api.apify.com/v2';

  // Apify Actor IDs from the store
  private readonly actors = {
    // Odds API - Scrapes odds from BetMGM, Caesars, DraftKings, FanDuel, Bet365
    oddsApi: process.env.APIFY_ACTOR_ODDS_API || 'harvest/sportsbook-odds-scraper',
    // SofaScore Scraper PRO - Match stats, live scores, players, teams
    sofaScore: process.env.APIFY_ACTOR_SOFASCORE || 'azzouzana/sofascore-scraper-pro',
    // Flashscore actor (optional). Provide your own actor ID via env.
    flashscore: process.env.APIFY_ACTOR_FLASHSCORE || '',
    // Daily Bet Prediction Scraper
    predictions: process.env.APIFY_ACTOR_PREDICTIONS || 'rikunk/bet-prediction-scraper',
    // Sportsbook Odds Scraper (alternative)
    sportsbookOdds: process.env.APIFY_ACTOR_SPORTSBOOK_ODDS || 'harvest/sportsbook-odds-scraper',
  };

  constructor(
    private prisma: PrismaService,
    private flashscoreService: FlashscoreService,
  ) {
    this.apiToken = process.env.APIFY_API_TOKEN || '';
    if (!this.apiToken) {
      this.logger.warn('APIFY_API_TOKEN not set. Apify integration is disabled.');
    }
  }

  /**
   * Check if Apify is configured
   */
  isConfigured(): boolean {
    return !!this.apiToken;
  }

  private hasFlashscoreActor(): boolean {
    return typeof this.actors.flashscore === 'string' && this.actors.flashscore.trim().length > 0;
  }

  /**
   * Get Apify configuration status
   */
  getStatus(): {
    configured: boolean;
    apiToken: string;
    availableActors: string[];
    flashscoreActorConfigured: boolean;
  } {
    return {
      configured: this.isConfigured(),
      apiToken: this.apiToken ? `${this.apiToken.slice(0, 8)}...` : 'Not set',
      availableActors: Object.keys(this.actors),
      flashscoreActorConfigured: this.hasFlashscoreActor(),
    };
  }

  /**
   * Run an Apify actor and wait for results
   */
  private async runActor<T>(
    actorId: string,
    input: Record<string, unknown>,
    waitForResults = true,
  ): Promise<T[]> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('Apify is not configured (APIFY_API_TOKEN missing)');
    }

    try {
      // Start the actor run
      const runResponse = await fetch(
        `${this.baseUrl}/acts/${actorId}/runs?token=${this.apiToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        },
      );

      if (!runResponse.ok) {
        throw new Error(`Failed to start actor: ${runResponse.statusText}`);
      }

      const runData = (await runResponse.json()) as ApifyRunResponse;
      const runId = runData.data.id;
      this.logger.log(`Started Apify actor ${actorId}, run ID: ${runId}`);

      if (!waitForResults) {
        return [];
      }

      // Poll for completion (max 5 minutes)
      const maxAttempts = 60;
      let attempts = 0;

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

        const statusResponse = await fetch(
          `${this.baseUrl}/acts/${actorId}/runs/${runId}?token=${this.apiToken}`,
        );

        const statusData = (await statusResponse.json()) as ApifyRunResponse;
        const status = statusData.data.status;

        if (status === 'SUCCEEDED') {
          // Get results from dataset
          const datasetId = statusData.data.defaultDatasetId;
          const resultsResponse = await fetch(
            `${this.baseUrl}/datasets/${datasetId}/items?token=${this.apiToken}`,
          );
          const results = await resultsResponse.json();
          return results as T[];
        }

        if (status === 'FAILED' || status === 'ABORTED') {
          throw new Error(`Actor run ${status}`);
        }

        attempts++;
      }

      throw new Error('Actor run timed out');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error running Apify actor ${actorId}: ${msg}`);
      throw new ServiceUnavailableException(`Apify request failed: ${msg}`);
    }
  }

  /**
   * Fetch live odds from multiple sportsbooks
   */
  async fetchOdds(options: {
    league: 'NFL' | 'NBA' | 'NHL' | 'UCL' | 'UFC' | 'College-Football' | 'College-Basketball';
    bookmakers?: string[];
    date?: string;
  }): Promise<ApifyOddsResult[]> {
    this.logger.log(`Fetching odds for ${options.league}`);

    const input = {
      league: options.league,
      bookmakers: options.bookmakers || ['BetMGM', 'DraftKings', 'FanDuel', 'Bet365', 'Caesars'],
      date: options.date || new Date().toISOString().split('T')[0],
    };

    return this.runActor<ApifyOddsResult>(this.actors.oddsApi, input);
  }

  /**
   * Fetch match data from SofaScore
   */
  async fetchMatches(options: {
    urls: string[];
    sport?: string;
    provider?: ApifyMatchProviderRequest;
  }): Promise<{ provider: ApifyMatchProvider; data: unknown[] }> {
    const provider = options.provider || 'auto';
    this.logger.log(
      `Fetching match data for ${options.urls.length} URLs (provider=${provider})`,
    );

    const input = {
      startUrls: options.urls.map((url) => ({ url })),
    };

    if (provider === 'flashscore') {
      if (!this.hasFlashscoreActor()) {
        throw new ServiceUnavailableException(
          'Flashscore actor is not configured (APIFY_ACTOR_FLASHSCORE missing)',
        );
      }
      const data = await this.runActor<unknown>(this.actors.flashscore, input);
      return { provider: 'flashscore', data };
    }

    try {
      const data = await this.runActor<ApifySofaScoreMatch>(this.actors.sofaScore, input);
      return { provider: 'sofascore', data };
    } catch (error) {
      if (provider === 'auto' && this.hasFlashscoreActor()) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`SofaScore actor failed (${msg}); falling back to Flashscore actor`);
        const data = await this.runActor<unknown>(this.actors.flashscore, input);
        return { provider: 'flashscore', data };
      }

      // Final fallback: local Flashscore scraper (Playwright), if enabled.
      if (provider === 'auto') {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`SofaScore actor failed (${msg}); falling back to local Flashscore scraper`);
        const { matches } = await this.flashscoreService.fetchMatches(options.urls);
        return { provider: 'flashscore', data: matches };
      }
      throw error;
    }
  }

  /**
   * Fetch bet predictions from aggregated sources
   */
  async fetchPredictions(): Promise<ApifyPrediction[]> {
    this.logger.log('Fetching bet predictions');

    const input = {
      maxItems: 100,
    };

    return this.runActor<ApifyPrediction>(this.actors.predictions, input);
  }

  /**
   * Sync odds data to database
   */
  async syncOddsToDatabase(odds: ApifyOddsResult[]): Promise<{
    created: number;
    updated: number;
    errors: number;
  }> {
    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const odd of odds) {
      try {
        // Find or create the event (use case-insensitive search with LOWER in SQLite)
        const team1Lower = odd.team1.toLowerCase();
        const team2Lower = odd.team2.toLowerCase();

        const event = await this.prisma.event.findFirst({
          where: {
            home: { name: { contains: team1Lower } },
            away: { name: { contains: team2Lower } },
            startTimeUtc: {
              gte: new Date(odd.gameTime),
              lte: new Date(new Date(odd.gameTime).getTime() + 24 * 60 * 60 * 1000),
            },
          },
        });

        if (!event) {
          this.logger.warn(`Event not found for ${odd.team1} vs ${odd.team2}`);
          continue;
        }

        // Find bookmaker
        const bookmakerLower = odd.bookmaker.toLowerCase();
        const bookmaker = await this.prisma.bookmaker.findFirst({
          where: { brand: { contains: bookmakerLower } },
        });

        if (!bookmaker) {
          this.logger.warn(`Bookmaker not found: ${odd.bookmaker}`);
          continue;
        }

        // Find or create market (moneyline)
        if (odd.moneyline) {
          const market = await this.prisma.market.findFirst({
            where: { marketKey: 'moneyline' },
          });

          if (market) {
            // Check if odds exist for home and update/create
            const existingHomeOdds = await this.prisma.oddsQuote.findFirst({
              where: {
                eventId: event.id,
                bookmakerId: bookmaker.id,
                marketId: market.id,
                outcomeKey: 'home',
              },
            });

            if (existingHomeOdds) {
              await this.prisma.oddsQuote.update({
                where: { id: existingHomeOdds.id },
                data: {
                  odds: odd.moneyline.team1,
                  timestamp: new Date(odd.timestamp),
                },
              });
              updated++;
            } else {
              await this.prisma.oddsQuote.create({
                data: {
                  eventId: event.id,
                  bookmakerId: bookmaker.id,
                  marketId: market.id,
                  outcomeKey: 'home',
                  odds: odd.moneyline.team1,
                  timestamp: new Date(odd.timestamp),
                  isLive: false,
                  sourceProvider: 'apify',
                  confidence: 0.95,
                },
              });
              created++;
            }

            // Check if odds exist for away and update/create
            const existingAwayOdds = await this.prisma.oddsQuote.findFirst({
              where: {
                eventId: event.id,
                bookmakerId: bookmaker.id,
                marketId: market.id,
                outcomeKey: 'away',
              },
            });

            if (existingAwayOdds) {
              await this.prisma.oddsQuote.update({
                where: { id: existingAwayOdds.id },
                data: {
                  odds: odd.moneyline.team2,
                  timestamp: new Date(odd.timestamp),
                },
              });
              updated++;
            } else {
              await this.prisma.oddsQuote.create({
                data: {
                  eventId: event.id,
                  bookmakerId: bookmaker.id,
                  marketId: market.id,
                  outcomeKey: 'away',
                  odds: odd.moneyline.team2,
                  timestamp: new Date(odd.timestamp),
                  isLive: false,
                  sourceProvider: 'apify',
                  confidence: 0.95,
                },
              });
              created++;
            }
          }
        }
      } catch (error) {
        this.logger.error(`Error syncing odds for ${odd.team1} vs ${odd.team2}:`, error);
        errors++;
      }
    }

    return { created, updated, errors };
  }

  /**
   * Get run history
   */
  async getRunHistory(): Promise<ApifyRunStatus[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/acts/${this.actors.oddsApi}/runs?token=${this.apiToken}&limit=10`,
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch run history: ${response.statusText}`);
      }

      const data = (await response.json()) as ApifyRunListResponse;
      return data.data.items.map((item) => ({
        actorRunId: item.id,
        status: item.status as ApifyRunStatus['status'],
        startedAt: item.startedAt,
        finishedAt: item.finishedAt,
        datasetId: item.defaultDatasetId,
      }));
    } catch (error) {
      this.logger.error('Error fetching run history:', error);
      return [];
    }
  }

}
