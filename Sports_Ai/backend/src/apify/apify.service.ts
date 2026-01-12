import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

@Injectable()
export class ApifyService {
  private readonly logger = new Logger(ApifyService.name);
  private readonly apiToken: string;
  private readonly baseUrl = 'https://api.apify.com/v2';

  // Apify Actor IDs from the store
  private readonly actors = {
    // Odds API - Scrapes odds from BetMGM, Caesars, DraftKings, FanDuel, Bet365
    oddsApi: 'api/odds-api',
    // SofaScore Scraper PRO - Match stats, live scores, players, teams
    sofaScore: 'azzouzana/sofascore-scraper-pro',
    // Daily Bet Prediction Scraper
    predictions: 'rikunk/bet-prediction-scraper',
    // Sportsbook Odds Scraper (alternative)
    sportsbookOdds: 'harvest/sportsbook-odds-scraper',
  };

  constructor(private prisma: PrismaService) {
    this.apiToken = process.env.APIFY_API_TOKEN || '';
    if (!this.apiToken) {
      this.logger.warn('APIFY_API_TOKEN not set. Apify integration will use mock data.');
    }
  }

  /**
   * Check if Apify is configured
   */
  isConfigured(): boolean {
    return !!this.apiToken;
  }

  /**
   * Get Apify configuration status
   */
  getStatus(): {
    configured: boolean;
    apiToken: string;
    availableActors: string[];
  } {
    return {
      configured: this.isConfigured(),
      apiToken: this.apiToken ? `${this.apiToken.slice(0, 8)}...` : 'Not set',
      availableActors: Object.keys(this.actors),
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
      this.logger.warn(`Apify not configured. Returning mock data for ${actorId}`);
      return this.getMockData(actorId) as T[];
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
      this.logger.error(`Error running Apify actor ${actorId}:`, error);
      // Return mock data as fallback
      return this.getMockData(actorId) as T[];
    }
  }

  /**
   * Get mock data for development/demo purposes
   */
  private getMockData(actorId: string): unknown[] {
    if (actorId.includes('odds')) {
      return this.getMockOddsData();
    }
    if (actorId.includes('sofascore')) {
      return this.getMockMatchData();
    }
    if (actorId.includes('prediction')) {
      return this.getMockPredictions();
    }
    return [];
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
  }): Promise<ApifySofaScoreMatch[]> {
    this.logger.log(`Fetching match data for ${options.urls.length} URLs`);

    const input = {
      startUrls: options.urls.map((url) => ({ url })),
    };

    return this.runActor<ApifySofaScoreMatch>(this.actors.sofaScore, input);
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

  // Mock data generators for development
  private getMockOddsData(): ApifyOddsResult[] {
    const now = new Date();
    return [
      {
        team1: 'Los Angeles Lakers',
        team2: 'Golden State Warriors',
        gameTime: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        league: 'NBA',
        moneyline: { team1: 2.15, team2: 1.75 },
        spread: { team1: 3.5, team1Odds: 1.91, team2: -3.5, team2Odds: 1.91 },
        total: { over: 225.5, overOdds: 1.91, under: 225.5, underOdds: 1.91 },
        bookmaker: 'DraftKings',
        timestamp: now.toISOString(),
      },
      {
        team1: 'Los Angeles Lakers',
        team2: 'Golden State Warriors',
        gameTime: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        league: 'NBA',
        moneyline: { team1: 2.20, team2: 1.72 },
        spread: { team1: 3.5, team1Odds: 1.95, team2: -3.5, team2Odds: 1.87 },
        total: { over: 226, overOdds: 1.90, under: 226, underOdds: 1.92 },
        bookmaker: 'FanDuel',
        timestamp: now.toISOString(),
      },
      {
        team1: 'Real Madrid',
        team2: 'Barcelona',
        gameTime: new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString(),
        league: 'UCL',
        moneyline: { team1: 2.40, team2: 2.80, draw: 3.50 },
        bookmaker: 'Bet365',
        timestamp: now.toISOString(),
      },
      {
        team1: 'Real Madrid',
        team2: 'Barcelona',
        gameTime: new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString(),
        league: 'UCL',
        moneyline: { team1: 2.35, team2: 2.90, draw: 3.45 },
        bookmaker: 'BetMGM',
        timestamp: now.toISOString(),
      },
      {
        team1: 'Kansas City Chiefs',
        team2: 'Buffalo Bills',
        gameTime: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        league: 'NFL',
        moneyline: { team1: 1.65, team2: 2.30 },
        spread: { team1: -4.5, team1Odds: 1.91, team2: 4.5, team2Odds: 1.91 },
        total: { over: 52.5, overOdds: 1.87, under: 52.5, underOdds: 1.95 },
        bookmaker: 'Caesars',
        timestamp: now.toISOString(),
      },
    ];
  }

  private getMockMatchData(): ApifySofaScoreMatch[] {
    const now = new Date();
    return [
      {
        id: 'sf-1',
        homeTeam: 'Manchester United',
        awayTeam: 'Liverpool',
        homeScore: 2,
        awayScore: 1,
        status: 'live',
        startTime: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
        tournament: 'Premier League',
        sport: 'Football',
        statistics: {
          possession: { home: 48, away: 52 },
          shots: { home: 12, away: 15 },
          shotsOnTarget: { home: 5, away: 7 },
          corners: { home: 4, away: 6 },
        },
      },
      {
        id: 'sf-2',
        homeTeam: 'Bayern Munich',
        awayTeam: 'Borussia Dortmund',
        status: 'scheduled',
        startTime: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(),
        tournament: 'Bundesliga',
        sport: 'Football',
      },
    ];
  }

  private getMockPredictions(): ApifyPrediction[] {
    return [
      {
        event: 'Lakers vs Warriors',
        prediction: 'Lakers +3.5',
        confidence: 0.72,
        source: 'BetPredictions.com',
        odds: 1.91,
        timestamp: new Date().toISOString(),
      },
      {
        event: 'Real Madrid vs Barcelona',
        prediction: 'Over 2.5 Goals',
        confidence: 0.68,
        source: 'FootballTips.io',
        odds: 1.85,
        timestamp: new Date().toISOString(),
      },
      {
        event: 'Chiefs vs Bills',
        prediction: 'Chiefs -4.5',
        confidence: 0.65,
        source: 'NFLAnalysis.com',
        odds: 1.91,
        timestamp: new Date().toISOString(),
      },
    ];
  }
}
