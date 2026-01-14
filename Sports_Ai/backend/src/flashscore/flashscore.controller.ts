import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FlashscoreService } from './flashscore.service';

@Controller('v1/flashscore')
@UseGuards(JwtAuthGuard)
export class FlashscoreController {
  constructor(private flashscoreService: FlashscoreService) {}

  /**
   * Scrape match info from Flashscore match URLs.
   *
   * NOTE: This is intended as a fallback data source. Use responsibly.
   */
  @Post('matches')
  @HttpCode(HttpStatus.OK)
  async fetchMatches(@Body() body: { urls: string[] }) {
    const { matches, errors } = await this.flashscoreService.fetchMatches(body.urls);

    return {
      success: errors.length === 0,
      count: matches.length,
      matches,
      errors,
      fetchedAt: new Date().toISOString(),
      source: 'flashscore',
    };
  }
}

