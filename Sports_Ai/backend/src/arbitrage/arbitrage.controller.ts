import { Controller, Get, UseGuards, Request, Query, Header } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { ArbitrageService } from './arbitrage.service';

@Controller('v1/arbitrage')
@UseGuards(JwtAuthGuard)
export class ArbitrageController {
  constructor(
    private usersService: UsersService,
    private arbitrageService: ArbitrageService,
  ) {}

  @Get('opportunities')
  @Header('Cache-Control', 'private, max-age=15, stale-while-revalidate=30')
  async getOpportunities(
    @Request() req: any,
    @Query('fullDetails') fullDetails?: string,
  ) {
    const user = await this.usersService.findById(req.user.id);
    const isPremium = user?.subscriptionTier === 'premium';

    const dbOpportunities = await this.arbitrageService.findOpportunities();
    
    // If database is empty, use the legacy mock data structure for demo purposes
    const opportunities = dbOpportunities.length > 0 
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
        }))
      : [
          {
            id: '1',
            sport: 'Soccer',
            event: 'Real Madrid vs Barcelona',
            league: 'La Liga',
            market: 'Match Winner (1X2)',
            profit: 2.8,
            confidence: 0.96,
            timeLeft: '3h 20m',
            legs: [
              { outcome: 'Real Madrid', odds: 2.45, bookmaker: 'Bet365' },
              { outcome: 'Draw', odds: 3.60, bookmaker: 'Betano' },
              { outcome: 'Barcelona', odds: 2.90, bookmaker: 'Unibet' },
            ],
          },
          {
            id: '2',
            sport: 'Basketball',
            event: 'Lakers vs Warriors',
            league: 'NBA',
            market: 'Moneyline',
            profit: 1.9,
            confidence: 0.92,
            timeLeft: '5h 45m',
            legs: [
              { outcome: 'Lakers', odds: 2.15, bookmaker: 'Stake' },
              { outcome: 'Warriors', odds: 1.95, bookmaker: 'William Hill' },
            ],
          },
        ];

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
