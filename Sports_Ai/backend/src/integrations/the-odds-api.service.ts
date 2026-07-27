import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TheOddsApiService implements OnModuleInit {
  private readonly logger = new Logger(TheOddsApiService.name);
  private client!: AxiosInstance;
  private apiKey: string;
  private readonly baseUrl = 'https://api.the-odds-api.com/v4/sports';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('THE_ODDS_API_KEY') || '';
  }

  onModuleInit() {
    if (!this.apiKey) {
      this.logger.warn('THE_ODDS_API_KEY not set. The Odds API integration is disabled.');
    }
    this.client = axios.create({
      baseURL: this.baseUrl,
      params: {
        apiKey: this.apiKey,
      },
    });
  }

  private assertConfigured() {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('THE_ODDS_API_KEY not configured');
    }
  }

  private resolveSportPath(sportKey: string): string {
    switch (sportKey) {
      case 'soccer_epl':
        return 'soccer_epl';
      case 'soccer_spain_la_liga':
        return 'soccer_spain_la_liga';
      case 'soccer_germany_bundesliga':
        return 'soccer_germany_bundesliga';
      case 'soccer_italy_serie_a':
        return 'soccer_italy_serie_a';
      case 'soccer_france_ligue_one':
        return 'soccer_france_ligue_one';
      case 'soccer_uefa_champs_league':
        return 'soccer_uefa_champs_league';
      case 'soccer_usa_mls':
        return 'soccer_usa_mls';
      case 'basketball_nba':
        return 'basketball_nba';
      case 'americanfootball_nfl':
        return 'americanfootball_nfl';
      case 'baseball_mlb':
        return 'baseball_mlb';
      default:
        throw new BadRequestException('Unsupported sport key');
    }
  }

  private validateCsvOption(value: string, field: 'regions' | 'markets'): string {
    if (
      typeof value !== 'string' ||
      value.length === 0 ||
      value.length > 100 ||
      !/^[a-z0-9_]+(?:,[a-z0-9_]+)*$/.test(value)
    ) {
      throw new BadRequestException(`Invalid ${field}`);
    }

    return value;
  }

  /**
   * Fetches upcoming sports.
   */
  async getSports() {
    this.assertConfigured();
    try {
      const response = await this.client.get('');
      return response.data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to fetch sports: ${msg}`);
      throw error;
    }
  }

  /**
   * Fetches odds for a specific sport.
   * @param sportKey e.g., 'soccer_usa_mls'
   * @param regions e.g., 'us,eu,uk,au'
   * @param markets e.g., 'h2h,spreads,totals'
   */
  async getOdds(sportKey: string, regions: string = 'eu', markets: string = 'h2h') {
    this.assertConfigured();
    const sportPath = this.resolveSportPath(sportKey);
    const safeRegions = this.validateCsvOption(regions, 'regions');
    const safeMarkets = this.validateCsvOption(markets, 'markets');
    try {
      const response = await this.client.get(`/${sportPath}/odds`, {
        params: {
          regions: safeRegions,
          markets: safeMarkets,
          oddsFormat: 'decimal',
        },
      });
      return response.data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to fetch odds for ${sportKey}: ${msg}`);
      throw error;
    }
  }

  /**
   * Fetches scores for a specific sport.
   */
  async getScores(sportKey: string, daysFrom: number = 3) {
    this.assertConfigured();
    const sportPath = this.resolveSportPath(sportKey);
    const safeDaysFrom = Number.isInteger(daysFrom) && daysFrom >= 1 && daysFrom <= 3 ? daysFrom : 3;
    try {
      const response = await this.client.get(`/${sportPath}/scores`, {
        params: {
          daysFrom: safeDaysFrom,
        },
      });
      return response.data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to fetch scores for ${sportKey}: ${msg}`);
      throw error;
    }
  }
}
