import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { LlmService } from './llm.service';
import { DailyTipsService } from './daily-tips.service';
import { SharpMoneyService } from './sharp-money.service';
import { StrangeBetsService } from './strange-bets.service';
import { TicketGeneratorService } from './ticket-generator.service';
import { LanguageService } from './language.service';
import { NewsService } from '../integrations/news.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * AI Facade Service
 * 
 * Provides a unified interface to all AI-related services, reducing
 * coupling in the AI Controller. This service acts as a single point
 * of access for all AI operations.
 */
@Injectable()
export class AiFacadeService {
  constructor(
    private readonly usersService: UsersService,
    private readonly llmService: LlmService,
    private readonly dailyTipsService: DailyTipsService,
    private readonly sharpMoneyService: SharpMoneyService,
    private readonly strangeBetsService: StrangeBetsService,
    private readonly ticketGeneratorService: TicketGeneratorService,
    private readonly languageService: LanguageService,
    private readonly newsService: NewsService,
    private readonly prisma: PrismaService,
  ) {}

  // User operations
  async findUserById(id: string) {
    return this.usersService.findById(id);
  }

  async getUserLanguage(userId: string, ipAddress: string): Promise<string> {
    const user = await this.usersService.findById(userId);
    const preferences = JSON.parse(user?.preferences || '{}');
    if (preferences.language) {
      return preferences.language;
    }

    const detected = await this.languageService.getLanguageFromIP(ipAddress);
    return detected.code;
  }

  // LLM operations
  async generateAdvice(config: any, matches: any[]) {
    return this.llmService.generateAdvice(config, matches);
  }

  // Daily tips operations
  async getDailyTickets(userId: string) {
    return this.dailyTipsService.getDailyTickets(userId);
  }

  // Sharp money operations
  async getSharpMoneyAlerts(userId?: string) {
    return this.sharpMoneyService.getSharpMoneyAlerts(userId);
  }

  // Strange bets operations
  async detectStrangeBets() {
    return this.strangeBetsService.detectStrangeBets();
  }

  // Ticket generator operations
  async generateTicket(targetOdds: 2 | 3) {
    return this.ticketGeneratorService.generateDailyTicket(targetOdds);
  }

  // Daily tips operations (extended)
  async getCustomTicket(userId: string, options: any) {
    return this.dailyTipsService.getCustomTicket(userId, options);
  }

  // Sharp money operations (extended)
  async getLiveSharpAction() {
    return this.sharpMoneyService.getLiveSharpAction();
  }

  async getSteamMovesSummary() {
    return this.sharpMoneyService.getSteamMovesSummary();
  }

  // LLM operations (extended)
  async generateNews(sports: string[], languageCode: string) {
    return this.llmService.generateNews(sports, languageCode);
  }

  async chat(message: string, context: any) {
    return this.llmService.chat(message, context);
  }

  // Language operations (extended)
  async getLanguageFromIP(ipAddress: string) {
    return this.languageService.getLanguageFromIP(ipAddress);
  }

  // News operations
  async getLatestSportsNews(sports: string[]) {
    return this.newsService.getLatestSportsNews(sports);
  }

  // Database operations
  get db() {
    return this.prisma;
  }

  /**
   * Intelligence Feed
   * 
   * Aggregates the most important insights from across the system into a 
   * single prioritized list for the user's landing page.
   */
  async getIntelligenceFeed(userId: string) {
    const [tips, alerts, strangeBets, arbs] = await Promise.all([
      this.dailyTipsService.getDailyTickets(userId),
      this.sharpMoneyService.getSharpMoneyAlerts(userId),
      this.strangeBetsService.detectStrangeBets(),
      this.prisma.arbitrageOpportunity.findMany({
        take: 5,
        orderBy: { detectedAt: 'desc' },
        include: { event: { include: { home: true, away: true, sport: true, league: true } } }
      })
    ]);

    const feed: any[] = [];
    const now = new Date();
    const staleThreshold = 1000 * 60 * 60 * 4; // 4 hours

    // 1. Add Best Arbitrage (if ROI > 2%)
    const bestArb = arbs.sort((a, b) => b.profitMargin - a.profitMargin)[0];
    if (bestArb) {
      const isStale = now.getTime() - new Date(bestArb.detectedAt).getTime() > staleThreshold;
      feed.push({
        id: `arb-${bestArb.id}`,
        type: 'arbitrage',
        priority: bestArb.profitMargin > 3 ? 100 : 80,
        title: `ROI Opportunity: +${bestArb.profitMargin.toFixed(2)}%`,
        summary: `Cross-market arbitrage detected for ${bestArb.event?.home?.name} vs ${bestArb.event?.away?.name}. Convergence of ${bestArb.profitMargin.toFixed(1)}% ROI identified across ${JSON.parse(bestArb.bookmakerLegs || '[]').length} sportsbooks.`,
        confidence: Math.round(bestArb.confidenceScore * 100),
        timestamp: bestArb.detectedAt,
        isStale,
        logic: `Mathematical certainty derived from price divergence between ${JSON.parse(bestArb.bookmakerLegs || '[]').map((l: any) => l.bookmaker).join(', ')}. No gambling risk if stakes are balanced.`,
        data: {
          arbId: bestArb.id,
          profit: bestArb.profitMargin,
          event: `${bestArb.event?.home?.name} vs ${bestArb.event?.away?.name}`,
          sport: bestArb.event?.sport?.name
        }
      });
    }

    // 2. Add Best Tip (if confidence > 85%)
    const allMatches = tips.flatMap(t => t.matches);
    const bestMatch = allMatches.sort((a, b) => b.confidence - a.confidence)[0];
    if (bestMatch && bestMatch.confidence >= 85) {
      const isStale = now.getTime() - new Date(bestMatch.startTime).getTime() > staleThreshold;
      feed.push({
        id: `tip-${bestMatch.eventId}`,
        type: 'tip',
        priority: 95,
        title: `High Confidence: ${bestMatch.prediction}`,
        summary: `${bestMatch.homeTeam} vs ${bestMatch.awayTeam} in ${bestMatch.league}. Composite model score suggests ${bestMatch.confidence}% probability.`,
        confidence: bestMatch.confidence,
        timestamp: bestMatch.startTime,
        isStale,
        logic: `Model indicates value at @${bestMatch.odds.toFixed(2)}. Derived from ${bestMatch.analysis.factors.length} market indicators including price stability and historical H2H dominance.`,
        data: {
          eventId: bestMatch.eventId,
          pick: bestMatch.prediction,
          odds: bestMatch.odds,
          game: `${bestMatch.homeTeam} vs ${bestMatch.awayTeam}`
        }
      });
    }

    // 3. Add Sharp Money (High Severity)
    const topAlert = alerts.filter(a => a.severity === 'high')[0];
    if (topAlert) {
      feed.push({
        id: `alert-${topAlert.id}`,
        type: 'alert',
        priority: 90,
        title: `Sharp Action: ${topAlert.alertType.replace('_', ' ').toUpperCase()}`,
        summary: topAlert.description,
        confidence: 85,
        timestamp: topAlert.detectedAt,
        logic: `Significant institutional volume detected on this line. Professional money is moving the market contrary to public sentiment.`,
        data: {
          eventId: topAlert.eventId,
          type: topAlert.alertType,
          description: topAlert.description
        }
      });
    }

    // 4. Add Strange Bets
    if (strangeBets.length > 0) {
      const topStrange = strangeBets[0];
      feed.push({
        id: `strange-${topStrange.eventId}`,
        type: 'alert',
        priority: 70,
        title: `Volume Spike Detected`,
        summary: `Unusual betting volume on ${topStrange.outcome} for ${topStrange.event}. Price dropped ${topStrange.drop}.`,
        confidence: 75,
        timestamp: new Date().toISOString(),
        data: {
          eventId: topStrange.eventId,
          event: topStrange.event,
          drop: topStrange.drop
        }
      });
    }

    return feed.sort((a, b) => b.priority - a.priority);
  }
}
