import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface DailyReturn {
  date: string;
  pnl: number;
  cumulative: number;
  betsPlaced: number;
  winRate: number;
}

interface PerformanceStats {
  totalReturn: number;
  monthlyReturn: number;
  weeklyReturn: number;
  winRate: number;
  totalBets: number;
  sharpeRatio: number;
  maxDrawdown: number;
  streak: number;
  dailyReturns: DailyReturn[];
}

@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);

  constructor(private prisma: PrismaService) {}

  async getPerformanceStats(userId: string, timeRange: string): Promise<PerformanceStats> {
    const now = new Date();
    const rangeStart = this.getRangeStart(now, timeRange);

    // Get user's bet slip analyses within range
    const analyses = await this.prisma.betSlipAnalysis.findMany({
      where: {
        userId,
        createdAt: { gte: rangeStart },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (analyses.length === 0) {
      return this.emptyStats();
    }

    // Build daily returns from analyses
    const dailyMap = new Map<string, { pnl: number; count: number; wins: number }>();

    for (const a of analyses) {
      const dateKey = a.createdAt.toISOString().slice(0, 10);
      const entry = dailyMap.get(dateKey) || { pnl: 0, count: 0, wins: 0 };
      // Use expectedValue as PnL proxy
      entry.pnl += a.expectedValue * a.totalStake;
      entry.count += 1;
      if (a.expectedValue > 0) entry.wins += 1;
      dailyMap.set(dateKey, entry);
    }

    let cumulative = 0;
    const dailyReturns: DailyReturn[] = [];
    const pnlValues: number[] = [];

    for (const [date, data] of Array.from(dailyMap.entries()).sort()) {
      cumulative += data.pnl;
      pnlValues.push(data.pnl);
      dailyReturns.push({
        date,
        pnl: Math.round(data.pnl * 100) / 100,
        cumulative: Math.round(cumulative * 100) / 100,
        betsPlaced: data.count,
        winRate: data.count > 0 ? Math.round((data.wins / data.count) * 100) : 0,
      });
    }

    const totalBets = analyses.length;
    const totalWins = analyses.filter(a => a.expectedValue > 0).length;
    const totalReturn = Math.round(cumulative * 100) / 100;

    // Weekly/monthly returns
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const monthAgo = new Date(now.getTime() - 30 * 86400000);
    const weeklyReturn = this.sumPnlAfter(dailyReturns, weekAgo);
    const monthlyReturn = this.sumPnlAfter(dailyReturns, monthAgo);

    // Sharpe ratio (annualized, assuming daily returns)
    const sharpeRatio = this.calculateSharpe(pnlValues);

    // Max drawdown
    const maxDrawdown = this.calculateMaxDrawdown(dailyReturns);

    // Current streak
    const streak = this.calculateStreak(dailyReturns);

    return {
      totalReturn,
      monthlyReturn,
      weeklyReturn,
      winRate: totalBets > 0 ? Math.round((totalWins / totalBets) * 100) : 0,
      totalBets,
      sharpeRatio,
      maxDrawdown,
      streak,
      dailyReturns,
    };
  }

  private emptyStats(): PerformanceStats {
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

  private getRangeStart(now: Date, range: string): Date {
    switch (range) {
      case '7d': return new Date(now.getTime() - 7 * 86400000);
      case '30d': return new Date(now.getTime() - 30 * 86400000);
      case '90d': return new Date(now.getTime() - 90 * 86400000);
      default: return new Date(0); // 'all'
    }
  }

  private sumPnlAfter(dailyReturns: DailyReturn[], after: Date): number {
    const afterStr = after.toISOString().slice(0, 10);
    return Math.round(
      dailyReturns
        .filter(d => d.date >= afterStr)
        .reduce((sum, d) => sum + d.pnl, 0) * 100
    ) / 100;
  }

  private calculateSharpe(pnlValues: number[]): number {
    if (pnlValues.length < 2) return 0;
    const mean = pnlValues.reduce((a, b) => a + b, 0) / pnlValues.length;
    const variance = pnlValues.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (pnlValues.length - 1);
    const std = Math.sqrt(variance);
    if (std === 0) return 0;
    return Math.round((mean / std) * Math.sqrt(252) * 100) / 100; // Annualized
  }

  private calculateMaxDrawdown(dailyReturns: DailyReturn[]): number {
    let peak = 0;
    let maxDd = 0;
    for (const d of dailyReturns) {
      if (d.cumulative > peak) peak = d.cumulative;
      const dd = peak - d.cumulative;
      if (dd > maxDd) maxDd = dd;
    }
    return Math.round(maxDd * 100) / 100;
  }

  private calculateStreak(dailyReturns: DailyReturn[]): number {
    if (dailyReturns.length === 0) return 0;
    let streak = 0;
    for (let i = dailyReturns.length - 1; i >= 0; i--) {
      if (dailyReturns[i].pnl > 0) streak++;
      else if (dailyReturns[i].pnl < 0) { streak--; break; }
      else break;
    }
    // Return positive for win streak, negative for loss streak
    if (streak >= 0) return streak;
    // Count loss streak
    let lStreak = 0;
    for (let i = dailyReturns.length - 1; i >= 0; i--) {
      if (dailyReturns[i].pnl < 0) lStreak--;
      else break;
    }
    return lStreak;
  }
}
