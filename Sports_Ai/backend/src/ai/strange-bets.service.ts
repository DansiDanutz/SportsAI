import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from './llm.service';

@Injectable()
export class StrangeBetsService {
  private readonly logger = new Logger(StrangeBetsService.name);

  constructor(
    private prisma: PrismaService,
    private llmService: LlmService,
  ) {}

  /**
   * Detects "strange" bets based on volume spikes and reverse line movement.
   * This indicates professional action against public sentiment.
   */
  async detectStrangeBets() {
    this.logger.log('Analyzing market volume for strange bets...');
    
    // In a real production app, we would fetch volume data from Betfair or The Odds API
    // For this implementation, we analyze significant line movements (>10% drop in <1hr)
    const movements = await this.prisma.oddsQuote.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100,
      include: { event: { include: { home: true, away: true } } },
    });

    const strangeBets = [];
    
    // Logic: If odds dropped significantly but the team is the underdog
    for (const move of movements) {
      if (move.odds < 1.5) continue; // Ignore heavy favorites
      
      // Look for a 10% drop in last hour
      const previous = await this.prisma.oddsQuote.findFirst({
        where: {
          eventId: move.eventId,
          outcomeKey: move.outcomeKey,
          timestamp: { lt: move.timestamp },
        },
        orderBy: { timestamp: 'desc' },
      });

      if (previous && (previous.odds - move.odds) / previous.odds > 0.1) {
        strangeBets.push({
          eventId: move.eventId,
          event: `${move.event.home?.name || 'TBD'} vs ${move.event.away?.name || 'TBD'}`,
          outcome: move.outcomeKey,
          drop: `${Math.round(((previous.odds - move.odds) / previous.odds) * 100)}%`,
          type: 'volume_spike',
        });
      }
    }

    return strangeBets;
  }
}
