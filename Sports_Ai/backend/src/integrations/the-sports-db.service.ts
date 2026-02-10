import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TheSportsDbService implements OnModuleInit {
  private readonly logger = new Logger(TheSportsDbService.name);
  private client!: AxiosInstance;
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
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to search teams: ${msg}`);
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
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get league details: ${msg}`);
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
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get team players: ${msg}`);
      throw error;
    }
  }

  async getLeagueTable(leagueId: string, season?: string) {
    try {
      const params: any = { l: leagueId };
      if (season) {
        params.s = season;
      }
      
      const response = await this.client.get('/lookuptable.php', { params });
      return response.data.table || [];
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get league table: ${msg}`);
      throw error;
    }
  }

  async getPastEvents(leagueId: string) {
    try {
      const response = await this.client.get('/eventspastleague.php', {
        params: { id: leagueId },
      });
      return response.data.events || [];
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get past events: ${msg}`);
      throw error;
    }
  }

  async getUpcomingEvents(leagueId: string) {
    try {
      const response = await this.client.get('/eventsnextleague.php', {
        params: { id: leagueId },
      });
      return response.data.events || [];
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get upcoming events: ${msg}`);
      throw error;
    }
  }
}
