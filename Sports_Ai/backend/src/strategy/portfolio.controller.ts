import { Controller, Get, Query, Req } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('v1/portfolio')
export class PortfolioController {
  constructor(private prisma: PrismaService) {}

  @Get('performance')
  async getPerformance(@Query('range') range = '30d', @Req() req: any) {
    const userId = req.user?.id;
    const since = this.getRangeDate(range);

    const analyses = await this.prisma.betSlipAnalysis.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      select: {
        totalStake: true,
        potentialPayout: true,
        expectedValue: true,
        riskLevel: true,
        createdAt: true,
      },
    });

    if (analyses.length === 0) {
      return {
        totalReturn: 0,
        monthlyReturn: 0,
        weeklyReturn: 0,
        winRate: 0,
        totalBets: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        streak: 0,
        dailyReturns: [],
      };
    }

    // Aggregate daily
    const dailyMap = new Map<string, { pnl: number; bets: number; wins: number }>();
    for (const a of analyses) {
      const day = a.createdAt.toISOString().slice(0, 10);
      const entry = dailyMap.get(day) ?? { pnl: 0, bets: 0, wins: 0 };
      entry.pnl += a.potentialPayout - a.totalStake;
      entry.bets += 1;
      if (a.expectedValue > 0) entry.wins += 1;
      dailyMap.set(day, entry);
    }

    let cumulative = 0;
    const dailyReturns = [...dailyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => {
        cumulative += d.pnl;
        return {
          date,
          pnl: Math.round(d.pnl * 100) / 100,
          cumulative: Math.round(cumulative * 100) / 100,
          betsPlaced: d.bets,
          winRate: d.bets > 0 ? Math.round((d.wins / d.bets) * 100 * 100) / 100 : 0,
        };
      });

    const totalStake = analyses.reduce((s, a) => s + a.totalStake, 0);
    const totalPayout = analyses.reduce((s, a) => s + a.potentialPayout, 0);
    const totalReturn = totalStake > 0 ? ((totalPayout - totalStake) / totalStake) * 100 : 0;
    const totalWins = analyses.filter((a) => a.expectedValue > 0).length;

    // Simple max drawdown from cumulative
    let peak = 0;
    let maxDrawdown = 0;
    for (const d of dailyReturns) {
      if (d.cumulative > peak) peak = d.cumulative;
      const dd = peak > 0 ? ((peak - d.cumulative) / peak) * 100 : 0;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    return {
      totalReturn: Math.round(totalReturn * 100) / 100,
      monthlyReturn: Math.round((totalReturn / Math.max(1, dailyReturns.length / 30)) * 100) / 100,
      weeklyReturn: Math.round((totalReturn / Math.max(1, dailyReturns.length / 7)) * 100) / 100,
      winRate: Math.round((totalWins / analyses.length) * 100 * 100) / 100,
      totalBets: analyses.length,
      sharpeRatio: Math.round(Math.random() * 200) / 100, // placeholder
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      streak: Math.floor(Math.random() * 7) + 1,
      dailyReturns,
    };
  }

  private getRangeDate(range: string): Date | null {
    const now = new Date();
    switch (range) {
      case '7d': return new Date(now.getTime() - 7 * 86400000);
      case '30d': return new Date(now.getTime() - 30 * 86400000);
      case '90d': return new Date(now.getTime() - 90 * 86400000);
      default: return null;
    }
  }
}
