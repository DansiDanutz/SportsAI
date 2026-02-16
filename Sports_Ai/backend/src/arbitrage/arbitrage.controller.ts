import { Controller, Get, UseGuards, Request, Query, Header } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { ArbitrageService } from './arbitrage.service';
import { CreditsService } from '../credits/credits.service';

@Controller('v1/arbitrage')
export class ArbitrageController {
  constructor(
    private usersService: UsersService,
    private arbitrageService: ArbitrageService,
    private creditsService: CreditsService,
  ) {}

  /**
   * Public endpoint — returns the latest 10 opportunities with limited info.
   * Used by the LiveOddsTicker on the landing/home page (no auth required).
   * Cached for 30s to reduce DB load.
   */
  @Get('recent')
  @Header('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')
  async getRecentOpportunities() {
    const dbOpps = await this.arbitrageService.findOpportunities();
    const recent = dbOpps.slice(0, 10);

    const SPORT_ICONS: Record<string, string> = {
      soccer: '⚽', football: '🏈', basketball: '🏀', tennis: '🎾',
      baseball: '⚾', hockey: '🏒', mma: '🥊', boxing: '🥊',
      cricket: '🏏', rugby: '🏉', golf: '⛳', default: '🏆',
    };

    return recent.map((o) => {
      const sportName = o.event?.sport?.name || 'Unknown';
      const sportKey = sportName.toLowerCase();
      const sportIcon = SPORT_ICONS[sportKey] || SPORT_ICONS.default;

      let bookmakers: string[] = [];
      try {
        const legs = typeof o.bookmakerLegs === 'string'
          ? JSON.parse(o.bookmakerLegs)
          : o.bookmakerLegs || [];
        bookmakers = legs.map((l: any) => l.bookmaker || l.sportsbook || 'Unknown').slice(0, 2);
      } catch { /* ignore */ }

      const ageMs = Date.now() - new Date(o.detectedAt).getTime();
      const ageSec = Math.floor(ageMs / 1000);
      const timeAgo = ageSec < 60 ? `${ageSec}s ago` : ageSec < 3600 ? `${Math.floor(ageSec / 60)}m ago` : `${Math.floor(ageSec / 3600)}h ago`;

      return {
        id: o.id,
        sport: sportName,
        sportIcon,
        match: `${o.event?.home?.name || '?'} vs ${o.event?.away?.name || '?'}`,
        bookmaker1: bookmakers[0] || 'Bookmaker A',
        bookmaker2: bookmakers[1] || 'Bookmaker B',
        profit: +o.profitMargin.toFixed(1),
        confidence: o.confidenceScore,
        timeAgo,
        type: o.confidenceScore >= 0.95 ? 'prediction' : o.profitMargin >= 2 ? 'arbitrage' : 'value',
      };
    });
  }

  @Get('opportunities')
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'private, max-age=15, stale-while-revalidate=30')
  async getOpportunities(
    @Request() req: any,
    @Query('fullDetails') fullDetails?: string,
  ) {
    try {
      if (!req.user?.id) {
        throw new Error('User authentication required');
      }

      const user = await this.usersService.findById(req.user.id);
      const isPremium = user?.subscriptionTier === 'premium';
      const unlockedIds = await this.creditsService.getUnlockedOpportunities(req.user.id);

      const dbOpportunities = await this.arbitrageService.findOpportunities();
      
      const rawOpportunities = dbOpportunities.map(o => {
        try {
          const legs = typeof o.bookmakerLegs === 'string' 
            ? JSON.parse(o.bookmakerLegs) 
            : o.bookmakerLegs || [];
          
          return {
            id: o.id,
            sport: o.event?.sport?.name || 'Unknown',
            event: `${o.event?.home?.name} vs ${o.event?.away?.name}`,
            league: o.event?.league?.name || 'Unknown',
            market: o.market?.name || 'Unknown',
            profit: o.profitMargin,
            confidence: o.confidenceScore,
            legs,
            isWinningTip: o.isWinningTip || o.confidenceScore >= 0.95,
            creditCost: o.creditCost || 10,
          };
        } catch (parseError) {
          console.error('Failed to parse opportunity legs:', parseError);
          return null;
        }
      }).filter(Boolean);

      // Map opportunities to hide legs for locked Winning Tips
      const opportunities = rawOpportunities.map(o => {
        const isUnlocked = unlockedIds.includes(o.id);
        // Even premium users need to unlock Winning Tips (confidence >= 0.95)
        const needsUnlock = o.isWinningTip && !isUnlocked;

        return {
          ...o,
          legs: needsUnlock ? [] : o.legs,
          isUnlocked,
        };
      });

      // Calculate summary stats safely
      const totalOpportunities = opportunities.length;
      const bestROI = totalOpportunities > 0 
        ? Math.max(...opportunities.map((o) => o.profit)) 
        : 0;
      const avgConfidence = totalOpportunities > 0
        ? opportunities.reduce((a, b) => a + b.confidence, 0) / totalOpportunities
        : 0;

      const summary = {
        totalOpportunities,
        bestROI,
        avgConfidence,
      };

      // If free user requests full details, return tier-restricted response
      if (fullDetails === 'true' && !isPremium) {
        return {
          success: true,
          tier: 'free',
          tierRestricted: true,
          message: 'Full details require Premium subscription',
          count: totalOpportunities,
          summary,
          opportunities: [], // No details for free users
        };
      }

      // Premium users or no full details requested
      if (isPremium) {
        return {
          success: true,
          tier: 'premium',
          tierRestricted: false,
          opportunities,
          total: totalOpportunities,
        };
      }

      // Free users without full details flag - return count only
      return {
        success: true,
        tier: 'free',
        tierRestricted: true,
        count: totalOpportunities,
        summary,
        message: 'Upgrade to Premium for full arbitrage details',
      };
    } catch (error) {
      console.error('Error fetching arbitrage opportunities:', error);
      throw new Error(`Failed to fetch arbitrage opportunities: ${error.message}`);
    }
  }
}
