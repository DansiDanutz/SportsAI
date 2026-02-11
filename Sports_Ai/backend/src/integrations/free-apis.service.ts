import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface SportsEvent {
  id: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time?: string;
  venue?: string;
  status?: string;
  odds?: any[];
}

interface Team {
  id: string;
  name: string;
  sport: string;
  league: string;
  logo?: string;
  description?: string;
  website?: string;
}

interface League {
  id: string;
  name: string;
  sport: string;
  country: string;
  logo?: string;
}

@Injectable()
export class FreeApisService implements OnModuleInit {
  private readonly logger = new Logger(FreeApisService.name);
  private sportsDbClient!: AxiosInstance;
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTtl = 5 * 60 * 1000; // 5 minutes

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    // Initialize TheSportsDB client (free, no API key needed, just use "3")
    this.sportsDbClient = axios.create({
      baseURL: 'https://www.thesportsdb.com/api/v1/json/3',
      timeout: 10000,
    });
  }

  /**
   * Generic cache management
   */
  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  private setCache<T>(key: string, data: T, ttl: number = this.defaultTtl): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Get all available sports from TheSportsDB
   */
  async getAllSports(): Promise<any[]> {
    const cacheKey = 'sports:all';
    const cached = this.getCached(cacheKey);
    if (cached) return cached as any[];

    try {
      const response = await this.sportsDbClient.get('/all_sports.php');
      const sports = response.data?.sports || [];
      
      this.setCache(cacheKey, sports, 60 * 60 * 1000); // Cache for 1 hour
      this.logger.log(`Fetched ${sports.length} sports from TheSportsDB`);
      
      return sports;
    } catch (error) {
      this.logger.error(`Failed to fetch sports: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all leagues from TheSportsDB
   */
  async getAllLeagues(): Promise<League[]> {
    const cacheKey = 'leagues:all';
    const cached = this.getCached(cacheKey);
    if (cached) return cached as League[];

    try {
      const response = await this.sportsDbClient.get('/all_leagues.php');
      const rawLeagues = response.data?.leagues || [];
      
      const leagues: League[] = rawLeagues.map((league: any) => ({
        id: league.idLeague,
        name: league.strLeague,
        sport: league.strSport,
        country: league.strCountry || 'Unknown',
        logo: league.strBadge,
      }));
      
      this.setCache(cacheKey, leagues, 60 * 60 * 1000); // Cache for 1 hour
      this.logger.log(`Fetched ${leagues.length} leagues from TheSportsDB`);
      
      return leagues;
    } catch (error) {
      this.logger.error(`Failed to fetch leagues: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search teams by name
   */
  async searchTeams(teamName: string): Promise<Team[]> {
    const cacheKey = `teams:search:${teamName.toLowerCase()}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached as Team[];

    try {
      const response = await this.sportsDbClient.get('/searchteams.php', {
        params: { t: teamName },
      });
      
      const rawTeams = response.data?.teams || [];
      const teams: Team[] = rawTeams.map((team: any) => ({
        id: team.idTeam,
        name: team.strTeam,
        sport: team.strSport,
        league: team.strLeague,
        logo: team.strBadge,
        description: team.strDescriptionEN?.substring(0, 500),
        website: team.strWebsite,
      }));
      
      this.setCache(cacheKey, teams);
      this.logger.log(`Found ${teams.length} teams for search: ${teamName}`);
      
      return teams;
    } catch (error) {
      this.logger.error(`Failed to search teams: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get events for a specific date
   */
  async getEventsByDate(date: string): Promise<SportsEvent[]> {
    const cacheKey = `events:date:${date}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached as SportsEvent[];

    try {
      const response = await this.sportsDbClient.get('/eventsday.php', {
        params: { d: date },
      });
      
      const rawEvents = response.data?.events || [];
      const events: SportsEvent[] = rawEvents.map((event: any) => ({
        id: event.idEvent,
        sport: event.strSport,
        league: event.strLeague,
        homeTeam: event.strHomeTeam,
        awayTeam: event.strAwayTeam,
        date: event.dateEvent,
        time: event.strTime,
        venue: event.strVenue,
        status: event.strStatus || 'scheduled',
      }));
      
      this.setCache(cacheKey, events, 30 * 60 * 1000); // Cache for 30 minutes
      this.logger.log(`Fetched ${events.length} events for date: ${date}`);
      
      return events;
    } catch (error) {
      this.logger.error(`Failed to fetch events for date ${date}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get upcoming events for a specific league
   */
  async getUpcomingEvents(leagueId: string, limit: number = 50): Promise<SportsEvent[]> {
    const cacheKey = `events:upcoming:${leagueId}:${limit}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached as SportsEvent[];

    try {
      const response = await this.sportsDbClient.get('/eventsnextleague.php', {
        params: { id: leagueId },
      });
      
      const rawEvents = response.data?.events || [];
      const events: SportsEvent[] = rawEvents
        .slice(0, limit)
        .map((event: any) => ({
          id: event.idEvent,
          sport: event.strSport,
          league: event.strLeague,
          homeTeam: event.strHomeTeam,
          awayTeam: event.strAwayTeam,
          date: event.dateEvent,
          time: event.strTime,
          venue: event.strVenue,
          status: event.strStatus || 'scheduled',
        }));
      
      this.setCache(cacheKey, events, 15 * 60 * 1000); // Cache for 15 minutes
      this.logger.log(`Fetched ${events.length} upcoming events for league: ${leagueId}`);
      
      return events;
    } catch (error) {
      this.logger.error(`Failed to fetch upcoming events for league ${leagueId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get event details by ID
   */
  async getEventDetails(eventId: string): Promise<SportsEvent | null> {
    const cacheKey = `event:details:${eventId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached as SportsEvent;

    try {
      const response = await this.sportsDbClient.get('/lookupevent.php', {
        params: { id: eventId },
      });
      
      const eventData = response.data?.events?.[0];
      if (!eventData) return null;
      
      const event: SportsEvent = {
        id: eventData.idEvent,
        sport: eventData.strSport,
        league: eventData.strLeague,
        homeTeam: eventData.strHomeTeam,
        awayTeam: eventData.strAwayTeam,
        date: eventData.dateEvent,
        time: eventData.strTime,
        venue: eventData.strVenue,
        status: eventData.strStatus || 'scheduled',
      };
      
      this.setCache(cacheKey, event, 10 * 60 * 1000); // Cache for 10 minutes
      this.logger.log(`Fetched event details for ID: ${eventId}`);
      
      return event;
    } catch (error) {
      this.logger.error(`Failed to fetch event details for ID ${eventId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get team details by ID
   */
  async getTeamDetails(teamId: string): Promise<Team | null> {
    const cacheKey = `team:details:${teamId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached as Team;

    try {
      const response = await this.sportsDbClient.get('/lookupteam.php', {
        params: { id: teamId },
      });
      
      const teamData = response.data?.teams?.[0];
      if (!teamData) return null;
      
      const team: Team = {
        id: teamData.idTeam,
        name: teamData.strTeam,
        sport: teamData.strSport,
        league: teamData.strLeague,
        logo: teamData.strBadge,
        description: teamData.strDescriptionEN?.substring(0, 500),
        website: teamData.strWebsite,
      };
      
      this.setCache(cacheKey, team, 60 * 60 * 1000); // Cache for 1 hour
      this.logger.log(`Fetched team details for ID: ${teamId}`);
      
      return team;
    } catch (error) {
      this.logger.error(`Failed to fetch team details for ID ${teamId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get live/recent events (combining multiple approaches)
   */
  async getLiveEvents(): Promise<SportsEvent[]> {
    const cacheKey = 'events:live';
    const cached = this.getCached(cacheKey);
    if (cached) return cached as SportsEvent[];

    try {
      // Get events from today and yesterday
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const [todayEvents, yesterdayEvents] = await Promise.all([
        this.getEventsByDate(today),
        this.getEventsByDate(yesterday),
      ]);
      
      const allEvents = [...todayEvents, ...yesterdayEvents]
        .filter(event => event.status !== 'finished')
        .sort((a, b) => new Date(a.date + ' ' + (a.time || '00:00')).getTime() - new Date(b.date + ' ' + (b.time || '00:00')).getTime());
      
      this.setCache(cacheKey, allEvents, 2 * 60 * 1000); // Cache for 2 minutes (more frequent updates for live data)
      this.logger.log(`Fetched ${allEvents.length} live/upcoming events`);
      
      return allEvents;
    } catch (error) {
      this.logger.error(`Failed to fetch live events: ${error.message}`);
      return [];
    }
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{ status: string; services: any }> {
    const results = {
      status: 'healthy',
      services: {
        theSportsDB: { status: 'unknown', responseTime: 0 },
      },
    };

    try {
      const start = Date.now();
      await this.sportsDbClient.get('/all_sports.php');
      results.services.theSportsDB = {
        status: 'healthy',
        responseTime: Date.now() - start,
      };
    } catch (error) {
      (results.services.theSportsDB as any) = {
        status: 'unhealthy',
        responseTime: 0,
        error: error.message,
      };
      results.status = 'degraded';
    }

    return results;
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.log('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}