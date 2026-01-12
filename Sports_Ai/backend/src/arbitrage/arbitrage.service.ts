import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenRouterService } from '../ai/openrouter.service';

@Injectable()
export class ArbitrageService {
  private readonly logger = new Logger(ArbitrageService.name);

  constructor(
    private prisma: PrismaService,
    private openRouter: OpenRouterService,
  ) {}

  /**
   * Calculates the arbitrage percentage for a set of odds.
   */
  calculateArbitragePercentage(odds: number[]): number {
    const sumInvOdds = odds.reduce((sum, o) => sum + (1 / o), 0);
    return (sumInvOdds - 1) * 100;
  }

  /**
   * Generates an AI explanation for an arbitrage opportunity.
   */
  async generateAiExplanation(opportunityId: string) {
    const arb = await this.prisma.arbitrageOpportunity.findUnique({
      where: { id: opportunityId },
      include: {
        event: { include: { home: true, away: true, league: true, sport: true } },
      },
    });

    if (!arb) return null;

    const prompt = `Explain why this sports arbitrage opportunity exists and what the risk factor is:
    Event: ${arb.event.home.name} vs ${arb.event.away.name}
    Sport: ${arb.event.sport.name}
    League: ${arb.event.league.name}
    Profit Margin: ${arb.profitMargin}%
    Confidence: ${arb.confidenceScore * 100}%
    
    Provide a professional 2-sentence explanation.`;

    const advice = await this.openRouter.generateAdvice(
      { sportKey: arb.event.sport.key, countries: [], leagues: [], markets: [] },
      [{
        homeTeam: arb.event.home.name,
        awayTeam: arb.event.away.name,
        league: arb.event.league.name,
        startTime: arb.event.startTimeUtc.toISOString(),
        odds: { home: 2.0, away: 2.0 }, // Dummy for the service method structure
      }]
    );

    return advice[0]?.content || "This arbitrage opportunity arises from market inefficiency between bookmakers.";
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
            sport: true,
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
            sport: true,
          },
        },
        market: true,
      },
    });
  }
}
