import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TheOddsApiService implements OnModuleInit {
  private readonly logger = new Logger(TheOddsApiService.name);
  private client: AxiosInstance;
  private apiKey: string;
  private readonly baseUrl = 'https://api.the-odds-api.com/v4/sports';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('THE_ODDS_API_KEY') || 'YOUR_API_KEY';
  }

  onModuleInit() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      params: {
        apiKey: this.apiKey,
      },
    });
  }

  /**
   * Fetches upcoming sports.
   */
  async getSports() {
    try {
      const response = await this.client.get('');
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch sports: ${error.message}`);
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
      this.logger.error(`Failed to fetch odds for ${sportKey}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetches scores for a specific sport.
   */
  async getScores(sportKey: string, daysFrom: number = 3) {
    try {
      const response = await this.client.get(`/${sportKey}/scores`, {
        params: {
          daysFrom,
        },
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch scores for ${sportKey}: ${error.message}`);
      throw error;
    }
  }
}
