import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TheOddsApiService } from '../integrations/the-odds-api.service';
import { FreeApisService } from '../integrations/free-apis.service';

interface OddsData {
  sport: string;
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  bookmakers?: {
    name: string;
    markets: {
      key: string;
      outcomes: {
        name: string;
        price: number;
      }[];
    }[];
  }[];
}

@Injectable()
export class OddsService {
  private readonly logger = new Logger(OddsService.name);
  private readonly hasOddsApiKey: boolean;

  constructor(
    private prisma: PrismaService,
    private theOddsApiService: TheOddsApiService,
    private freeApisService: FreeApisService,
    private configService: ConfigService
  ) {
    this.hasOddsApiKey = !!this.configService.get<string>('THE_ODDS_API_KEY');
  }

  /**
   * Get real-time odds data from The Odds API or fallback to event data
   */
  async getLiveOdds(sportKey?: string): Promise<OddsData[]> {
    if (this.hasOddsApiKey) {
      try {
        this.logger.log(`Fetching live odds from The Odds API for sport: ${sportKey || 'all'}`);
        
        if (sportKey) {
          const odds = await this.theOddsApiService.getOdds(sportKey);
          return odds.map(this.transformOddsData);
        } else {
          // Get odds for major sports
          const majorSports = [
            'soccer_epl', 'soccer_spain_la_liga', 'soccer_germany_bundesliga',
            'soccer_italy_serie_a', 'soccer_france_ligue_one', 'soccer_uefa_champs_league',
            'basketball_nba', 'americanfootball_nfl', 'baseball_mlb'
          ];
          
          const oddsPromises = majorSports.map(async (sport) => {
            try {
              return await this.theOddsApiService.getOdds(sport);
            } catch (error) {
              this.logger.warn(`Failed to fetch odds for ${sport}: ${error.message}`);
              return [];
            }
          });
          
          const allOdds = await Promise.all(oddsPromises);
          return allOdds.flat().map(this.transformOddsData);
        }
      } catch (error) {
        this.logger.error(`The Odds API failed, falling back to event data: ${error.message}`);
        return this.getFallbackEventData();
      }
    } else {
      this.logger.warn('THE_ODDS_API_KEY not configured. Returning event data without odds.');
      return this.getFallbackEventData();
    }
  }

  /**
   * Get best odds for a specific event
   */
  async getBestOdds(eventId: string) {
    if (this.hasOddsApiKey) {
      // Try to get fresh odds first
      try {
        const liveOdds = await this.getLiveOdds();
        const eventOdds = liveOdds.find(odds => odds.eventId === eventId);
        if (eventOdds) {
          return this.extractBestOdds(eventOdds);
        }
      } catch (error) {
        this.logger.warn(`Failed to get live odds for event ${eventId}: ${error.message}`);
      }
    }

    // Fallback to database stored odds
    return this.prisma.oddsQuote.findMany({
      where: { eventId },
      include: {
        bookmaker: true,
        market: true,
      },
      orderBy: {
        odds: 'desc',
      },
    });
  }

  /**
   * Get odds history for an event
   */
  async getOddsHistory(eventId: string, marketId?: string) {
    return this.prisma.oddsQuote.findMany({
      where: {
        eventId,
        ...(marketId && { marketId }),
      },
      include: {
        bookmaker: true,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
  }

  /**
   * Health check for odds services
   */
  async healthCheck() {
    const result = {
      status: 'healthy',
      services: {
        oddsApi: { status: 'disabled', configured: this.hasOddsApiKey },
        fallback: { status: 'available' }
      }
    };

    if (this.hasOddsApiKey) {
      try {
        await this.theOddsApiService.getSports();
        result.services.oddsApi.status = 'healthy';
      } catch (error) {
        result.services.oddsApi = {
          status: 'unhealthy',
          configured: true,
          error: error.message
        };
        result.status = 'degraded';
      }
    }

    return result;
  }

  /**
   * Transform The Odds API response to our format
   */
  private transformOddsData(oddsItem: any): OddsData {
    return {
      sport: oddsItem.sport_key,
      eventId: oddsItem.id,
      homeTeam: oddsItem.home_team,
      awayTeam: oddsItem.away_team,
      startTime: oddsItem.commence_time,
      bookmakers: oddsItem.bookmakers?.map((bookmaker: any) => ({
        name: bookmaker.key,
        markets: bookmaker.markets?.map((market: any) => ({
          key: market.key,
          outcomes: market.outcomes?.map((outcome: any) => ({
            name: outcome.name,
            price: outcome.price,
          })) || [],
        })) || [],
      })) || [],
    };
  }

  /**
   * Extract best odds from event odds data
   */
  private extractBestOdds(eventOdds: OddsData) {
    const bestOdds = [];
    
    if (eventOdds.bookmakers && eventOdds.bookmakers.length > 0) {
      const allOutcomes = new Map<string, { bookmaker: string; price: number }>();
      
      for (const bookmaker of eventOdds.bookmakers) {
        for (const market of bookmaker.markets) {
          for (const outcome of market.outcomes) {
            const key = `${market.key}:${outcome.name}`;
            const current = allOutcomes.get(key);
            
            if (!current || outcome.price > current.price) {
              allOutcomes.set(key, {
                bookmaker: bookmaker.name,
                price: outcome.price,
              });
            }
          }
        }
      }
      
      for (const [key, data] of allOutcomes) {
        const [market, outcome] = key.split(':');
        bestOdds.push({
          market,
          outcome,
          bookmaker: data.bookmaker,
          odds: data.price,
          eventId: eventOdds.eventId,
          timestamp: new Date(),
        });
      }
    }
    
    return bestOdds;
  }

  /**
   * Fallback to event data when no odds API available
   */
  private async getFallbackEventData(): Promise<OddsData[]> {
    try {
      const events = await this.freeApisService.getLiveEvents();
      
      return events.slice(0, 20).map(event => ({
        sport: event.sport.toLowerCase().replace(' ', '_'),
        eventId: event.id,
        homeTeam: event.homeTeam,
        awayTeam: event.awayTeam,
        startTime: `${event.date}T${event.time || '00:00'}:00Z`,
        // No bookmakers data available in fallback
        bookmakers: [],
      }));
    } catch (error) {
      this.logger.error(`Failed to get fallback event data: ${error.message}`);
      return [];
    }
  }
}
