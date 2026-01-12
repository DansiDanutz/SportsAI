import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SportmonksService implements OnModuleInit {
  private readonly logger = new Logger(SportmonksService.name);
  private client: AxiosInstance;
  private apiKey: string;
  private readonly baseUrl = 'https://api.sportmonks.com/v3';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('SPORTMONKS_API_KEY') || 'YOUR_API_KEY';
  }

  onModuleInit() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      params: {
        api_token: this.apiKey,
      },
    });
  }

  async getFootballLeagues() {
    try {
      const response = await this.client.get('/core/leagues');
      return response.data.data;
    } catch (error: any) {
      this.logger.error(`Failed to fetch football leagues: ${error?.message || String(error)}`);
      throw error;
    }
  }

  async getFootballFixtures(params: any) {
    try {
      const response = await this.client.get('/football/fixtures', { params });
      return response.data.data;
    } catch (error: any) {
      this.logger.error(`Failed to fetch football fixtures: ${error?.message || String(error)}`);
      throw error;
    }
  }

  async getCricketLeagues() {
    try {
      const response = await this.client.get('/cricket/leagues');
      return response.data.data;
    } catch (error: any) {
      this.logger.error(`Failed to fetch cricket leagues: ${error?.message || String(error)}`);
      throw error;
    }
  }
}
