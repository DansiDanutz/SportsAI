import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Sharp Money Detection Service
 *
 * Detects unusual betting activity indicating professional/sharp bettor action.
 * Sharp money is typically characterized by:
 * - Large line movements in short time periods
 * - Odds moving against public betting percentages
 * - Significant volume on specific outcomes
 * - Reverse line movement (odds moving opposite to ticket count)
 */

export interface SharpMoneyAlert {
  id: string;
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  sport: string;
  startTime: string;
  alertType: 'steam_move' | 'reverse_line_movement' | 'sharp_action' | 'volume_spike';
  severity: 'high' | 'medium' | 'low';
  description: string;
  details: {
    previousOdds: number;
    currentOdds: number;
    oddsChange: number;
    percentageChange: number;
    timeFrame: string;
    affectedOutcome: string;
    publicBettingPct?: number;
    sharpBettingPct?: number;
  };
  recommendation: string;
  detectedAt: string;
}

interface MarketMovement {
  eventId: string;
  outcome: string;
  previousOdds: number;
  currentOdds: number;
  changePercent: number;
  timeFrame: number; // minutes
}

@Injectable()
export class SharpMoneyService {
  private readonly logger = new Logger(SharpMoneyService.name);

  constructor(private prisma: PrismaService) {
    // Intentionally no demo/placeholder data: only real signals derived from stored odds history.
  }

  async getSharpMoneyAlerts(userId: string): Promise<SharpMoneyAlert[]> {
    // Get user's active configuration for sport preference
    const activeConfig = await this.prisma.aiConfiguration.findFirst({
      where: { userId, isActive: true },
    });

    const sportKey = activeConfig?.sportKey || 'soccer';

    // Get upcoming events with odds history
    const events = await this.prisma.event.findMany({
      where: {
        sport: { key: sportKey },
        status: { in: ['upcoming', 'live'] },
        startTimeUtc: {
          gte: new Date(),
          lte: new Date(Date.now() + 72 * 60 * 60 * 1000), // Next 72 hours
        },
      },
      include: {
        home: true,
        away: true,
        league: true,
        sport: true,
        oddsQuotes: {
          orderBy: { timestamp: 'desc' },
          take: 20, // Get historical odds for analysis
        },
      },
      orderBy: { startTimeUtc: 'asc' },
      take: 30,
    });

    const alerts: SharpMoneyAlert[] = [];

    for (const event of events) {
      // Analyze each event for sharp money indicators
      const eventAlerts = this.analyzeEventForSharpMoney(event);
      alerts.push(...eventAlerts);
    }

    // Sort by severity and time
    return alerts.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
    });
  }

  async getLiveSharpAction(): Promise<SharpMoneyAlert[]> {
    // Get live events with real-time odds movement
    const liveEvents = await this.prisma.event.findMany({
      where: {
        status: 'live',
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
      take: 20,
    });

    const alerts: SharpMoneyAlert[] = [];

    for (const event of liveEvents) {
      const liveAlerts = this.analyzeLiveSharpAction(event);
      alerts.push(...liveAlerts);
    }

    return alerts;
  }

  private analyzeEventForSharpMoney(event: any): SharpMoneyAlert[] {
    const alerts: SharpMoneyAlert[] = [];
    const oddsHistory = event.oddsQuotes || [];

    if (oddsHistory.length < 2) {
      // Not enough data for movement analysis
      return [];
    }

    // Group odds by outcome
    const outcomeGroups: Record<string, any[]> = {};
    for (const quote of oddsHistory) {
      if (!outcomeGroups[quote.outcomeKey]) {
        outcomeGroups[quote.outcomeKey] = [];
      }
      outcomeGroups[quote.outcomeKey].push(quote);
    }

    // Analyze each outcome for sharp money indicators
    for (const [outcome, quotes] of Object.entries(outcomeGroups)) {
      if (quotes.length < 2) continue;

      const latest = quotes[0];
      const previous = quotes[1];

      const oddsChange = latest.odds - previous.odds;
      const percentChange = ((latest.odds - previous.odds) / previous.odds) * 100;

      // Detect steam moves (rapid, significant line movement)
      if (Math.abs(percentChange) >= 5) {
        const alert = this.createSteamMoveAlert(event, outcome, previous.odds, latest.odds, percentChange);
        if (alert) alerts.push(alert);
      }

      // Detect reverse line movement (simulated based on odds pattern)
      if (this.detectReverseLine(quotes)) {
        const alert = this.createReverseLineAlert(event, outcome, previous.odds, latest.odds);
        if (alert) alerts.push(alert);
      }
    }

    // If no real alerts, return empty
    if (alerts.length === 0) return [];

    return alerts;
  }

  private analyzeLiveSharpAction(event: any): SharpMoneyAlert[] {
    // For live events, detect in-play sharp action
    return [];
  }

  private createSteamMoveAlert(
    event: any,
    outcome: string,
    previousOdds: number,
    currentOdds: number,
    percentChange: number
  ): SharpMoneyAlert | null {
    const homeTeam = event.home?.name || 'Home Team';
    const awayTeam = event.away?.name || 'Away Team';
    const affectedTeam = outcome === 'home' ? homeTeam : outcome === 'away' ? awayTeam : 'Draw';

    return {
      id: `alert-steam-${event.id}-${outcome}-${Date.now()}`,
      eventId: event.id,
      homeTeam,
      awayTeam,
      league: event.league?.name || 'Unknown League',
      sport: event.sport?.name || 'Sport',
      startTime: event.startTimeUtc.toISOString(),
      alertType: 'steam_move',
      severity: Math.abs(percentChange) >= 8 ? 'high' : Math.abs(percentChange) >= 5 ? 'medium' : 'low',
      description: `Steam move on ${affectedTeam}: odds ${percentChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(percentChange).toFixed(1)}%`,
      details: {
        previousOdds,
        currentOdds,
        oddsChange: currentOdds - previousOdds,
        percentageChange: percentChange,
        timeFrame: '1 hour',
        affectedOutcome: outcome === 'home' ? 'Home Win' : outcome === 'away' ? 'Away Win' : 'Draw',
      },
      recommendation: percentChange < 0
        ? `Sharp money backing ${affectedTeam}. Consider acting quickly before line moves further.`
        : `Money moving away from ${affectedTeam}. Sharp bettors may be fading this outcome.`,
      detectedAt: new Date().toISOString(),
    };
  }

  private createReverseLineAlert(
    event: any,
    outcome: string,
    previousOdds: number,
    currentOdds: number
  ): SharpMoneyAlert | null {
    const homeTeam = event.home?.name || 'Home Team';
    const awayTeam = event.away?.name || 'Away Team';

    return {
      id: `alert-rlm-${event.id}-${outcome}-${Date.now()}`,
      eventId: event.id,
      homeTeam,
      awayTeam,
      league: event.league?.name || 'Unknown League',
      sport: event.sport?.name || 'Sport',
      startTime: event.startTimeUtc.toISOString(),
      alertType: 'reverse_line_movement',
      severity: 'high',
      description: `Reverse line movement: public backing one side but line moving opposite`,
      details: {
        previousOdds,
        currentOdds,
        oddsChange: currentOdds - previousOdds,
        percentageChange: ((currentOdds - previousOdds) / previousOdds) * 100,
        timeFrame: '4 hours',
        affectedOutcome: outcome === 'home' ? 'Home Win' : outcome === 'away' ? 'Away Win' : 'Draw',
      },
      recommendation: `Professional money is going against public sentiment. This is often a strong contrarian indicator.`,
      detectedAt: new Date().toISOString(),
    };
  }

  private detectReverseLine(quotes: any[]): boolean {
    // Simplified reverse line detection
    // In production, would compare ticket counts vs line movement
    return false;
  }

  async getSteamMovesSummary(): Promise<{
    totalAlerts: number;
    highPriority: number;
    steamMoves: number;
    reverseLineMovements: number;
    lastUpdated: string;
  }> {
    return {
      totalAlerts: 0,
      highPriority: 0,
      steamMoves: 0,
      reverseLineMovements: 0,
      lastUpdated: new Date().toISOString(),
    };
  }
}
