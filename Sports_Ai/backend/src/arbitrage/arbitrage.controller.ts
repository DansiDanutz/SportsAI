import { Controller, Get, Post, Param, UseGuards, Request, Query, Header, Ip, Inject, forwardRef } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { ArbitrageService } from './arbitrage.service';
import { CreditsService } from '../credits/credits.service';
import { LanguageService } from '../ai/language.service';

@Controller('v1/arbitrage')
@UseGuards(JwtAuthGuard)
export class ArbitrageController {
  constructor(
    private usersService: UsersService,
    private arbitrageService: ArbitrageService,
    private creditsService: CreditsService,
    @Inject(forwardRef(() => LanguageService))
    private languageService: LanguageService,
  ) {}

  @Post('opportunities/:id/unlock')
  async unlockOpportunity(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    // Standard cost is 10 credits
    return this.creditsService.unlockOpportunity(req.user.id, id, 10);
  }

  @Get('opportunities')
  @Header('Cache-Control', 'private, max-age=15, stale-while-revalidate=30')
  async getOpportunities(
    @Request() req: any,
    @Ip() ipAddress: string,
    @Query('fullDetails') fullDetails?: string,
  ) {
    const user = await this.usersService.findById(req.user.id);
    const isPremium = user?.subscriptionTier === 'premium';
    const languageCode = await this.getUserLanguage(req.user.id, ipAddress);
    const unlockedIds = await this.creditsService.getUnlockedOpportunities(req.user.id);

    const dbOpportunities = await this.arbitrageService.findOpportunities();
    
    // If database is empty, use the legacy mock data structure for demo purposes
    const rawOpportunities = dbOpportunities.length > 0 
      ? dbOpportunities.map(o => ({
          id: o.id,
          sport: o.event?.sport?.name || 'Unknown',
          event: `${o.event?.home?.name} vs ${o.event?.away?.name}`,
          league: o.event?.league?.name || 'Unknown',
          market: o.market?.name || 'Unknown',
          profit: o.profitMargin,
          confidence: o.confidenceScore,
          timeLeft: '3h 20m', // Placeholder
          legs: JSON.parse(o.bookmakerLegs as string),
          isWinningTip: o.isWinningTip || o.confidenceScore >= 0.95,
          creditCost: o.creditCost || 10,
        }))
      : [
          {
            id: '550e8400-e29b-41d4-a716-446655440000', // Mock UUID
            sport: 'Soccer',
            event: 'Real Madrid vs Barcelona',
            league: 'La Liga',
            market: 'Match Winner (1X2)',
            profit: 2.8,
            confidence: 0.96,
            timeLeft: '3h 20m',
            isWinningTip: true,
            creditCost: 10,
            legs: [
              { outcome: 'Real Madrid', odds: 2.45, bookmaker: 'Bet365' },
              { outcome: 'Draw', odds: 3.60, bookmaker: 'Betano' },
              { outcome: 'Barcelona', odds: 2.90, bookmaker: 'Unibet' },
            ],
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440001', // Mock UUID
            sport: 'Basketball',
            event: 'Lakers vs Warriors',
            league: 'NBA',
            market: 'Moneyline',
            profit: 1.9,
            confidence: 0.92,
            timeLeft: '5h 45m',
            isWinningTip: false,
            creditCost: 10,
            legs: [
              { outcome: 'Lakers', odds: 2.15, bookmaker: 'Stake' },
              { outcome: 'Warriors', odds: 1.95, bookmaker: 'William Hill' },
            ],
          },
        ];

    // Map opportunities to hide legs for locked Winning Tips
    const opportunities = await Promise.all(rawOpportunities.map(async o => {
      const isUnlocked = unlockedIds.includes(o.id);
      // Even premium users need to unlock Winning Tips (confidence >= 0.95)
      const needsUnlock = o.isWinningTip && !isUnlocked;
      
      let aiInsight = undefined;
      if (isUnlocked || !o.isWinningTip) {
        // Only generate AI insight for unlocked or low-confidence arbs if requested
        // For demo, we'll provide a default if not already generated
        aiInsight = "Market inefficiency detected between " + o.legs.map(l => l.bookmaker).join(' and ') + ".";
      }

      return {
        ...o,
        legs: needsUnlock ? [] : o.legs,
        isUnlocked,
        aiInsight,
      };
    }));

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

  private async getUserLanguage(userId: string, ipAddress: string): Promise<string> {
    const user = await this.usersService.findById(userId);
    const preferences = JSON.parse(user?.preferences || '{}');
    if (preferences.display?.language) return preferences.display.language;
    const ipLanguage = await this.languageService.getLanguageFromIP(ipAddress);
    return ipLanguage.code;
  }
}
