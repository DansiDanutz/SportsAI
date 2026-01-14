import { Controller, Get, UseGuards, ForbiddenException, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { OddsService } from './odds.service';

@Controller('v1/odds')
@UseGuards(JwtAuthGuard)
export class OddsController {
  constructor(
    private usersService: UsersService,
    private oddsService: OddsService,
  ) {}

  @Get('history')
  async getOddsHistory(
    @Request() req: any,
    @Query('eventId') eventId?: string,
    @Query('marketId') marketId?: string,
  ) {
    const user = await this.usersService.findById(req.user.id);
    const isPremium = user?.subscriptionTier === 'premium';

    if (!isPremium) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Line movement history requires Premium subscription',
        requiredTier: 'premium',
        currentTier: user?.subscriptionTier || 'free',
      });
    }

    if (eventId) {
      const dbHistory = await this.oddsService.getOddsHistory(eventId, marketId);
      if (dbHistory.length > 0) {
        return {
          history: [
            {
              eventId: eventId,
              event: 'Event Detail', // Should be fetched from event service
              market: 'Market Detail', // Should be fetched from market service
              movements: dbHistory.map(h => ({
                timestamp: h.timestamp,
                bookmaker: h.bookmaker.brand,
                outcome: h.outcomeKey,
                odds: h.odds,
              })),
            },
          ],
          total: dbHistory.length,
        };
      }
    }

    return {
      history: [],
      total: 0,
    };
  }
}
