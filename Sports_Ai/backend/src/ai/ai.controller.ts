import { Controller, Get, Post, Patch, Body, UseGuards, ForbiddenException, Request, Ip, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { OpenRouterService } from './openrouter.service';
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
    private newsService: NewsService,
    private prisma: PrismaService,
  ) {}

  @Get('strange-bets')
  async getStrangeBets() {
    return this.strangeBetsService.detectStrangeBets();
  }

  @Get('tickets/daily')
  async getDailyTickets(@Request() req: any, @Ip() clientIp: string, @Query('type') type: string) {
    // Premium check
    const user = await this.usersService.findById(req.user.id);
    const isPremium = user?.subscriptionTier === 'premium';
    
    const languageCode = await this.getUserLanguage(req.user.id, clientIp);
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
  private async getUserLanguage(userId: string, clientIp: string): Promise<string> {
    // Check user preferences first
    const user = await this.usersService.findById(userId);
    const preferences = JSON.parse(user?.preferences || '{}');

    if (preferences.display?.language) {
      return preferences.display.language;
    }

    // Fall back to IP-based detection
    const ipLanguage = await this.languageService.getLanguageFromIP(clientIp);
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

    // Mock AI tips data - filter by settings
    const allTips = [
      {
        id: '1',
        type: 'arbitrage',
        sport: 'soccer',
        sportKey: 'soccer',
        confidence: 95,
        insight: 'High confidence in Real Madrid vs Barcelona arb due to significant odds discrepancy across bookmakers',
        game: 'Real Madrid vs Barcelona',
        pick: 'Arbitrage - Home Win',
        expectedRoi: 2.4,
        relatedEvents: ['1'],
        createdAt: '2026-01-11T00:00:00Z',
      },
      {
        id: '2',
        type: 'value_bet',
        sport: 'basketball',
        sportKey: 'basketball',
        confidence: 88,
        insight: 'Lakers moneyline shows positive expected value based on recent form analysis',
        game: 'Lakers vs Celtics',
        pick: 'Lakers ML',
        expectedRoi: 5.2,
        relatedEvents: ['2'],
        createdAt: '2026-01-11T00:30:00Z',
      },
      {
        id: '3',
        type: 'market_trend',
        sport: 'tennis',
        sportKey: 'tennis',
        confidence: 82,
        insight: 'Sharp money movement detected on Sinner to win match',
        game: 'Sinner vs Alcaraz',
        pick: 'Sinner ML',
        expectedRoi: 3.8,
        relatedEvents: ['3'],
        createdAt: '2026-01-11T01:00:00Z',
      },
      {
        id: '4',
        type: 'value_bet',
        sport: 'american_football',
        sportKey: 'american_football',
        confidence: 78,
        insight: 'Chiefs spread offers value based on injury-adjusted projections',
        game: 'Chiefs vs Ravens',
        pick: 'Chiefs -3.5',
        expectedRoi: 4.1,
        relatedEvents: ['4'],
        createdAt: '2026-01-11T01:30:00Z',
      },
      {
        id: '5',
        type: 'arbitrage',
        sport: 'ice_hockey',
        sportKey: 'ice_hockey',
        confidence: 72,
        insight: 'Minor arbitrage opportunity in Bruins vs Rangers total goals market',
        game: 'Bruins vs Rangers',
        pick: 'Over 5.5 Goals',
        expectedRoi: 1.2,
        relatedEvents: ['5'],
        createdAt: '2026-01-11T02:00:00Z',
      },
    ];

    // Filter tips based on user settings
    const filteredTips = allTips.filter((tip) => {
      // Filter by sport scope
      if (!aiSettings.sportScope.includes(tip.sportKey)) {
        return false;
      }
      // Filter by confidence threshold
      if (tip.confidence < aiSettings.confidenceThreshold) {
        return false;
      }
      return true;
    });

    // Sort by confidence (higher first) for conservative, by ROI for aggressive
    if (aiSettings.riskProfile === 'conservative') {
      filteredTips.sort((a, b) => b.confidence - a.confidence);
    } else if (aiSettings.riskProfile === 'aggressive') {
      filteredTips.sort((a, b) => b.expectedRoi - a.expectedRoi);
    }

    return {
      tips: filteredTips,
      total: filteredTips.length,
      appliedSettings: {
        sportScope: aiSettings.sportScope,
        confidenceThreshold: aiSettings.confidenceThreshold,
        riskProfile: aiSettings.riskProfile,
      },
    };
  }

  @Get('advice')
  async getAiAdvice(@Request() req: any, @Ip() clientIp: string) {
    const user = await this.usersService.findById(req.user.id);

    // Get user's language preference
    const languageCode = await this.getUserLanguage(req.user.id, clientIp);

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

    const advice = await this.openRouterService.generateAdvice(configuration, matches, languageCode);

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
  async getAiNews(@Request() req: any, @Ip() clientIp: string) {
    // Get user's language preference
    const languageCode = await this.getUserLanguage(req.user.id, clientIp);

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
    let news = await this.newsService.getLatestSportsNews(sportKeys);

    // If NewsAPI returned nothing (not configured or error), fall back to OpenRouter with Search
    if (news.length === 0) {
      news = await this.openRouterService.generateNews(sportKeys, languageCode);
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
  async getDailyTips(@Request() req: any) {
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

    const languageCode = await this.getUserLanguage(req.user.id, clientIp);

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
  async detectLanguageFromIP(@Ip() clientIp: string) {
    const language = await this.languageService.getLanguageFromIP(clientIp);
    return {
      detectedLanguage: language,
      clientIp: clientIp,
    };
  }
}
