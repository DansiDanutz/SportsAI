import {
  Controller,
  Get,
  Param,
  Query,
  Header,
  Logger,
} from '@nestjs/common';
import { FreeApisService } from '../integrations/free-apis.service';
import { TheOddsApiService } from '../integrations/the-odds-api.service';
import { TheSportsDbService } from '../integrations/the-sports-db.service';
import { ConfigService } from '@nestjs/config';

/**
 * Live data endpoints that work immediately with zero configuration
 * Uses TheSportsDB API (free, no signup required) for event data
 */
@Controller('api')
export class LiveDataController {
  private readonly logger = new Logger(LiveDataController.name);
  private readonly hasOddsApiKey: boolean;

  // Key league IDs for TheSportsDB
  private readonly LEAGUE_IDS = {
    epl: '4328',          // English Premier League
    bundesliga: '4331',   // German Bundesliga  
    serie_a: '4332',      // Italian Serie A
    ligue_1: '4334',      // French Ligue 1
    la_liga: '4335',      // Spanish La Liga
    nba: '4387',          // NBA
    nfl: '4391',          // NFL
    mlb: '4424',          // MLB
  };

  constructor(
    private freeApisService: FreeApisService,
    private theOddsApiService: TheOddsApiService,
    private theSportsDbService: TheSportsDbService,
    private configService: ConfigService,
  ) {
    this.hasOddsApiKey = !!this.configService.get<string>('THE_ODDS_API_KEY');
  }

  /**
   * GET /api/live-events - Today's real events from TheSportsDB
   * Works immediately with zero configuration
   */
  @Get('live-events')
  @Header('Cache-Control', 'public, max-age=120, stale-while-revalidate=60')
  async getLiveEvents(
    @Query('limit') limit?: string,
    @Query('sport') sport?: string,
  ) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const events = await this.freeApisService.getEventsByDate(today);
      
      // Filter by sport if provided
      let filteredEvents = events;
      if (sport) {
        filteredEvents = events.filter(event => 
          event.sport.toLowerCase().includes(sport.toLowerCase())
        );
      }

      // Apply limit
      const limitNum = limit ? parseInt(limit, 10) : 50;
      const result = filteredEvents.slice(0, limitNum);

      this.logger.log(`Served ${result.length} live events for ${today}`);

      return {
        success: true,
        date: today,
        events: result,
        total: result.length,
        source: 'TheSportsDB (free)',
        message: 'Real-time data - no mock/demo content',
      };
    } catch (error) {
      this.logger.error(`Failed to fetch live events: ${error.message}`);
      return {
        success: false,
        error: 'Failed to fetch live events',
        message: 'Check TheSportsDB API connection',
      };
    }
  }

  /**
   * GET /api/upcoming/:leagueId - Upcoming real fixtures for specific league
   */
  @Get('upcoming/:leagueId')
  @Header('Cache-Control', 'public, max-age=300, stale-while-revalidate=120')
  async getUpcomingEvents(
    @Param('leagueId') leagueId: string,
    @Query('limit') limit?: string,
  ) {
    try {
      // Map friendly names to actual IDs
      const actualLeagueId = this.LEAGUE_IDS[leagueId as keyof typeof this.LEAGUE_IDS] || leagueId;
      
      const limitNum = limit ? parseInt(limit, 10) : 20;
      const events = await this.freeApisService.getUpcomingEvents(actualLeagueId, limitNum);

      this.logger.log(`Served ${events.length} upcoming events for league ${actualLeagueId}`);

      return {
        success: true,
        leagueId: actualLeagueId,
        events,
        total: events.length,
        source: 'TheSportsDB (free)',
        message: 'Real upcoming fixtures - no mock data',
      };
    } catch (error) {
      this.logger.error(`Failed to fetch upcoming events for league ${leagueId}: ${error.message}`);
      return {
        success: false,
        error: 'Failed to fetch upcoming events',
        leagueId,
      };
    }
  }

  /**
   * GET /api/standings/:leagueId - Real league standings 
   */
  @Get('standings/:leagueId')
  @Header('Cache-Control', 'public, max-age=600, stale-while-revalidate=300')
  async getStandings(
    @Param('leagueId') leagueId: string,
    @Query('season') season?: string,
  ) {
    try {
      // Map friendly names to actual IDs
      const actualLeagueId = this.LEAGUE_IDS[leagueId as keyof typeof this.LEAGUE_IDS] || leagueId;
      
      // Use current season if not specified
      const currentSeason = season || new Date().getFullYear().toString();
      
      let standings = [];
      
      if (this.theSportsDbService) {
        try {
          // Try to get standings from TheSportsDB
          standings = await this.theSportsDbService.getLeagueTable(actualLeagueId, currentSeason);
        } catch (error) {
          this.logger.warn(`TheSportsDB standings failed: ${error.message}`);
        }
      }

      this.logger.log(`Served standings for league ${actualLeagueId}, season ${currentSeason}`);

      return {
        success: true,
        leagueId: actualLeagueId,
        season: currentSeason,
        standings,
        total: standings.length,
        source: 'TheSportsDB (free)',
        message: standings.length > 0 ? 'Real league table' : 'Standings not available for this league/season',
      };
    } catch (error) {
      this.logger.error(`Failed to fetch standings for league ${leagueId}: ${error.message}`);
      return {
        success: false,
        error: 'Failed to fetch standings',
        leagueId,
      };
    }
  }

  /**
   * GET /api/leagues - All available leagues
   */
  @Get('leagues')
  @Header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=600')
  async getLeagues(@Query('sport') sport?: string) {
    try {
      const leagues = await this.freeApisService.getAllLeagues();
      
      // Filter by sport if provided
      let filteredLeagues = leagues;
      if (sport) {
        filteredLeagues = leagues.filter(league => 
          league.sport.toLowerCase().includes(sport.toLowerCase())
        );
      }

      this.logger.log(`Served ${filteredLeagues.length} leagues`);

      return {
        success: true,
        leagues: filteredLeagues,
        total: filteredLeagues.length,
        featured: this.LEAGUE_IDS,
        source: 'TheSportsDB (free)',
        message: 'Real leagues data',
      };
    } catch (error) {
      this.logger.error(`Failed to fetch leagues: ${error.message}`);
      return {
        success: false,
        error: 'Failed to fetch leagues',
      };
    }
  }

  /**
   * GET /api/teams/search/:teamName - Search for teams
   */
  @Get('teams/search/:teamName')
  @Header('Cache-Control', 'public, max-age=1800, stale-while-revalidate=300')
  async searchTeams(@Param('teamName') teamName: string) {
    try {
      const teams = await this.freeApisService.searchTeams(teamName);

      this.logger.log(`Served ${teams.length} teams for search: ${teamName}`);

      return {
        success: true,
        query: teamName,
        teams,
        total: teams.length,
        source: 'TheSportsDB (free)',
        message: 'Real team data - no mock teams',
      };
    } catch (error) {
      this.logger.error(`Failed to search teams: ${error.message}`);
      return {
        success: false,
        error: 'Failed to search teams',
        query: teamName,
      };
    }
  }

  /**
   * GET /api/odds/:sport - Live odds (if The Odds API key is configured)
   */
  @Get('odds/:sport?')
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=30')
  async getOdds(@Param('sport') sport?: string) {
    if (!this.hasOddsApiKey) {
      return {
        success: false,
        message: 'THE_ODDS_API_KEY not configured. Sign up at https://the-odds-api.com for free 500 credits/month',
        instructions: 'Add THE_ODDS_API_KEY to your .env file',
        fallback: 'Event data is still available via /api/live-events',
      };
    }

    try {
      // Map common sport names to The Odds API format
      const sportMap: { [key: string]: string } = {
        'soccer': 'soccer_epl',
        'football': 'americanfootball_nfl',
        'basketball': 'basketball_nba',
        'baseball': 'baseball_mlb',
        'epl': 'soccer_epl',
        'nfl': 'americanfootball_nfl',
        'nba': 'basketball_nba',
        'mlb': 'baseball_mlb',
      };

      const actualSport = sport ? (sportMap[sport.toLowerCase()] || sport) : undefined;
      const odds = await this.theOddsApiService.getOdds(actualSport || 'soccer_epl');

      this.logger.log(`Served odds for sport: ${actualSport || 'soccer_epl'}`);

      return {
        success: true,
        sport: actualSport || 'soccer_epl',
        odds,
        total: odds.length,
        source: 'The Odds API (real bookmaker data)',
        message: 'Live odds from 40+ bookmakers',
      };
    } catch (error) {
      this.logger.error(`Failed to fetch odds: ${error.message}`);
      return {
        success: false,
        error: 'Failed to fetch odds',
        message: 'Check The Odds API key and credits',
      };
    }
  }

  /**
   * GET /api/status - API status and configuration
   */
  @Get('status')
  async getStatus() {
    const freeApisHealth = await this.freeApisService.healthCheck();
    
    return {
      success: true,
      timestamp: new Date().toISOString(),
      services: {
        theSportsDB: {
          status: freeApisHealth.services.theSportsDB.status,
          configured: true,
          description: 'FREE - Works immediately, no signup required',
          endpoints: ['/api/live-events', '/api/upcoming/:leagueId', '/api/standings/:leagueId'],
        },
        theOddsAPI: {
          status: this.hasOddsApiKey ? 'configured' : 'not_configured',
          configured: this.hasOddsApiKey,
          description: this.hasOddsApiKey 
            ? 'PREMIUM - Live odds from 40+ bookmakers' 
            : 'Sign up at https://the-odds-api.com for 500 free credits/month',
          endpoints: ['/api/odds/:sport'],
        },
      },
      featured_leagues: this.LEAGUE_IDS,
      message: 'REAL DATA ONLY - No mock/demo content',
    };
  }
}