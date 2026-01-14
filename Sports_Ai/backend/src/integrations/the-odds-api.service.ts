import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
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
    try {
      const response = await this.client.get(`/${sportKey}/odds`, {
        params: {
          regions,
          markets,
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
    try {
      const response = await this.client.get(`/${sportKey}/scores`, {
        params: {
          daysFrom,
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
