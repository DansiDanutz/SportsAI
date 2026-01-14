import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// Service for AI configuration management

interface CreateConfigDto {
  name: string;
  sportKey: string;
  leagues: string[];
  countries: string[];
  markets: string[];
  isActive?: boolean;
}

interface UpdateConfigDto {
  name?: string;
  sportKey?: string;
  leagues?: string[];
  countries?: string[];
  markets?: string[];
  isActive?: boolean;
}

export interface AiMatchInsight {
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  startTime: string;
  sport: string;
  winProbability: number;
  recommendedPick: string;
  confidence: number;
  historicalStats: {
    homeWinRate: number;
    awayWinRate: number;
    drawRate: number;
    avgGoals: number;
  };
  odds: {
    home: number;
    draw?: number;
    away: number;
  };
}

@Injectable()
export class SetupService {
  constructor(private prisma: PrismaService) {}

  async getConfigurations(userId: string) {
    const configs = await this.prisma.aiConfiguration.findMany({
      where: { userId },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });

    return configs.map((config) => ({
      ...config,
      leagues: JSON.parse(config.leagues),
      countries: JSON.parse(config.countries),
      markets: JSON.parse(config.markets),
    }));
  }

  async createConfiguration(userId: string, dto: CreateConfigDto) {
    // If this is set as active, deactivate all other configs first
    if (dto.isActive) {
      await this.prisma.aiConfiguration.updateMany({
        where: { userId },
        data: { isActive: false },
      });
    }

    const config = await this.prisma.aiConfiguration.create({
      data: {
        userId,
        name: dto.name,
        sportKey: dto.sportKey,
        leagues: JSON.stringify(dto.leagues || []),
        countries: JSON.stringify(dto.countries || []),
        markets: JSON.stringify(dto.markets || []),
        isActive: dto.isActive || false,
      },
    });

    return {
      ...config,
      leagues: JSON.parse(config.leagues),
      countries: JSON.parse(config.countries),
      markets: JSON.parse(config.markets),
    };
  }

  async updateConfiguration(userId: string, configId: string, dto: UpdateConfigDto) {
    // Verify ownership
    const existing = await this.prisma.aiConfiguration.findFirst({
      where: { id: configId, userId },
    });

    if (!existing) {
      throw new Error('Configuration not found');
    }

    // If setting as active, deactivate all other configs first
    if (dto.isActive) {
      await this.prisma.aiConfiguration.updateMany({
        where: { userId, id: { not: configId } },
        data: { isActive: false },
      });
    }

    const config = await this.prisma.aiConfiguration.update({
      where: { id: configId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.sportKey !== undefined && { sportKey: dto.sportKey }),
        ...(dto.leagues !== undefined && { leagues: JSON.stringify(dto.leagues) }),
        ...(dto.countries !== undefined && { countries: JSON.stringify(dto.countries) }),
        ...(dto.markets !== undefined && { markets: JSON.stringify(dto.markets) }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return {
      ...config,
      leagues: JSON.parse(config.leagues),
      countries: JSON.parse(config.countries),
      markets: JSON.parse(config.markets),
    };
  }

  async deleteConfiguration(userId: string, configId: string) {
    // Verify ownership
    const existing = await this.prisma.aiConfiguration.findFirst({
      where: { id: configId, userId },
    });

    if (!existing) {
      throw new Error('Configuration not found');
    }

    await this.prisma.aiConfiguration.delete({
      where: { id: configId },
    });

    return { success: true };
  }

  async activateConfiguration(userId: string, configId: string) {
    // Verify ownership
    const existing = await this.prisma.aiConfiguration.findFirst({
      where: { id: configId, userId },
    });

    if (!existing) {
      throw new Error('Configuration not found');
    }

    // Deactivate all other configs
    await this.prisma.aiConfiguration.updateMany({
      where: { userId },
      data: { isActive: false },
    });

    // Activate this config
    const config = await this.prisma.aiConfiguration.update({
      where: { id: configId },
      data: { isActive: true },
    });

    return {
      ...config,
      leagues: JSON.parse(config.leagues),
      countries: JSON.parse(config.countries),
      markets: JSON.parse(config.markets),
    };
  }

  async getActiveConfiguration(userId: string) {
    const config = await this.prisma.aiConfiguration.findFirst({
      where: { userId, isActive: true },
    });

    if (!config) {
      return null;
    }

    return {
      ...config,
      leagues: JSON.parse(config.leagues),
      countries: JSON.parse(config.countries),
      markets: JSON.parse(config.markets),
    };
  }

  async getAiMatchInsights(userId: string): Promise<AiMatchInsight[]> {
    // Get the active configuration
    const activeConfig = await this.getActiveConfiguration(userId);

    if (!activeConfig) {
      return [];
    }

    // Get events matching the configuration filters
    const events = await this.prisma.event.findMany({
      where: {
        sport: { key: activeConfig.sportKey },
        status: { in: ['upcoming', 'live'] },
        // Filter by leagues if specified
        ...(activeConfig.leagues.length > 0 && {
          league: {
            OR: [
              { name: { in: activeConfig.leagues } },
              { id: { in: activeConfig.leagues } },
            ],
          },
        }),
        // Filter by countries if specified
        ...(activeConfig.countries.length > 0 && {
          league: {
            country: { in: activeConfig.countries },
          },
        }),
      },
      include: {
        home: true,
        away: true,
        league: true,
        sport: true,
        oddsQuotes: {
          include: {
            bookmaker: true,
            market: true,
          },
          orderBy: { timestamp: 'desc' },
        },
      },
      orderBy: { startTimeUtc: 'asc' },
      take: 20, // Get more to filter down to top 5
    });

    // Calculate AI insights for each event (no fabricated stats; require real odds quotes)
    const insights: AiMatchInsight[] = events.flatMap((event) => {
      const homeQuote = event.oddsQuotes.find((q) => q.outcomeKey === 'home');
      const awayQuote = event.oddsQuotes.find((q) => q.outcomeKey === 'away');
      const drawQuote = event.oddsQuotes.find((q) => q.outcomeKey === 'draw');

      // If we don't have at least home+away odds, we cannot compute probabilities without fabricating.
      if (!homeQuote || !awayQuote) return [];

      const homeOdds = homeQuote.odds;
      const awayOdds = awayQuote.odds;
      const drawOdds = drawQuote?.odds;

      // Calculate implied probabilities from odds (2-way if draw is missing)
      const homeImplied = 1 / homeOdds;
      const awayImplied = 1 / awayOdds;
      const drawImplied = drawOdds ? 1 / drawOdds : 0;
      const totalImplied = homeImplied + awayImplied + drawImplied;

      const homeProb = Math.round((homeImplied / totalImplied) * 100);
      const awayProb = Math.round((awayImplied / totalImplied) * 100);
      const drawProb = drawOdds ? Math.round((drawImplied / totalImplied) * 100) : 0;

      // Determine recommended pick from available outcomes
      let recommendedPick = 'Home Win';
      let winProbability = homeProb;
      if (awayProb > winProbability) {
        recommendedPick = 'Away Win';
        winProbability = awayProb;
      }
      if (drawProb > winProbability) {
        recommendedPick = 'Draw';
        winProbability = drawProb;
      }

      // If user selected markets we don't have real market data for yet, don't fabricate.
      const marketsFilter = activeConfig.markets || [];
      if (marketsFilter.some((m: string) => ['btts', 'BTTS', 'over_under', 'totals'].includes(m))) {
        recommendedPick = 'No market data available';
        winProbability = 0;
      }

      const confidence = winProbability;

      return [
        {
          eventId: event.id,
          homeTeam: event.home?.name || 'TBD',
          awayTeam: event.away?.name || 'TBD',
          league: event.league?.name || 'Unknown League',
          startTime: event.startTimeUtc.toISOString(),
          sport: event.sport?.name || 'Sport',
          winProbability,
          recommendedPick,
          confidence,
          historicalStats: {
            homeWinRate: homeProb,
            awayWinRate: awayProb,
            drawRate: drawProb,
            // Unknown without a connected stats provider; render as unavailable client-side.
            avgGoals: 0,
          },
          odds: {
            home: homeOdds,
            ...(drawOdds ? { draw: drawOdds } : {}),
            away: awayOdds,
          },
        },
      ];
    });

    // Sort by confidence and win probability, return top 5
    return insights
      .sort((a, b) => {
        const scoreA = a.confidence * 0.4 + a.winProbability * 0.6;
        const scoreB = b.confidence * 0.4 + b.winProbability * 0.6;
        return scoreB - scoreA;
      })
      .slice(0, 5);
  }

  async getAvailableLeagues(sportKey: string) {
    const leagues = await this.prisma.league.findMany({
      where: {
        sport: { key: sportKey },
      },
      include: {
        sport: true,
      },
      orderBy: [{ tier: 'asc' }, { name: 'asc' }],
    });

    return leagues.map((league) => ({
      id: league.id,
      name: league.name,
      country: league.country,
      tier: league.tier,
    }));
  }

  async getAvailableCountries(sportKey: string) {
    const leagues = await this.prisma.league.findMany({
      where: {
        sport: { key: sportKey },
        country: { not: null },
      },
      select: { country: true },
      distinct: ['country'],
      orderBy: { country: 'asc' },
    });

    return leagues
      .filter((l) => l.country)
      .map((l) => l.country as string);
  }

  getAvailableMarkets(sportKey: string) {
    // Return available market types for each sport
    const marketsBySport: Record<string, { key: string; name: string }[]> = {
      soccer: [
        { key: '1X2', name: 'Match Result (1X2)' },
        { key: 'over_under', name: 'Over/Under Goals' },
        { key: 'btts', name: 'Both Teams to Score' },
        { key: 'double_chance', name: 'Double Chance' },
        { key: 'asian_handicap', name: 'Asian Handicap' },
        { key: 'correct_score', name: 'Correct Score' },
        { key: 'ht_ft', name: 'Half Time/Full Time' },
      ],
      basketball: [
        { key: 'moneyline', name: 'Moneyline' },
        { key: 'spread', name: 'Point Spread' },
        { key: 'totals', name: 'Total Points' },
        { key: 'team_totals', name: 'Team Totals' },
        { key: 'quarter', name: 'Quarter Markets' },
      ],
      tennis: [
        { key: 'match_winner', name: 'Match Winner' },
        { key: 'set_winner', name: 'Set Winner' },
        { key: 'total_games', name: 'Total Games' },
        { key: 'handicap_games', name: 'Handicap Games' },
      ],
      baseball: [
        { key: 'moneyline', name: 'Moneyline' },
        { key: 'run_line', name: 'Run Line' },
        { key: 'totals', name: 'Total Runs' },
        { key: 'first_5', name: 'First 5 Innings' },
      ],
      american_football: [
        { key: 'moneyline', name: 'Moneyline' },
        { key: 'spread', name: 'Point Spread' },
        { key: 'totals', name: 'Total Points' },
        { key: 'team_totals', name: 'Team Totals' },
        { key: 'first_half', name: '1st Half Markets' },
      ],
      ice_hockey: [
        { key: 'moneyline', name: 'Moneyline' },
        { key: 'puck_line', name: 'Puck Line' },
        { key: 'totals', name: 'Total Goals' },
        { key: 'period', name: 'Period Markets' },
      ],
      cricket: [
        { key: 'match_winner', name: 'Match Winner' },
        { key: 'top_batsman', name: 'Top Batsman' },
        { key: 'total_runs', name: 'Total Runs' },
      ],
      rugby: [
        { key: 'match_winner', name: 'Match Winner' },
        { key: 'spread', name: 'Point Spread' },
        { key: 'totals', name: 'Total Points' },
        { key: 'try_scorer', name: 'Try Scorer' },
      ],
      mma: [
        { key: 'fight_winner', name: 'Fight Winner' },
        { key: 'method_victory', name: 'Method of Victory' },
        { key: 'round_betting', name: 'Round Betting' },
      ],
      esports: [
        { key: 'match_winner', name: 'Match Winner' },
        { key: 'map_winner', name: 'Map Winner' },
        { key: 'handicap_maps', name: 'Handicap Maps' },
      ],
    };

    return marketsBySport[sportKey] || [];
  }
}
