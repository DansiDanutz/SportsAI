import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        league: {
          include: {
            sport: true,
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return {
      id: team.id,
      name: team.name,
      shortName: team.shortName,
      country: team.country,
      league: team.league?.name || 'Unknown',
      leagueId: team.leagueId,
      sport: team.league?.sport?.name || 'Unknown',
      sportKey: team.league?.sport?.key || 'unknown',
    };
  }

  async getFixtures(teamId: string, limit = 10) {
    // First verify team exists
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Get fixtures where team is home or away
    const fixtures = await this.prisma.event.findMany({
      where: {
        OR: [
          { homeId: teamId },
          { awayId: teamId },
        ],
      },
      include: {
        home: true,
        away: true,
        league: true,
      },
      orderBy: { startTimeUtc: 'asc' },
      take: limit,
    });

    return fixtures.map((fixture) => ({
      id: fixture.id,
      homeTeam: fixture.home?.name || 'TBD',
      awayTeam: fixture.away?.name || 'TBD',
      startTime: fixture.startTimeUtc,
      status: fixture.status,
      venue: fixture.venue,
      league: fixture.league?.name || 'Unknown',
    }));
  }

  async getStats(teamId: string) {
    // First verify team exists
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        league: true,
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Try to get standing data for this team
    const currentYear = new Date().getFullYear();
    const currentSeason = `${currentYear - 1}-${currentYear}`;

    const standing = await this.prisma.standing.findFirst({
      where: {
        teamId,
        season: currentSeason,
      },
    });

    if (standing) {
      // Parse form string into array (e.g., "WWDLW" -> ["W", "W", "D", "L", "W"])
      const formArray = standing.form ? standing.form.split('') : [];

      return {
        played: standing.played,
        won: standing.won,
        drawn: standing.drawn,
        lost: standing.lost,
        goalsFor: standing.goalsFor,
        goalsAgainst: standing.goalsAgainst,
        form: formArray,
      };
    }

    // If no standing data, calculate from recent fixtures
    const recentFixtures = await this.prisma.event.findMany({
      where: {
        OR: [
          { homeId: teamId },
          { awayId: teamId },
        ],
        status: 'finished',
      },
      orderBy: { startTimeUtc: 'desc' },
      take: 10,
    });

    // Return default stats if no data
    return {
      played: recentFixtures.length,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      form: [],
    };
  }
}
