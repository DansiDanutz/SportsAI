import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TicketGeneratorService {
  private readonly logger = new Logger(TicketGeneratorService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generates a "Winning Ticket" with a target total odds.
   * e.g. 2X or 3X odds tickets.
   */
  async generateDailyTicket(targetOdds: 2 | 3) {
    this.logger.log(`Generating daily ${targetOdds}X odds ticket...`);
    
    // 1. Find high-confidence picks (odds between 1.3 and 1.7)
    const picks = await this.prisma.oddsQuote.findMany({
      where: {
        odds: { gte: 1.3, lte: 1.8 },
        event: { status: 'upcoming' },
      },
      include: { event: { include: { home: true, away: true } } },
      take: 20,
    });

    const ticket = [];
    let currentTotalOdds = 1.0;

    for (const pick of picks) {
      if (currentTotalOdds >= targetOdds) break;
      
      // Ensure we don't pick the same event twice
      if (ticket.find(t => t.eventId === pick.eventId)) continue;

      ticket.push({
        eventId: pick.eventId,
        match: `${pick.event.home.name} vs ${pick.event.away.name}`,
        pick: pick.outcomeKey,
        odds: pick.odds,
      });
      currentTotalOdds *= pick.odds;
    }

    return {
      title: `${targetOdds}X Daily Winning Ticket`,
      totalOdds: parseFloat(currentTotalOdds.toFixed(2)),
      picks: ticket,
    };
  }
}
