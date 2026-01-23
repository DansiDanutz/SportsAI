import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TheOddsApiService } from './the-odds-api.service';
import { ApiSportsService } from './api-sports.service';
import { TheSportsDbService } from './the-sports-db.service';
import { SportmonksService } from './sportmonks.service';
import { ApifyService } from '../apify/apify.service';

@Injectable()
export class MappingService {
  private readonly logger = new Logger(MappingService.name);

  constructor(
    private prisma: PrismaService,
    private theOddsApi: TheOddsApiService,
    private apiSports: ApiSportsService,
    private theSportsDb: TheSportsDbService,
    private sportmonks: SportmonksService,
    private apify: ApifyService,
  ) {}

  /**
   * Orchestrates odds fetching from primary and fallback providers.
   */
  async fetchOddsWithFallbacks(sportKey: string) {
    try {
      this.logger.log(`Fetching odds for ${sportKey} from primary provider (The Odds API)`);
      const odds = await this.theOddsApi.getOdds(sportKey);
      if (odds && odds.length > 0) return odds;
      throw new Error('No odds returned from primary provider');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Primary odds provider failed/empty. Error: ${msg}`);

      if (this.apify.isConfigured()) {
        this.logger.log(`Attempting fallback odds fetch via Apify for ${sportKey}...`);
        try {
          // Map internal sport key to Apify league format
          let league: any = 'NFL';
          if (sportKey.includes('soccer')) league = 'UCL'; // Default to UCL for soccer for now
          if (sportKey.includes('nba')) league = 'NBA';
          
          const apifyOdds = await this.apify.fetchOdds({ league });
          
          // If we got results, we need to sync them to DB and return them in a format 
          // compatible with SyncService.processOddsData
          // However, ApifyService.syncOddsToDatabase already does the syncing.
          // For now, let's just log and return a placeholder if we synced successfully.
          if (apifyOdds && apifyOdds.length > 0) {
            this.logger.log(`Successfully fetched ${apifyOdds.length} odds from Apify. Syncing to DB...`);
            await this.apify.syncOddsToDatabase(apifyOdds);
            // Return empty array because sync is done internally, but we don't want to trigger 
            // the "No odds returned" warning in SyncService
            return [{ id: 'apify-sync-marker', bookmakers: [] }]; 
          }
        } catch (apifyError) {
          this.logger.error(`Apify fallback failed: ${apifyError instanceof Error ? apifyError.message : String(apifyError)}`);
        }
      }

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
    } catch (error) {
      this.logger.warn(`Primary fixture provider failed, trying Sportmonks fallback for football...`);
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
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to enrich team details for ${teamName}: ${msg}`);
      return null;
    }
  }

  /**
   * Resolves a provider-specific event ID to a canonical event ID.
   */
  async resolveEvent(provider: string, providerEventId: string): Promise<string | null> {
    // Search in Event model externalIds (stored as a stringified map)
    const event = await this.prisma.event.findFirst({
      where: {
        externalIds: {
          contains: `"${provider}":"${providerEventId}"`,
        },
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
