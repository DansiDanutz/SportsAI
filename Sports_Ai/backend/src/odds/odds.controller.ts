import { Controller, Get, Post, UseGuards, ForbiddenException, Request, Query, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { OddsService } from './odds.service';
import { OddsScraperService } from './odds-scraper.service';

@Controller('v1/odds')
@UseGuards(JwtAuthGuard)
export class OddsController {
  constructor(
    private usersService: UsersService,
    private oddsService: OddsService,
    private oddsScraperService: OddsScraperService,
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

  @Get('live')
  async getLiveOdds(@Query('sport') sport?: string) {
    try {
      const liveOdds = await this.oddsScraperService.getLiveOddsFromFile();
      
      const filteredOdds = sport 
        ? liveOdds.filter(odds => odds.sport.toLowerCase().includes(sport.toLowerCase()))
        : liveOdds;
      
      return {
        status: 'success',
        data: filteredOdds,
        meta: {
          count: filteredOdds.length,
          lastUpdated: liveOdds.length > 0 ? liveOdds[0].lastUpdated : null
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  @Post('refresh')
  async refreshOdds() {
    try {
      const refreshedOdds = await this.oddsScraperService.forceRefresh();
      
      return {
        status: 'success',
        message: 'Odds refreshed successfully',
        data: {
          count: refreshedOdds.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  @Get('best/:eventId')
  async getBestOddsForEvent(@Param('eventId') eventId: string) {
    try {
      const bestOdds = await this.oddsScraperService.getBestOddsForEvent(eventId);
      
      return {
        status: 'success',
        data: bestOdds
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  @Get('scraper/health')
  async getScraperHealth() {
    try {
      const health = await this.oddsScraperService.healthCheck();
      
      return {
        status: 'success',
        data: health
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }
}
