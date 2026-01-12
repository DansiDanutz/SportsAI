import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiSportsService implements OnModuleInit {
  private readonly logger = new Logger(ApiSportsService.name);
  private client: AxiosInstance;
  private apiKey: string;
  private readonly baseUrl = 'https://v3.football.api-sports.io'; // Default to football, can be changed per sport

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('API_SPORTS_KEY') || 'YOUR_API_KEY';
  }

  onModuleInit() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'x-rapidapi-key': this.apiKey,
        'x-rapidapi-host': 'v3.football.api-sports.io',
      },
    });
  }

  /**
   * Helper to set base URL for different sports
   */
  private setSportBase(sport: 'football' | 'basketball' | 'baseball' | 'f1') {
    const hosts = {
      football: 'v3.football.api-sports.io',
      basketball: 'v1.basketball.api-sports.io',
      baseball: 'v1.baseball.api-sports.io',
      f1: 'v1.formula-1.api-sports.io',
    };
    this.client.defaults.baseURL = `https://${hosts[sport]}`;
    this.client.defaults.headers['x-rapidapi-host'] = hosts[sport];
  }

  async getLeagues(sport: 'football' | 'basketball' | 'baseball' = 'football') {
    this.setSportBase(sport);
    try {
      const response = await this.client.get('/leagues');
      return response.data.response;
    } catch (error: any) {
      this.logger.error(`Failed to fetch leagues for ${sport}: ${error?.message || String(error)}`);
      throw error;
    }
  }

  async getFixtures(sport: 'football' | 'basketball' | 'baseball' = 'football', params: any) {
    this.setSportBase(sport);
    try {
      const response = await this.client.get('/fixtures', { params });
      return response.data.response;
    } catch (error: any) {
      this.logger.error(`Failed to fetch fixtures for ${sport}: ${error?.message || String(error)}`);
      throw error;
    }
  }

  async getStandings(sport: 'football' | 'basketball' | 'baseball' = 'football', league: number, season: number) {
    this.setSportBase(sport);
    try {
      const response = await this.client.get('/standings', {
        params: { league, season },
      });
      return response.data.response;
    } catch (error: any) {
      this.logger.error(`Failed to fetch standings for ${sport}: ${error?.message || String(error)}`);
      throw error;
    }
  }
}
