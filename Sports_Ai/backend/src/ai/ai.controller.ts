import { Controller, Get, Post, Patch, Body, UseGuards, ForbiddenException, Request, Ip, Query, Inject, forwardRef } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { OpenRouterService, AiAdvice } from './openrouter.service';
import { DailyTipsService } from './daily-tips.service';
import { SharpMoneyService } from './sharp-money.service';
import { StrangeBetsService } from './strange-bets.service';
import { TicketGeneratorService } from './ticket-generator.service';
import { NewsService } from '../integrations/news.service';
import { LanguageService, SUPPORTED_LANGUAGES } from './language.service';
import { PrismaService } from '../prisma/prisma.service';

interface AiSettings {
  sportScope: string[];
  confidenceThreshold: number;
  riskProfile: 'conservative' | 'balanced' | 'aggressive';
  variableWeights: {
    recentForm: number;
    headToHead: number;
    homeAdvantage: number;
    injuries: number;
    marketMovement: number;
  };
  excludedMarkets: string[];
}

@Controller('v1/ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private usersService: UsersService,
    private openRouterService: OpenRouterService,
    private dailyTipsService: DailyTipsService,
    private sharpMoneyService: SharpMoneyService,
    private strangeBetsService: StrangeBetsService,
    private ticketGeneratorService: TicketGeneratorService,
    private languageService: LanguageService,
    @Inject(forwardRef(() => NewsService))
    private newsService: NewsService,
    private prisma: PrismaService,
  ) {}

  @Get('strange-bets')
  async getStrangeBets() {
    return this.strangeBetsService.detectStrangeBets();
  }

  @Get('tickets/daily')
  async getDailyTickets(@Request() req: any, @Ip() ipAddress: string, @Query('type') type: string) {
    // Premium check
    const user = await this.usersService.findById(req.user.id);
    const isPremium = user?.subscriptionTier === 'premium';
    
    const languageCode = await this.getUserLanguage(req.user.id, ipAddress);
    const tickets = await this.dailyTipsService.getDailyTickets(req.user.id);
    
    // Add AI explanations for each match in the ticket
    for (const ticket of tickets) {
      for (const match of ticket.matches) {
        if (isPremium) {
          match.analysis.summary = await this.generateExplanation(match, languageCode);
        }
      }
    }
    
    return tickets;
  }

  private async generateExplanation(match: any, languageCode: string = 'en') {
    const prompt = `Provide a professional betting analysis for ${match.homeTeam} vs ${match.awayTeam}. 
    Prediction: ${match.prediction}. Confidence: ${match.confidence}%.
    Focus on form and statistical trends. Keep it to 2 concise sentences.`;
    
    try {
      const advice = await this.openRouterService.generateAdvice(
        { sportKey: 'soccer', countries: [], leagues: [], markets: [] },
        [{
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          league: match.league,
          startTime: match.startTime,
          odds: { home: match.odds, away: 2.0 },
        }],
        languageCode
      );
      return advice[0]?.content || match.analysis.summary;
    } catch (e) {
      return match.analysis.summary;
    }
  }

  /**
   * Helper to get user's preferred language
   * Priority: 1. User preference, 2. IP-based detection, 3. Default (English)
   */
  private async getUserLanguage(userId: string, ipAddress: string): Promise<string> {
    // Check user preferences first
    const user = await this.usersService.findById(userId);
    const preferences = JSON.parse(user?.preferences || '{}');

    if (preferences.display?.language) {
      return preferences.display.language;
    }

    // Fall back to IP-based detection
    const ipLanguage = await this.languageService.getLanguageFromIP(ipAddress);
    return ipLanguage.code;
  }

  @Get('settings')
  async getAiSettings(@Request() req: any) {
    const user = await this.usersService.findById(req.user.id);
    const isPremium = user?.subscriptionTier === 'premium';

    if (!isPremium) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'AI settings require Premium subscription',
        requiredTier: 'premium',
        currentTier: user?.subscriptionTier || 'free',
      });
    }

    // Get AI settings from user preferences or return defaults
    const preferences = JSON.parse(user?.preferences || '{}');
    const aiSettings: AiSettings = preferences.aiSettings || {
      sportScope: ['soccer', 'basketball', 'tennis', 'american_football'],
      confidenceThreshold: 70,
      riskProfile: 'balanced',
      variableWeights: {
        recentForm: 25,
        headToHead: 20,
        homeAdvantage: 15,
        injuries: 20,
        marketMovement: 20,
      },
      excludedMarkets: [],
    };

    return aiSettings;
  }

  @Patch('settings')
  async updateAiSettings(@Request() req: any, @Body() settings: Partial<AiSettings>) {
    const user = await this.usersService.findById(req.user.id);
    const isPremium = user?.subscriptionTier === 'premium';

    if (!isPremium) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'AI settings require Premium subscription',
        requiredTier: 'premium',
        currentTier: user?.subscriptionTier || 'free',
      });
    }

    // Get current preferences and merge AI settings
    const preferences = JSON.parse(user?.preferences || '{}');
    const currentAiSettings = preferences.aiSettings || {};

    const newAiSettings = {
      ...currentAiSettings,
      ...settings,
      variableWeights: settings.variableWeights
        ? { ...currentAiSettings.variableWeights, ...settings.variableWeights }
        : currentAiSettings.variableWeights,
    };

    // Update user preferences
    await this.usersService.updatePreferences(req.user.id, {
      aiSettings: newAiSettings,
    });

    return {
      success: true,
      settings: newAiSettings,
    };
  }

  @Get('tips')
  async getAiTips(@Request() req: any) {
    const user = await this.usersService.findById(req.user.id);
    const isPremium = user?.subscriptionTier === 'premium';

    if (!isPremium) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'AI-powered betting tips require Premium subscription',
        requiredTier: 'premium',
        currentTier: user?.subscriptionTier || 'free',
      });
    }

    // Get user's AI settings for filtering
    const preferences = JSON.parse(user?.preferences || '{}');
    const aiSettings = preferences.aiSettings || {
      sportScope: ['soccer', 'basketball', 'tennis', 'american_football'],
      confidenceThreshold: 70,
      riskProfile: 'balanced',
    };

    return {
      tips: [],
      total: 0,
      appliedSettings: {
        sportScope: aiSettings.sportScope,
        confidenceThreshold: aiSettings.confidenceThreshold,
        riskProfile: aiSettings.riskProfile,
      },
      message: 'No AI tips available yet.',
    };
  }

  @Get('advice')
  async getAiAdvice(@Request() req: any, @Ip() ipAddress: string) {
    const user = await this.usersService.findById(req.user.id);

    // Get user's language preference
    const languageCode = await this.getUserLanguage(req.user.id, ipAddress);

    // Get user's active AI configuration
    const activeConfig = await this.prisma.aiConfiguration.findFirst({
      where: { userId: req.user.id, isActive: true },
    });

    // Default configuration if none exists
    const configuration = activeConfig
      ? {
          sportKey: activeConfig.sportKey,
          countries: JSON.parse(activeConfig.countries || '[]'),
          leagues: JSON.parse(activeConfig.leagues || '[]'),
          markets: JSON.parse(activeConfig.markets || '[]'),
        }
      : {
          sportKey: 'soccer',
          countries: [],
          leagues: [],
          markets: [],
        };

    // Get upcoming matches based on configuration
    const events = await this.prisma.event.findMany({
      where: {
        sport: { key: configuration.sportKey },
        status: { in: ['upcoming', 'live'] },
        ...(configuration.leagues.length > 0 && {
          league: {
            OR: [
              { name: { in: configuration.leagues } },
              { id: { in: configuration.leagues } },
            ],
          },
        }),
      },
      include: {
        home: true,
        away: true,
        league: true,
        oddsQuotes: {
          orderBy: { timestamp: 'desc' },
          take: 3,
        },
      },
      orderBy: { startTimeUtc: 'asc' },
      take: 10,
    });

    const matches = events.map((event) => {
      const homeOdds = event.oddsQuotes.find((q) => q.outcomeKey === 'home')?.odds || 2.0;
      const drawOdds = event.oddsQuotes.find((q) => q.outcomeKey === 'draw')?.odds;
      const awayOdds = event.oddsQuotes.find((q) => q.outcomeKey === 'away')?.odds || 3.0;

      return {
        homeTeam: event.home?.name || 'TBD',
        awayTeam: event.away?.name || 'TBD',
        league: event.league?.name || 'Unknown',
        startTime: event.startTimeUtc.toISOString(),
        odds: {
          home: homeOdds,
          draw: drawOdds,
          away: awayOdds,
        },
      };
    });

    let advice: AiAdvice[] = [];
    try {
      advice = await this.openRouterService.generateAdvice(configuration, matches, languageCode);
    } catch (e) {
      // Fallback: deterministic, odds-derived advice (no fabricated content).
      advice = matches
        .slice(0, 10)
        .map((m, idx) => {
          const outcomes: Array<{ key: string; odds: number }> = [
            { key: 'home', odds: m.odds.home },
            ...(typeof m.odds.draw === 'number' ? [{ key: 'draw', odds: m.odds.draw }] : []),
            { key: 'away', odds: m.odds.away },
          ].filter((o) => Number.isFinite(o.odds) && o.odds > 1);

          // Choose the lowest odds as the market's highest implied probability.
          outcomes.sort((a, b) => a.odds - b.odds);
          const best = outcomes[0];
          const title = `Market pick: ${best.key.toUpperCase()} @ ${best.odds.toFixed(2)}`;
          const content = `Based on current odds for ${m.homeTeam} vs ${m.awayTeam}, the market-implied strongest outcome is ${best.key.toUpperCase()} at ${best.odds.toFixed(2)}. This is derived from live bookmaker prices (no simulated stats).`;
          const confidence = Math.max(55, Math.min(90, Math.round((1 / best.odds) * 100)));
          return {
            id: `odds-${idx}-${Date.now()}`,
            title,
            content,
            category: 'insight' as const,
            confidence,
            sport: configuration.sportKey,
            relatedMatch: `${m.homeTeam} vs ${m.awayTeam}`,
            createdAt: new Date().toISOString(),
          };
        });
    }

    return {
      advice,
      configuration: activeConfig
        ? {
            id: activeConfig.id,
            name: activeConfig.name,
            sportKey: activeConfig.sportKey,
            countries: configuration.countries,
            leagues: configuration.leagues,
            markets: configuration.markets,
          }
        : null,
      matchCount: matches.length,
      language: languageCode,
    };
  }

  @Get('news')
  async getAiNews(@Request() req: any, @Ip() ipAddress: string) {
    // Get user's language preference
    const languageCode = await this.getUserLanguage(req.user.id, ipAddress);

    // Get user's preferences for sport scope
    const user = await this.usersService.findById(req.user.id);
    const preferences = JSON.parse(user?.preferences || '{}');
    const aiSettings = preferences.aiSettings || {
      sportScope: ['soccer', 'basketball', 'tennis', 'american_football'],
    };

    // Also check for active configuration
    const activeConfig = await this.prisma.aiConfiguration.findFirst({
      where: { userId: req.user.id, isActive: true },
    });

    // Combine sport scope from settings and active config
    const sportKeys = activeConfig
      ? [activeConfig.sportKey, ...aiSettings.sportScope.filter((s: string) => s !== activeConfig.sportKey)]
      : aiSettings.sportScope;

    // Try fetching from dedicated NewsAPI first if configured
    let news: any[] = await this.newsService.getLatestSportsNews(sportKeys);

    // If NewsAPI returned nothing (not configured or error), fall back to OpenRouter with Search
    if (news.length === 0) {
      const aiNews = await this.openRouterService.generateNews(sportKeys, languageCode);
      const mappedNews: any[] = aiNews.map(item => ({
        id: item.id,
        headline: item.headline,
        summary: item.summary,
        url: '#',
        source: 'AI-Search',
        sport: item.sport,
        publishedAt: item.createdAt,
        impact: item.impact,
      }));
      news = mappedNews;
    }

    return {
      news,
      sportScope: sportKeys,
      refreshedAt: new Date().toISOString(),
      language: languageCode,
      source: news[0]?.id?.startsWith('newsapi') ? 'NewsAPI' : 'AI-Search',
    };
  }

  @Get('daily-tips')
  async getDailyTipsList(@Request() req: any) {
    const tickets = await this.dailyTipsService.getDailyTickets(req.user.id);

    return {
      tickets,
      generatedAt: new Date().toISOString(),
    };
  }

  @Post('daily-tips/custom')
  async getCustomTicket(
    @Request() req: any,
    @Body() body: { targetOdds: number; sportKey?: string; maxMatches?: number; riskLevel?: string },
    @Ip() ipAddress: string,
  ) {
    // Check if user is premium
    const user = await this.usersService.findById(req.user.id);
    const isPremium = user?.subscriptionTier === 'premium';

    if (!isPremium) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Custom ticket builder requires Premium subscription',
        requiredTier: 'premium',
        currentTier: user?.subscriptionTier || 'free',
      });
    }

    if (!body.targetOdds || body.targetOdds < 1.1 || body.targetOdds > 100) {
      throw new ForbiddenException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Target odds must be between 1.1 and 100',
      });
    }

    const ticket = await this.dailyTipsService.getCustomTicket(req.user.id, {
      targetOdds: body.targetOdds,
      sportKey: body.sportKey,
      maxMatches: body.maxMatches || 5,
      riskLevel: (body.riskLevel as 'low' | 'medium' | 'high') || 'medium',
    });

    const languageCode = await this.getUserLanguage(req.user.id, ipAddress);

    // Add AI explanations for each match in the custom ticket
    for (const match of ticket.matches) {
      if (isPremium) {
        match.analysis.summary = await this.generateExplanation(match, languageCode);
      }
    }

    return {
      ticket,
      generatedAt: new Date().toISOString(),
    };
  }

  @Get('sharp-money')
  async getSharpMoneyAlerts(@Request() req: any) {
    const alerts = await this.sharpMoneyService.getSharpMoneyAlerts(req.user.id);

    return {
      alerts,
      total: alerts.length,
      generatedAt: new Date().toISOString(),
    };
  }

  @Get('sharp-money/live')
  async getLiveSharpAction() {
    const alerts = await this.sharpMoneyService.getLiveSharpAction();

    return {
      alerts,
      total: alerts.length,
      isLive: true,
      generatedAt: new Date().toISOString(),
    };
  }

  @Get('sharp-money/summary')
  async getSharpMoneySummary() {
    const summary = await this.sharpMoneyService.getSteamMovesSummary();

    return {
      summary,
      generatedAt: new Date().toISOString(),
    };
  }

  @Get('languages')
  async getSupportedLanguages() {
    return {
      languages: SUPPORTED_LANGUAGES,
      default: 'en',
    };
  }

  @Get('language/detect')
  async detectLanguageFromIP(@Ip() ipAddress: string) {
    const language = await this.languageService.getLanguageFromIP(ipAddress);
    return {
      detectedLanguage: language,
      ipAddress: ipAddress,
    };
  }

  @Post('chat')
  async chat(@Request() req: any, @Body() body: { message: string }, @Ip() ipAddress: string) {
    const userId = req.user.id;
    const { message } = body;

    // 1. Get user language
    const languageCode = await this.getUserLanguage(userId, ipAddress);

    // 2. Get user preferences and AI settings
    const user = await this.usersService.findById(userId);
    const preferences = JSON.parse(user?.preferences || '{}');

    // 3. Extract team/player keywords (simple extraction for now, LLM will handle better)
    const commonWords = ['show', 'give', 'info', 'next', 'match', 'game', 'team', 'player', 'find', 'data', 'tell'];
    const keywords = message.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(' ')
      .filter(word => word.length >= 3 && !commonWords.includes(word));
    
    // 4. Gather context data
    let upcomingEvents = [];
    let standings = [];

    if (keywords.length > 0) {
      // Fetch upcoming events that might be relevant
      upcomingEvents = await this.prisma.event.findMany({
        where: {
          status: { in: ['upcoming', 'live'] },
          OR: keywords.map(kw => ({
            OR: [
              { home: { name: { contains: kw, mode: 'insensitive' } } },
              { away: { name: { contains: kw, mode: 'insensitive' } } },
              { league: { name: { contains: kw, mode: 'insensitive' } } },
            ],
          })),
        },
        include: {
          home: true,
          away: true,
          league: true,
          oddsQuotes: {
            orderBy: { timestamp: 'desc' },
            take: 10,
          },
        },
        take: 5,
      });

      // Fetch standings for relevant teams
      const teamIds = [];
      upcomingEvents.forEach(e => {
        if (e.homeId) teamIds.push(e.homeId);
        if (e.awayId) teamIds.push(e.awayId);
      });

      if (teamIds.length > 0) {
        standings = await this.prisma.standing.findMany({
          where: { teamId: { in: teamIds } },
          include: { team: true, league: true },
          orderBy: { updatedAt: 'desc' },
          take: 10,
        });
      }
    }

    // Fetch news for relevant sports
    const news = await this.newsService.getLatestSportsNews(['soccer', 'basketball']);

    // 5. Call OpenRouter chat
    const response = await this.openRouterService.chat(message, {
      userPreferences: preferences,
      relevantMatches: upcomingEvents.map(e => ({
        home: e.home?.name,
        away: e.away?.name,
        league: e.league?.name,
        time: e.startTimeUtc,
        odds: e.oddsQuotes.map(o => ({ bookie: o.bookmakerId, outcome: o.outcomeKey, price: o.odds })),
      })),
      recentNews: news.slice(0, 3),
      standings: standings.map(s => ({
        team: s.team?.name,
        league: s.league?.name,
        position: s.position,
        played: s.played,
        won: s.won,
        drawn: s.drawn,
        lost: s.lost,
        points: s.points,
        form: s.form,
      })),
      languageCode,
    });

    return {
      response,
      suggestedActions: [
        { label: 'View Next Match', action: upcomingEvents[0] ? `/event/${upcomingEvents[0].id}` : '/sports' },
        { label: 'Check Arbitrage', action: '/arbitrage' },
      ],
    };
  }
}
