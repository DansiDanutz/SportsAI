import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  getEnvStatus() {
    const has = (v?: string) => !!v && v.trim().length > 0;
    const isPlaceholder = (v?: string) => !v || v === 'YOUR_API_KEY';

    const apiSports = process.env.API_SPORTS_KEY;
    const oddsApi = process.env.THE_ODDS_API_KEY;
    const openRouter = process.env.OPENROUTER_API_KEY;
    const apify = process.env.APIFY_API_TOKEN;
    const apifyOddsActor = process.env.APIFY_ACTOR_ODDS_API;
    const apifySofaActor = process.env.APIFY_ACTOR_SOFASCORE;
    const apifyPredActor = process.env.APIFY_ACTOR_PREDICTIONS;
    const sportmonks = process.env.SPORTMONKS_KEY;
    const sportsDb = process.env.THE_SPORTS_DB_KEY;

    return {
      nodeEnv: process.env.NODE_ENV || 'unknown',
      allowMockData: (process.env.ALLOW_MOCK_DATA || '').toLowerCase() === 'true',
      keys: {
        API_SPORTS_KEY: { set: has(apiSports), placeholder: isPlaceholder(apiSports) },
        THE_ODDS_API_KEY: { set: has(oddsApi), placeholder: isPlaceholder(oddsApi) },
        OPENROUTER_API_KEY: { set: has(openRouter), placeholder: false },
        APIFY_API_TOKEN: { set: has(apify), placeholder: false },
        APIFY_ACTOR_ODDS_API: { set: has(apifyOddsActor), placeholder: false },
        APIFY_ACTOR_SOFASCORE: { set: has(apifySofaActor), placeholder: false },
        APIFY_ACTOR_PREDICTIONS: { set: has(apifyPredActor), placeholder: false },
        SPORTMONKS_KEY: { set: has(sportmonks), placeholder: false },
        THE_SPORTS_DB_KEY: { set: has(sportsDb), placeholder: sportsDb === '3' },
      },
      corsOrigin: process.env.CORS_ORIGIN || null,
    };
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        subscriptionTier: true,
        role: true,
        creditBalance: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            favorites: true,
            presets: true,
            creditTransactions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      users: users.map((user) => ({
        ...user,
        favoritesCount: user._count.favorites,
        presetsCount: user._count.presets,
        transactionsCount: user._count.creditTransactions,
        _count: undefined,
      })),
      total: users.length,
    };
  }

  async getStats() {
    const [
      totalUsers,
      premiumUsers,
      totalTransactions,
      totalCreditsSpent,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { subscriptionTier: 'premium' } }),
      this.prisma.creditTransaction.count(),
      this.prisma.creditTransaction.aggregate({
        _sum: { amount: true },
        where: { type: 'purchase' },
      }),
    ]);

    return {
      totalUsers,
      premiumUsers,
      freeUsers: totalUsers - premiumUsers,
      totalTransactions,
      totalCreditsSpent: totalCreditsSpent._sum.amount || 0,
    };
  }

  async updateUserRole(userId: string, role: string) {
    if (!['user', 'admin'].includes(role)) {
      throw new BadRequestException('Invalid role. Must be "user" or "admin"');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    return {
      success: true,
      message: `User role updated to ${role}`,
      user: updated,
    };
  }

  async updateUserSubscription(userId: string, tier: string) {
    if (!['free', 'premium'].includes(tier)) {
      throw new BadRequestException('Invalid subscription tier. Must be "free" or "premium"');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { subscriptionTier: tier },
      select: {
        id: true,
        email: true,
        subscriptionTier: true,
      },
    });

    return {
      success: true,
      message: `User subscription updated to ${tier}`,
      user: updated,
    };
  }

  /**
   * Seeds basic demo data into the database if it doesn't already exist.
   */
  async seedDemoData() {
    try {
      // 1. Create Sports
      const soccer = await this.prisma.sport.upsert({
        where: { key: 'soccer' },
        update: {},
        create: { key: 'soccer', name: 'Soccer', icon: 'soccer-ball' },
      });

      const basketball = await this.prisma.sport.upsert({
        where: { key: 'basketball' },
        update: {},
        create: { key: 'basketball', name: 'Basketball', icon: 'basketball' },
      });

      // 2. Create Leagues
      const laLiga = await this.prisma.league.upsert({
        where: { id: 'la-liga' },
        update: {},
        create: {
          id: 'la-liga',
          sportId: soccer.id,
          name: 'La Liga',
          country: 'Spain',
          tier: 1,
        },
      });

      const nba = await this.prisma.league.upsert({
        where: { id: 'nba' },
        update: {},
        create: {
          id: 'nba',
          sportId: basketball.id,
          name: 'NBA',
          country: 'USA',
          tier: 1,
        },
      });

      // 3. Create Teams
      await this.prisma.team.upsert({
        where: { id: 'real-madrid' },
        update: {},
        create: { id: 'real-madrid', leagueId: laLiga.id, name: 'Real Madrid', shortName: 'RMA' },
      });

      await this.prisma.team.upsert({
        where: { id: 'barcelona' },
        update: {},
        create: { id: 'barcelona', leagueId: laLiga.id, name: 'FC Barcelona', shortName: 'BAR' },
      });

      await this.prisma.team.upsert({
        where: { id: 'lakers' },
        update: {},
        create: { id: 'lakers', leagueId: nba.id, name: 'Los Angeles Lakers', shortName: 'LAL' },
      });

      await this.prisma.team.upsert({
        where: { id: 'warriors' },
        update: {},
        create: { id: 'warriors', leagueId: nba.id, name: 'Golden State Warriors', shortName: 'GSW' },
      });

      // 4. Create Events
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await this.prisma.event.upsert({
        where: { id: 'event-real-barca' },
        update: {},
        create: {
          id: 'event-real-barca',
          sportId: soccer.id,
          leagueId: laLiga.id,
          homeId: 'real-madrid',
          awayId: 'barcelona',
          startTimeUtc: tomorrow,
          status: 'upcoming',
        },
      });

      await this.prisma.event.upsert({
        where: { id: 'event-lakers-warriors' },
        update: {},
        create: {
          id: 'event-lakers-warriors',
          sportId: basketball.id,
          leagueId: nba.id,
          homeId: 'lakers',
          awayId: 'warriors',
          startTimeUtc: tomorrow,
          status: 'upcoming',
        },
      });

      // 5. Create Markets
      const matchWinnerMarket = await this.prisma.market.upsert({
        where: { sportId_marketKey: { sportId: soccer.id, marketKey: '1X2' } },
        update: {},
        create: { sportId: soccer.id, marketKey: '1X2', name: 'Match Winner (1X2)' },
      });

      const moneylineMarket = await this.prisma.market.upsert({
        where: { sportId_marketKey: { sportId: basketball.id, marketKey: 'h2h' } },
        update: {},
        create: { sportId: basketball.id, marketKey: 'h2h', name: 'Moneyline' },
      });

      // 6. Create Arbitrage Opportunities
      await this.prisma.arbitrageOpportunity.upsert({
        where: { id: '550e8400-e29b-41d4-a716-446655440000' },
        update: {},
        create: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          eventId: 'event-real-barca',
          marketId: matchWinnerMarket.id,
          profitMargin: 2.8,
          confidenceScore: 0.96,
          isWinningTip: true,
          creditCost: 10,
          bookmakerLegs: JSON.stringify([
            { outcome: 'Real Madrid', odds: 2.45, bookmaker: 'Bet365' },
            { outcome: 'Draw', odds: 3.60, bookmaker: 'Betano' },
            { outcome: 'Barcelona', odds: 2.90, bookmaker: 'Unibet' },
          ]),
        },
      });

      await this.prisma.arbitrageOpportunity.upsert({
        where: { id: '550e8400-e29b-41d4-a716-446655440001' },
        update: {},
        create: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          eventId: 'event-lakers-warriors',
          marketId: moneylineMarket.id,
          profitMargin: 1.9,
          confidenceScore: 0.92,
          isWinningTip: false,
          creditCost: 10,
          bookmakerLegs: JSON.stringify([
            { outcome: 'Lakers', odds: 2.15, bookmaker: 'Stake' },
            { outcome: 'Warriors', odds: 1.95, bookmaker: 'William Hill' },
          ]),
        },
      });

      return {
        success: true,
        message: 'Demo data seeded successfully',
      };
    } catch (error: any) {
      console.error('Seed error:', error);
      throw new BadRequestException('Failed to seed demo data: ' + error.message);
    }
  }
}
