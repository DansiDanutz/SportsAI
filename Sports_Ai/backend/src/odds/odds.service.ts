import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OddsService {
  private readonly logger = new Logger(OddsService.name);

  constructor(private prisma: PrismaService) {}

  async getBestOdds(eventId: string) {
    // This would typically involve finding the max odds for each outcome
    // across all bookmakers for a given event and market.
    return this.prisma.oddsQuote.findMany({
      where: { eventId },
      include: {
        bookmaker: true,
        market: true,
      },
      orderBy: {
        odds: 'desc',
      },
    });
  }

  async getOddsHistory(eventId: string, marketId?: string) {
    return this.prisma.oddsQuote.findMany({
      where: {
        eventId,
        ...(marketId && { marketId }),
      },
      include: {
        bookmaker: true,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
  }
}
