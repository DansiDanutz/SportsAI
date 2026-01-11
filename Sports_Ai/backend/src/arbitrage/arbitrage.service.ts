import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ArbitrageService {
  private readonly logger = new Logger(ArbitrageService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Calculates the arbitrage percentage for a set of odds.
   * Formula: (1 / Odds_A) + (1 / Odds_B) + ... + (1 / Odds_N) - 1
   * If the result is negative, an arbitrage opportunity exists.
   */
  calculateArbitragePercentage(odds: number[]): number {
    const sumInvOdds = odds.reduce((sum, o) => sum + (1 / o), 0);
    return (sumInvOdds - 1) * 100;
  }

  /**
   * Calculates a consolidated confidence score (0-1) based on weighted factors.
   * Factors: Profit (35%), Bookmaker Trust (20%), Odds Stability (20%), Liquidity (15%), Confidence (10%)
   * Above 0.95 = Winning Tip
   */
  calculateConfidenceScore(factors: {
    profitMargin: number;
    bookmakerTrust: number;
    oddsStability: number;
    marketLiquidity: number;
    baseConfidence: number;
  }): number {
    const score =
      (factors.profitMargin * 0.35) +
      (factors.bookmakerTrust * 0.20) +
      (factors.oddsStability * 0.20) +
      (factors.marketLiquidity * 0.15) +
      (factors.baseConfidence * 0.10);
    
    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Finds arbitrage opportunities across all events and markets.
   * In a real system, this would be triggered by odds updates.
   * For now, we'll fetch from the database.
   */
  async findOpportunities() {
    return this.prisma.arbitrageOpportunity.findMany({
      include: {
        event: {
          include: {
            home: true,
            away: true,
            league: true,
          },
        },
        market: true,
      },
      orderBy: {
        detectedAt: 'desc',
      },
    });
  }

  async findById(id: string) {
    return this.prisma.arbitrageOpportunity.findUnique({
      where: { id },
      include: {
        event: {
          include: {
            home: true,
            away: true,
            league: true,
          },
        },
        market: true,
      },
    });
  }
}
