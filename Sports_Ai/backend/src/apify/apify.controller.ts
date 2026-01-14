import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard, RequireAdmin } from '../auth/admin.guard';
import { ApifyMatchProviderRequest, ApifyService } from './apify.service';

type LeagueType = 'NFL' | 'NBA' | 'NHL' | 'UCL' | 'UFC' | 'College-Football' | 'College-Basketball';

@Controller('v1/apify')
@UseGuards(JwtAuthGuard)
export class ApifyController {
  constructor(private apifyService: ApifyService) {}

  /**
   * Get Apify integration status
   * Anyone can check if Apify is configured
   */
  @Get('status')
  async getStatus() {
    return this.apifyService.getStatus();
  }

  /**
   * Fetch live odds from Apify
   * Available to all authenticated users
   */
  @Get('odds')
  async fetchOdds(
    @Query('league') league: LeagueType = 'NBA',
    @Query('bookmakers') bookmakers?: string,
    @Query('date') date?: string,
  ) {
    const odds = await this.apifyService.fetchOdds({
      league,
      bookmakers: bookmakers?.split(','),
      date,
    });

    return {
      success: true,
      league,
      count: odds.length,
      data: odds,
      fetchedAt: new Date().toISOString(),
      source: this.apifyService.isConfigured() ? 'apify' : 'unconfigured',
    };
  }

  /**
   * Fetch match data from SofaScore
   */
  @Post('matches')
  @HttpCode(HttpStatus.OK)
  async fetchMatches(
    @Body()
    body: { urls: string[]; sport?: string; provider?: ApifyMatchProviderRequest },
  ) {
    const result = await this.apifyService.fetchMatches({
      urls: body.urls,
      sport: body.sport,
      provider: body.provider,
    });

    return {
      success: true,
      provider: result.provider,
      count: result.data.length,
      data: result.data,
      fetchedAt: new Date().toISOString(),
      source: this.apifyService.isConfigured() ? 'apify' : 'unconfigured',
    };
  }

  /**
   * Fetch aggregated bet predictions
   */
  @Get('predictions')
  async fetchPredictions() {
    const predictions = await this.apifyService.fetchPredictions();

    return {
      success: true,
      count: predictions.length,
      data: predictions,
      fetchedAt: new Date().toISOString(),
      source: this.apifyService.isConfigured() ? 'apify' : 'unconfigured',
    };
  }

  /**
   * Get Apify run history (Admin only)
   */
  @Get('runs')
  @UseGuards(AdminGuard)
  @RequireAdmin()
  async getRunHistory() {
    const runs = await this.apifyService.getRunHistory();

    return {
      success: true,
      runs,
    };
  }

  /**
   * Trigger odds sync to database (Admin only)
   */
  @Post('sync/odds')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @RequireAdmin()
  async syncOdds(@Body() body: { league: LeagueType }) {
    // First fetch odds
    const odds = await this.apifyService.fetchOdds({
      league: body.league,
    });

    // Then sync to database
    const syncResult = await this.apifyService.syncOddsToDatabase(odds);

    return {
      success: true,
      message: 'Odds sync completed',
      league: body.league,
      fetched: odds.length,
      ...syncResult,
    };
  }

  /**
   * Get available leagues for odds fetching
   */
  @Get('leagues')
  getAvailableLeagues() {
    return {
      leagues: [
        { key: 'NFL', name: 'NFL - National Football League', sport: 'American Football' },
        { key: 'NBA', name: 'NBA - National Basketball Association', sport: 'Basketball' },
        { key: 'NHL', name: 'NHL - National Hockey League', sport: 'Ice Hockey' },
        { key: 'UCL', name: 'UEFA Champions League', sport: 'Soccer' },
        { key: 'UFC', name: 'Ultimate Fighting Championship', sport: 'MMA' },
        { key: 'College-Football', name: 'NCAA Football', sport: 'American Football' },
        { key: 'College-Basketball', name: 'NCAA Basketball', sport: 'Basketball' },
      ],
      bookmakers: [
        { key: 'BetMGM', name: 'BetMGM' },
        { key: 'Caesars', name: 'Caesars' },
        { key: 'DraftKings', name: 'DraftKings' },
        { key: 'FanDuel', name: 'FanDuel' },
        { key: 'Bet365', name: 'Bet365' },
      ],
    };
  }
}
