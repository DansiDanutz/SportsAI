import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TheSportsDbService implements OnModuleInit {
  private readonly logger = new Logger(TheSportsDbService.name);
  private client: AxiosInstance;
  private apiKey: string;
  private readonly baseUrl = 'https://www.thesportsdb.com/api/v1/json';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('THE_SPORTS_DB_KEY') || '3'; // '3' is the default test key
  }

  onModuleInit() {
    this.client = axios.create({
      baseURL: `${this.baseUrl}/${this.apiKey}`,
    });
  }

  async searchTeams(teamName: string) {
    try {
      const response = await this.client.get('/searchteams.php', {
        params: { t: teamName },
      });
      return response.data.teams;
    } catch (error) {
      this.logger.error(`Failed to search teams: ${error.message}`);
      throw error;
    }
  }

  async getLeagueDetails(leagueName: string) {
    try {
      const response = await this.client.get('/search_all_leagues.php', {
        params: { s: leagueName },
      });
      return response.data.countrys;
    } catch (error) {
      this.logger.error(`Failed to get league details: ${error.message}`);
      throw error;
    }
  }

  async getTeamPlayers(teamId: string) {
    try {
      const response = await this.client.get('/lookup_all_players.php', {
        params: { id: teamId },
      });
      return response.data.player;
    } catch (error) {
      this.logger.error(`Failed to get team players: ${error.message}`);
      throw error;
    }
  }
}
