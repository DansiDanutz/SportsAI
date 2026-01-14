import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenRouterService } from './openrouter.service';

interface MatchAnalysis {
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  sport: string;
  startTime: string;
  prediction: string;
  odds: number;
  confidence: number;
  analysis: {
    summary: string;
    factors: string[];
    riskLevel: 'low' | 'medium' | 'high';
    valueRating: number; // 1-5 stars
  };
  historicalData: {
    h2hHomeWins: number;
    h2hDraws: number;
    h2hAwayWins: number;
    homeFormLast5: string;
    awayFormLast5: string;
    homeGoalsAvg: number;
    awayGoalsAvg: number;
  };
}

export interface DailyTicket {
  id: string;
  name: string;
  targetOdds: number;
  actualOdds: number;
  matches: MatchAnalysis[];
  totalConfidence: number;
  createdAt: string;
  isPremium: boolean;
}

interface CustomTicketRequest {
  targetOdds: number;
  sportKey?: string;
  maxMatches?: number;
  riskLevel?: 'low' | 'medium' | 'high';
}

@Injectable()
export class DailyTipsService {
  private readonly logger = new Logger(DailyTipsService.name);

  constructor(
    private prisma: PrismaService,
    private openRouterService: OpenRouterService,
  ) {}

  async getDailyTickets(userId: string): Promise<DailyTicket[]> {
    // Get user's active configuration for sport preference
    const activeConfig = await this.prisma.aiConfiguration.findFirst({
      where: { userId, isActive: true },
    });

    const sportKey = activeConfig?.sportKey || 'soccer';

    // Get upcoming matches
    const events = await this.getUpcomingEvents(sportKey);

    // Generate analyzed matches
    const analyzedMatches = await this.analyzeMatches(events);

    // Create two standard tickets: odds ~2.0 and odds ~3.0
    const ticket2 = this.createTicket(analyzedMatches, 2.0, 'Daily Double', false);
    const ticket3 = this.createTicket(analyzedMatches, 3.0, 'Daily Triple', false);

    return [ticket2, ticket3].filter(t => t.matches.length > 0);
  }

  async getCustomTicket(userId: string, request: CustomTicketRequest): Promise<DailyTicket> {
    const { targetOdds, sportKey = 'soccer', maxMatches = 5, riskLevel = 'medium' } = request;

    // Get upcoming matches
    const events = await this.getUpcomingEvents(sportKey);

    // Generate analyzed matches with risk filter
    const analyzedMatches = await this.analyzeMatches(events, riskLevel);

    // Create custom ticket
    return this.createTicket(
      analyzedMatches.slice(0, maxMatches),
      targetOdds,
      `Custom ${targetOdds.toFixed(2)}x Ticket`,
      true
    );
  }

  private async getUpcomingEvents(sportKey: string) {
    return this.prisma.event.findMany({
      where: {
        sport: { key: sportKey },
        status: 'upcoming',
        startTimeUtc: {
          gte: new Date(),
          lte: new Date(Date.now() + 48 * 60 * 60 * 1000), // Next 48 hours
        },
      },
      include: {
        home: true,
        away: true,
        league: true,
        sport: true,
        oddsQuotes: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
      orderBy: { startTimeUtc: 'asc' },
      take: 20,
    });
  }

  private async analyzeMatches(events: any[], riskFilter?: string): Promise<MatchAnalysis[]> {
    return events.flatMap((event) => {
      const quotes = event.oddsQuotes || [];

      const candidates = [
        { key: 'home', label: 'Home Win', odds: quotes.find((q: any) => q.outcomeKey === 'home')?.odds },
        { key: 'draw', label: 'Draw', odds: quotes.find((q: any) => q.outcomeKey === 'draw')?.odds },
        { key: 'away', label: 'Away Win', odds: quotes.find((q: any) => q.outcomeKey === 'away')?.odds },
      ].filter((c) => typeof c.odds === 'number' && Number.isFinite(c.odds) && c.odds > 1.0) as Array<{ key: string; label: string; odds: number }>;

      if (candidates.length === 0) return [];

      const implied = candidates.map((c) => 1 / c.odds);
      const totalImplied = implied.reduce((a, b) => a + b, 0);

      // Pick the highest implied probability (lowest odds) as a conservative baseline.
      let bestIdx = 0;
      for (let i = 1; i < candidates.length; i++) {
        if (implied[i] > implied[bestIdx]) bestIdx = i;
      }

      const pick = candidates[bestIdx];
      const probability = totalImplied > 0 ? implied[bestIdx] / totalImplied : 0;
      const confidence = Math.max(50, Math.min(95, Math.round(probability * 100)));

      let riskLevel: 'low' | 'medium' | 'high' = 'medium';
      if (pick.odds <= 1.6 && confidence >= 75) riskLevel = 'low';
      if (pick.odds >= 2.5 || confidence < 65) riskLevel = 'high';

      if (riskFilter === 'low' && riskLevel !== 'low') return [];
      if (riskFilter === 'high' && riskLevel === 'low') {
        // allow, but keep it (high-risk filter is permissive)
      }

      const summary = `${pick.label} based on current market odds.`;

      const valueRating = Math.min(5, Math.max(1, Math.round(1 + confidence / 25)));

      return [
        {
          eventId: event.id,
          homeTeam: event.home?.name || 'TBD',
          awayTeam: event.away?.name || 'TBD',
          league: event.league?.name || 'Unknown League',
          sport: event.sport?.name || 'Sport',
          startTime: event.startTimeUtc.toISOString(),
          prediction: pick.label,
          odds: pick.odds,
          confidence,
          analysis: {
            summary,
            factors: [
              `Odds quotes available: ${quotes.length}`,
              `Implied probability: ${(probability * 100).toFixed(1)}%`,
            ],
            riskLevel,
            valueRating,
          },
          historicalData: {
            h2hHomeWins: 0,
            h2hDraws: 0,
            h2hAwayWins: 0,
            homeFormLast5: '',
            awayFormLast5: '',
            homeGoalsAvg: 0,
            awayGoalsAvg: 0,
          },
        },
      ];
    });
  }

  private createTicket(
    matches: MatchAnalysis[],
    targetOdds: number,
    name: string,
    isPremium: boolean
  ): DailyTicket {
    // Sort matches by confidence
    const sortedMatches = [...matches].sort((a, b) => b.confidence - a.confidence);

    // Select matches to reach target odds
    const selectedMatches: MatchAnalysis[] = [];
    let currentOdds = 1.0;

    for (const match of sortedMatches) {
      if (currentOdds >= targetOdds) break;

      // Only add if it doesn't exceed target too much
      const newOdds = currentOdds * match.odds;
      if (newOdds <= targetOdds * 1.5 || selectedMatches.length === 0) {
        selectedMatches.push(match);
        currentOdds = newOdds;
      }
    }

    // If we haven't reached target, adjust by adding more matches
    if (currentOdds < targetOdds * 0.8 && sortedMatches.length > selectedMatches.length) {
      for (const match of sortedMatches) {
        if (!selectedMatches.includes(match) && currentOdds < targetOdds) {
          selectedMatches.push(match);
          currentOdds *= match.odds;
          if (currentOdds >= targetOdds * 0.9) break;
        }
      }
    }

    // Calculate combined confidence (geometric mean adjusted)
    const totalConfidence = selectedMatches.length > 0
      ? Math.round(
          selectedMatches.reduce((acc, m) => acc * (m.confidence / 100), 1) ** (1 / selectedMatches.length) * 100
        )
      : 0;

    return {
      id: `ticket-${Date.now()}`,
      name,
      targetOdds,
      actualOdds: Math.round(currentOdds * 100) / 100,
      matches: selectedMatches,
      totalConfidence,
      createdAt: new Date().toISOString(),
      isPremium,
    };
  }

  private generateFormString(): string {
    return '';
  }

  private calculateFormScore(form: string): number {
    let score = 0;
    for (const char of form) {
      if (char === 'W') score += 3;
      else if (char === 'D') score += 1;
    }
    return score;
  }

  private generateAnalysisFactors(
    homeTeam: string,
    awayTeam: string,
    homeForm: string,
    awayForm: string,
    prediction: string
  ): string[] {
    const factors: string[] = [];

    const homeWins = (homeForm.match(/W/g) || []).length;
    const awayWins = (awayForm.match(/W/g) || []).length;

    factors.push(`${homeTeam} recent form: ${homeForm} (${homeWins} wins in last 5)`);
    factors.push(`${awayTeam} recent form: ${awayForm} (${awayWins} wins in last 5)`);

    if (prediction === 'Home Win') {
      factors.push(`Home advantage: ${homeTeam} performs strongly at home`);
      if (homeWins > awayWins) {
        factors.push(`Form advantage: ${homeTeam} in better form than ${awayTeam}`);
      }
    } else if (prediction === 'Away Win') {
      factors.push(`${awayTeam} has strong away record this season`);
      if (awayWins > homeWins) {
        factors.push(`Form advantage: ${awayTeam} in better form than ${homeTeam}`);
      }
    } else {
      factors.push('Evenly matched teams based on recent performances');
      factors.push('Historical head-to-head suggests competitive matches');
    }

    // Add a statistical factor
    factors.push(`Market odds analysis shows value in ${prediction.toLowerCase()} selection`);

    return factors;
  }

  private generateSummary(homeTeam: string, awayTeam: string, prediction: string, confidence: number): string {
    const confidenceLevel = confidence >= 80 ? 'high' : confidence >= 65 ? 'moderate' : 'cautious';

    if (prediction === 'Home Win') {
      return `Our AI analysis suggests ${homeTeam} has a ${confidenceLevel} chance of victory at home. Based on recent form, historical data, and current odds value, this represents a solid betting opportunity.`;
    } else if (prediction === 'Away Win') {
      return `${awayTeam} appears to have the edge in this matchup despite playing away. Our analysis indicates ${confidenceLevel} confidence in an away victory based on form and value assessment.`;
    } else {
      return `This match between ${homeTeam} and ${awayTeam} shows signs of being evenly contested. Draw odds offer value based on our comprehensive analysis of both teams.`;
    }
  }
}
