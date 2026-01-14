import { Controller, Get, UseGuards, Request, Query, Header } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { ArbitrageService } from './arbitrage.service';
import { CreditsService } from '../credits/credits.service';

@Controller('v1/arbitrage')
@UseGuards(JwtAuthGuard)
export class ArbitrageController {
  constructor(
    private usersService: UsersService,
    private arbitrageService: ArbitrageService,
    private creditsService: CreditsService,
  ) {}

  @Get('opportunities')
  @Header('Cache-Control', 'private, max-age=15, stale-while-revalidate=30')
  async getOpportunities(
    @Request() req: any,
    @Query('fullDetails') fullDetails?: string,
  ) {
    const user = await this.usersService.findById(req.user.id);
    const isPremium = user?.subscriptionTier === 'premium';
    const unlockedIds = await this.creditsService.getUnlockedOpportunities(req.user.id);

    const dbOpportunities = await this.arbitrageService.findOpportunities();
    
    const rawOpportunities = dbOpportunities.map(o => ({
      id: o.id,
      sport: o.event?.sport?.name || 'Unknown',
      event: `${o.event?.home?.name} vs ${o.event?.away?.name}`,
      league: o.event?.league?.name || 'Unknown',
      market: o.market?.name || 'Unknown',
      profit: o.profitMargin,
      confidence: o.confidenceScore,
      legs: JSON.parse(o.bookmakerLegs as string),
      isWinningTip: o.isWinningTip || o.confidenceScore >= 0.95,
      creditCost: o.creditCost || 10,
    }));

    // Map opportunities to hide legs for locked Winning Tips
    const opportunities = rawOpportunities.map(o => {
      const isUnlocked = unlockedIds.includes(o.id);
      // Even premium users need to unlock Winning Tips (confidence >= 0.95)
      const needsUnlock = o.isWinningTip && !isUnlocked;
      
      const aiInsight = undefined;

      return {
        ...o,
        legs: needsUnlock ? [] : o.legs,
        isUnlocked,
      };
    });

    // If free user requests full details, return tier-restricted response
    if (fullDetails === 'true' && !isPremium) {
      return {
        tier: 'free',
        tierRestricted: true,
        message: 'Full details require Premium subscription',
        count: opportunities.length,
        summary: {
          totalOpportunities: opportunities.length,
          bestROI: Math.max(...opportunities.map((o) => o.profit)),
          avgConfidence:
            opportunities.reduce((a, b) => a + b.confidence, 0) /
            opportunities.length,
        },
        opportunities: [], // No details for free users
      };
    }

    // Premium users or no full details requested
    if (isPremium) {
      return {
        tier: 'premium',
        tierRestricted: false,
        opportunities: opportunities,
        total: opportunities.length,
      };
    }

    // Free users without full details flag - return count only
    return {
      tier: 'free',
      tierRestricted: true,
      count: opportunities.length,
      summary: {
        totalOpportunities: opportunities.length,
        bestROI: Math.max(...opportunities.map((o) => o.profit)),
        avgConfidence:
          opportunities.reduce((a, b) => a + b.confidence, 0) /
          opportunities.length,
      },
      message: 'Upgrade to Premium for full arbitrage details',
    };
  }
}
