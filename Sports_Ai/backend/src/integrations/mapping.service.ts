import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TheOddsApiService } from './the-odds-api.service';
import { ApiSportsService } from './api-sports.service';
import { TheSportsDbService } from './the-sports-db.service';
import { SportmonksService } from './sportmonks.service';

@Injectable()
export class MappingService {
  private readonly logger = new Logger(MappingService.name);

  constructor(
    private prisma: PrismaService,
    private theOddsApi: TheOddsApiService,
    private apiSports: ApiSportsService,
    private theSportsDb: TheSportsDbService,
    private sportmonks: SportmonksService,
  ) {}

  /**
   * Orchestrates odds fetching from primary and fallback providers.
   */
  async fetchOddsWithFallbacks(sportKey: string) {
    try {
      this.logger.log(`Fetching odds for ${sportKey} from primary provider (The Odds API)`);
      return await this.theOddsApi.getOdds(sportKey);
    } catch (error: any) {
      this.logger.warn(`Primary odds provider failed, no free fallbacks implemented for raw odds yet. Error: ${error?.message || String(error)}`);
      // In a real scenario, we might have another odds provider here
      return null;
    }
  }

  /**
   * Orchestrates fixtures fetching with fallbacks.
   */
  async fetchFixturesWithFallbacks(sport: string, params: any) {
    try {
      this.logger.log(`Fetching fixtures for ${sport} from primary provider (API-Sports)`);
      return await this.apiSports.getFixtures(sport as any, params);
    } catch (error: any) {
      this.logger.warn(`Primary fixture provider failed, trying Sportmonks fallback for football... Error: ${error?.message || String(error)}`);
      if (sport === 'football' || sport === 'soccer') {
        return await this.sportmonks.getFootballFixtures(params);
      }
      return null;
    }
  }

  /**
   * Resolves team details using metadata providers.
   */
  async enrichTeamDetails(teamName: string) {
    try {
      return await this.theSportsDb.searchTeams(teamName);
    } catch (error: any) {
      this.logger.error(`Failed to enrich team details for ${teamName}: ${error?.message || String(error)}`);
      return null;
    }
  }

  /**
   * Resolves a provider-specific event ID to a canonical event ID.
   */
  async resolveEvent(provider: string, providerEventId: string): Promise<string | null> {
    // Search in Event model externalIds JSON
    const event = await this.prisma.event.findFirst({
      where: {
        externalIds: {
          path: [provider],
          equals: providerEventId,
        } as any,
      },
    });
    return event?.id || null;
  }

  /**
   * Resolves a provider-specific team ID to a canonical team ID.
   */
  async resolveTeam(provider: string, providerTeamId: string): Promise<string | null> {
    const team = await this.prisma.team.findFirst({
      where: {
        externalIds: {
          contains: `"${provider}":"${providerTeamId}"`,
        },
      },
    });
    return team?.id || null;
  }

  /**
   * Normalizes a market key from a provider to our canonical format.
   */
  normalizeMarket(provider: string, providerMarketKey: string): string {
    // Mapping logic for different bookmaker naming conventions
    const mapping: Record<string, Record<string, string>> = {
      bet365: {
        'MATCH_ODDS': '1X2',
        'TOTAL_GOALS': 'OVER_UNDER_25',
      },
      stake: {
        'winner': '1X2',
        'totals': 'OVER_UNDER_25',
      },
    };

    return mapping[provider.toLowerCase()]?.[providerMarketKey] || providerMarketKey;
  }
}
