import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar?: string;
  roi: number;
  winRate: number;
  totalBets: number;
  streak: number;
  badge: 'bronze' | 'silver' | 'gold' | 'diamond' | 'legend';
  monthlyPnl: number;
  isCurrentUser?: boolean;
}

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  async getLeaderboard(
    period: string,
    category: string,
    currentUserId?: string,
  ): Promise<LeaderboardEntry[]> {
    const since = this.getPeriodDate(period);

    // Aggregate bet slip analyses per user
    const userStats = await this.prisma.betSlipAnalysis.groupBy({
      by: ['userId'],
      where: {
        userId: { not: null },
        createdAt: since ? { gte: since } : undefined,
      },
      _count: { id: true },
      _avg: { expectedValue: true, totalOdds: true },
      _sum: { totalStake: true, potentialPayout: true },
    });

    if (userStats.length === 0) {
      return [];
    }

    // Fetch usernames
    const userIds = userStats
      .map((s) => s.userId)
      .filter((id): id is string => id !== null);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, profilePictureUrl: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Build entries
    const entries: LeaderboardEntry[] = userStats
      .filter((s) => s.userId)
      .map((s) => {
        const user = userMap.get(s.userId!);
        const totalBets = s._count.id;
        const avgEv = s._avg.expectedValue ?? 0;
        const totalStake = s._sum.totalStake ?? 1;
        const totalPayout = s._sum.potentialPayout ?? 0;
        const roi = totalStake > 0 ? ((totalPayout - totalStake) / totalStake) * 100 : 0;
        const winRate = Math.min(95, Math.max(20, 50 + avgEv * 10));
        const monthlyPnl = totalPayout - totalStake;

        return {
          rank: 0,
          username: user?.email?.split('@')[0] ?? 'anonymous',
          avatar: user?.profilePictureUrl ?? undefined,
          roi: Math.round(roi * 100) / 100,
          winRate: Math.round(winRate * 100) / 100,
          totalBets,
          streak: Math.floor(Math.random() * 8) + 1,
          badge: this.getBadge(totalBets, roi),
          monthlyPnl: Math.round(monthlyPnl * 100) / 100,
          isCurrentUser: s.userId === currentUserId,
        };
      });

    // Sort by ROI descending
    entries.sort((a, b) => b.roi - a.roi);
    entries.forEach((e, i) => (e.rank = i + 1));

    return entries;
  }

  private getBadge(
    totalBets: number,
    roi: number,
  ): 'bronze' | 'silver' | 'gold' | 'diamond' | 'legend' {
    if (totalBets >= 100 && roi >= 20) return 'legend';
    if (totalBets >= 50 && roi >= 10) return 'diamond';
    if (totalBets >= 25 && roi >= 5) return 'gold';
    if (totalBets >= 10) return 'silver';
    return 'bronze';
  }

  private getPeriodDate(period: string): Date | null {
    const now = new Date();
    switch (period) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return null;
    }
  }
}
