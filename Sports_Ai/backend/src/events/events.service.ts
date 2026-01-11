import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async findAll(options?: {
    status?: string;
    sportKey?: string;
    favoritesOnly?: boolean;
    userId?: string;
    limit?: number;
    search?: string;
  }) {
    const { status, sportKey, favoritesOnly, userId, limit = 50, search } = options || {};

    // Build where clause
    const where: any = {};

    // Search by team name (partial/fuzzy match - case insensitive)
    if (search) {
      const searchLower = search.toLowerCase();
      where.OR = [
        { home: { name: { contains: searchLower, mode: 'insensitive' } } },
        { away: { name: { contains: searchLower, mode: 'insensitive' } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (sportKey) {
      where.sport = { key: sportKey };
    }

    // If filtering by favorites, we need to get the user's favorite team IDs first
    if (favoritesOnly && userId) {
      const favoriteTeams = await this.prisma.favorite.findMany({
        where: {
          userId,
          entityType: 'team',
        },
        select: {
          entityId: true,
        },
      });

      const teamIds = favoriteTeams.map((f) => f.entityId);

      if (teamIds.length > 0) {
        where.OR = [
          { homeId: { in: teamIds } },
          { awayId: { in: teamIds } },
        ];
      } else {
        // No favorites, return empty
        return [];
      }
    }

    const events = await this.prisma.event.findMany({
      where,
      include: {
        sport: true,
        league: true,
        home: true,
        away: true,
      },
      orderBy: { startTimeUtc: 'asc' },
      take: limit,
    });

    return events.map((event) => ({
      id: event.id,
      sport: event.sport?.name || 'Unknown',
      sportKey: event.sport?.key || 'unknown',
      league: event.league?.name || 'Unknown',
      homeTeam: event.home?.name || 'TBD',
      homeTeamId: event.homeId,
      awayTeam: event.away?.name || 'TBD',
      awayTeamId: event.awayId,
      startTime: event.startTimeUtc,
      status: event.status,
      venue: event.venue,
    }));
  }

  async findById(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        sport: true,
        league: true,
        home: true,
        away: true,
        oddsQuotes: {
          include: {
            bookmaker: true,
            market: true,
          },
        },
      },
    });

    if (!event) {
      return null;
    }

    return {
      id: event.id,
      sport: event.sport?.name || 'Unknown',
      sportKey: event.sport?.key || 'unknown',
      league: event.league?.name || 'Unknown',
      homeTeam: event.home?.name || 'TBD',
      homeTeamId: event.homeId,
      awayTeam: event.away?.name || 'TBD',
      awayTeamId: event.awayId,
      startTime: event.startTimeUtc,
      status: event.status,
      venue: event.venue,
      odds: event.oddsQuotes.map((quote) => ({
        bookmaker: quote.bookmaker?.brand,
        market: quote.market?.name,
        outcomeKey: quote.outcomeKey,
        odds: quote.odds,
        line: quote.line,
      })),
    };
  }

  async getLiveEvents(options?: { favoritesOnly?: boolean; userId?: string; limit?: number }) {
    return this.findAll({
      ...options,
      status: 'live',
    });
  }

  async getUpcomingEvents(options?: { favoritesOnly?: boolean; userId?: string; limit?: number }) {
    return this.findAll({
      ...options,
      status: 'upcoming',
    });
  }

  async searchTeams(query: string, limit = 20) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const teams = await this.prisma.team.findMany({
      where: {
        name: {
          contains: query,
        },
      },
      include: {
        league: {
          include: {
            sport: true,
          },
        },
      },
      take: limit,
    });

    return teams.map((team) => ({
      id: team.id,
      name: team.name,
      league: team.league?.name || 'Unknown',
      sport: team.league?.sport?.name || 'Unknown',
      sportKey: team.league?.sport?.key || 'unknown',
    }));
  }

  async getStandings(leagueId: string, season?: string) {
    // Get the current season if not provided (e.g., "2024-2025")
    const currentYear = new Date().getFullYear();
    const currentSeason = season || `${currentYear - 1}-${currentYear}`;

    const standings = await this.prisma.standing.findMany({
      where: {
        leagueId,
        season: currentSeason,
      },
      include: {
        team: true,
        league: true,
      },
      orderBy: { position: 'asc' },
    });

    // Get the latest update time
    const latestUpdate = standings.length > 0
      ? standings.reduce((latest, s) => s.updatedAt > latest ? s.updatedAt : latest, standings[0].updatedAt)
      : null;

    return {
      leagueId,
      leagueName: standings[0]?.league?.name || 'Unknown',
      season: currentSeason,
      updatedAt: latestUpdate,
      standings: standings.map((s) => ({
        position: s.position,
        teamId: s.teamId,
        teamName: s.team?.name || 'Unknown',
        played: s.played,
        won: s.won,
        drawn: s.drawn,
        lost: s.lost,
        goalsFor: s.goalsFor,
        goalsAgainst: s.goalsAgainst,
        goalDifference: s.goalDifference,
        points: s.points,
        form: s.form,
      })),
    };
  }

  async getStandingsForEvent(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { leagueId: true },
    });

    if (!event) {
      return null;
    }

    return this.getStandings(event.leagueId);
  }
}
