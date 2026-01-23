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
}
