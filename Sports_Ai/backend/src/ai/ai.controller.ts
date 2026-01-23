import { Controller, Get, Post, Patch, Body, UseGuards, ForbiddenException, Request, Ip, Query, Param, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiFacadeService } from './ai.facade.service';
import { AiQueueService, JobStatus } from './ai-queue.service';
import { AiAdvice } from './openrouter.service';
import { SUPPORTED_LANGUAGES } from './language.service';

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
  // Cache AI advice briefly to avoid repeated slow upstream calls on Home refresh.
  // Keyed by user + active configuration + language.
  private adviceCache = new Map<string, { fetchedAt: number; payload: any }>();

  constructor(
    private readonly aiFacade: AiFacadeService,
    private readonly aiQueue: AiQueueService,
  ) {}

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout')), ms);
      promise
        .then((v) => {
          clearTimeout(t);
          resolve(v);
        })
        .catch((e) => {
          clearTimeout(t);
          reject(e);
        });
    });
  }

  @Get('strange-bets')
  async getStrangeBets() {
    return this.aiFacade.detectStrangeBets();
  }

  @Get('tickets/daily')
  async getDailyTickets(@Request() req: any, @Ip() ipAddress: string, @Query('type') type: string) {
    // Premium check
    const user = await this.aiFacade.findUserById(req.user.id);
    const isPremium = user?.subscriptionTier === 'premium';
    
    const languageCode = await this.aiFacade.getUserLanguage(req.user.id, ipAddress);
    const tickets = await this.aiFacade.getDailyTickets(req.user.id);
    
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
      const advice = await this.aiFacade.generateAdvice(
        { sportKey: 'soccer', countries: [], leagues: [], markets: [] },
        [{
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          league: match.league,
          startTime: match.startTime,
          odds: { home: match.odds, away: 2.0 },
        }]
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
    return this.aiFacade.getUserLanguage(userId, ipAddress);
  }

  @Get('settings')
  async getAiSettings(@Request() req: any) {
    const user = await this.aiFacade.findUserById(req.user.id);

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
    const user = await this.aiFacade.findUserById(req.user.id);

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

    // Update user preferences via facade
    preferences.aiSettings = newAiSettings;
    await this.aiFacade.db.user.update({
      where: { id: req.user.id },
      data: { preferences: JSON.stringify(preferences) },
    });

    return {
      success: true,
      settings: newAiSettings,
    };
  }

  @Get('tips')
  async getAiTips(@Request() req: any) {
    const user = await this.aiFacade.findUserById(req.user.id);

    // Get user's AI settings for filtering
    const preferences = JSON.parse(user?.preferences || '{}');
    const aiSettings = preferences.aiSettings || {
      sportScope: ['soccer', 'basketball', 'tennis', 'american_football'],
      confidenceThreshold: 70,
      riskProfile: 'balanced',
    };

    // Get ALL configurations so we can generate tips for each one.
      const configs = await this.aiFacade.db.aiConfiguration.findMany({
      where: { userId: req.user.id },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    });

    const sportScope = Array.isArray(aiSettings.sportScope) ? aiSettings.sportScope : [];
    const confidenceThreshold = Number(aiSettings.confidenceThreshold) || 70;

    // Helper: build tips from odds (no fabrication). "expectedRoi" is derived from best vs avg odds across bookmakers.
    const tips: any[] = [];
    const takePerConfig = 5;

    for (const cfg of configs.length > 0 ? configs : ([{ id: 'default', name: 'Default', sportKey: 'soccer', leagues: '[]', countries: '[]', markets: '[]', isActive: true }] as any[])) {
      const sportKey = cfg.sportKey || 'soccer';
      if (sportScope.length > 0 && !sportScope.includes(sportKey)) continue;

      const leagues = cfg.leagues ? JSON.parse(cfg.leagues || '[]') : [];
      const countries = cfg.countries ? JSON.parse(cfg.countries || '[]') : [];
      const markets = cfg.markets ? JSON.parse(cfg.markets || '[]') : [];

      // Only H2H / 1X2 supported with current ingestion.
      const requiresUnsupportedMarket = markets.some((m: string) => ['btts', 'BTTS', 'over_under', 'totals', 'spread'].includes(m));
      if (requiresUnsupportedMarket) {
        continue;
      }

      const events = await this.aiFacade.db.event.findMany({
        where: {
          sport: { key: sportKey },
          status: { in: ['upcoming', 'live'] },
          startTimeUtc: { gte: new Date() },
          ...(leagues.length > 0 && {
            league: { OR: [{ name: { in: leagues } }, { id: { in: leagues } }] },
          }),
          ...(countries.length > 0 && {
            league: { country: { in: countries } },
          }),
        },
        include: {
          home: true,
          away: true,
          league: true,
          sport: true,
          oddsQuotes: {
            include: { bookmaker: true, market: true },
            where: { market: { marketKey: 'h2h' } },
            orderBy: { timestamp: 'desc' },
            take: 200,
          },
        },
        orderBy: { startTimeUtc: 'asc' },
        take: 25,
      });

      for (const e of events) {
        // Group latest odds per bookmaker+outcomeKey
        const latestByBookOutcome = new Map<string, number>();
        const byOutcome: Record<string, number[]> = { home: [], away: [], draw: [] };

        for (const q of e.oddsQuotes || []) {
          const ok = q.outcomeKey;
          if (!['home', 'away', 'draw'].includes(ok)) continue;
          const k = `${q.bookmakerId}:${ok}`;
          if (latestByBookOutcome.has(k)) continue;
          latestByBookOutcome.set(k, q.odds);
          byOutcome[ok].push(q.odds);
        }

        // Need at least home+away odds from >=1 bookmaker.
        if (byOutcome.home.length === 0 || byOutcome.away.length === 0) continue;

        const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);
        const best = (arr: number[]) => Math.max(...arr);
        const bestHome = best(byOutcome.home);
        const bestAway = best(byOutcome.away);
        const bestDraw = byOutcome.draw.length ? best(byOutcome.draw) : null;

        const avgHome = avg(byOutcome.home);
        const avgAway = avg(byOutcome.away);
        const avgDraw = byOutcome.draw.length ? avg(byOutcome.draw) : null;

        const candidates: Array<{ key: 'home'|'away'|'draw'; best: number; avg: number | null }> = [
          { key: 'home', best: bestHome, avg: avgHome },
          { key: 'away', best: bestAway, avg: avgAway },
          ...(bestDraw && avgDraw ? [{ key: 'draw' as const, best: bestDraw, avg: avgDraw }] : []),
        ];

        // Choose the candidate with largest best-vs-avg uplift (data-derived).
        candidates.sort((a, b) => ((b.avg ? b.best / b.avg : 0) - (a.avg ? a.best / a.avg : 0)));
        const pick = candidates[0];

        const impliedProb = Math.round((1 / pick.best) * 100);
        if (impliedProb < confidenceThreshold) continue;

        const expectedRoi = pick.avg ? Math.round(((pick.best / pick.avg) - 1) * 1000) / 10 : 0;

        tips.push({
          id: `tip-${cfg.id}-${e.id}-${pick.key}`,
          type: 'value_bet',
          sport: e.sport?.name || sportKey,
          sportKey,
          confidence: impliedProb,
          insight: `Best price vs market average for ${pick.key.toUpperCase()} is ${pick.best.toFixed(2)} (avg ${pick.avg?.toFixed(2)}). Derived from live bookmaker odds only.`,
          game: `${e.home?.name || 'TBD'} vs ${e.away?.name || 'TBD'}`,
          pick: `${pick.key.toUpperCase()} @ ${pick.best.toFixed(2)}`,
          expectedRoi,
          relatedEvents: [e.id],
          createdAt: new Date().toISOString(),
          configurationId: cfg.id,
          configurationName: cfg.name || 'Default',
        });

        if (tips.filter((t) => t.configurationId === cfg.id).length >= takePerConfig) break;
      }
    }

    return {
      tips,
      total: tips.length,
      appliedSettings: {
        sportScope: aiSettings.sportScope,
        confidenceThreshold: aiSettings.confidenceThreshold,
        riskProfile: aiSettings.riskProfile,
      },
    };
  }

  @Get('advice')
  async getAiAdvice(@Request() req: any, @Ip() ipAddress: string) {
    const user = await this.aiFacade.findUserById(req.user.id);

    // Get user's language preference
    const languageCode = await this.getUserLanguage(req.user.id, ipAddress);

    // Get user's active AI configuration
    const activeConfig = await this.aiFacade.db.aiConfiguration.findFirst({
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

    const cacheKey = `${req.user.id}:${activeConfig?.id || 'default'}:${languageCode}`;
    const now = Date.now();
    const cacheTtlMs = Number(process.env.AI_ADVICE_CACHE_TTL_MS || 60_000);
    const cached = this.adviceCache.get(cacheKey);
    if (cached && now - cached.fetchedAt <= cacheTtlMs) {
      return cached.payload;
    }

    // Get upcoming matches based on configuration
    const events = await this.aiFacade.db.event.findMany({
      where: {
        sport: { key: configuration.sportKey },
        status: { in: ['upcoming', 'live'] },
        startTimeUtc: { gte: new Date() },
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
          where: { market: { marketKey: 'h2h' } },
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
      // Hard-cap the AI provider time so this endpoint stays snappy even on provider issues.
      const timeoutMs = Number(process.env.AI_ADVICE_TIMEOUT_MS || 8000);
      advice = await this.withTimeout(
        this.aiFacade.generateAdvice(configuration, matches),
        timeoutMs
      );
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

    const payload = {
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

    this.adviceCache.set(cacheKey, { fetchedAt: now, payload });
    return payload;
  }

  @Get('news')
  async getAiNews(@Request() req: any, @Ip() ipAddress: string) {
    // Get user's language preference
    const languageCode = await this.getUserLanguage(req.user.id, ipAddress);

    // Get user's preferences for sport scope
    const user = await this.aiFacade.findUserById(req.user.id);
    const preferences = JSON.parse(user?.preferences || '{}');
    const aiSettings = preferences.aiSettings || {
      sportScope: ['soccer', 'basketball', 'tennis', 'american_football'],
    };

    // Also check for active configuration
    const activeConfig = await this.aiFacade.db.aiConfiguration.findFirst({
      where: { userId: req.user.id, isActive: true },
    });

    // Combine sport scope from settings and active config
    const sportKeys = activeConfig
      ? [activeConfig.sportKey, ...aiSettings.sportScope.filter((s: string) => s !== activeConfig.sportKey)]
      : aiSettings.sportScope;

    // Keep this endpoint responsive: cap the scope to a small set.
    const cappedSportKeys: string[] = Array.from(
      new Set(
        (Array.isArray(sportKeys) ? sportKeys : [])
          .map((s: any) => String(s || '').trim())
          .filter(Boolean)
      )
    ).slice(0, 4);

    // Try fetching from dedicated NewsAPI first if configured
    let news: any[] = await this.aiFacade.getLatestSportsNews(cappedSportKeys);

    // If NewsAPI returned nothing (not configured or error), fall back to OpenRouter with Search
    if (news.length === 0) {
      try {
        const aiNews = await this.aiFacade.generateNews(cappedSportKeys, languageCode);
        const mappedNews: any[] = aiNews.map((item) => ({
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
      } catch {
        // Never fail the entire endpoint on external AI/provider issues.
        news = [];
      }
    }

    return {
      news,
      sportScope: cappedSportKeys,
      refreshedAt: new Date().toISOString(),
      language: languageCode,
      source: news[0]?.id?.startsWith('newsapi') ? 'NewsAPI' : (news.length ? 'AI-Search' : 'unavailable'),
    };
  }

  @Get('daily-tips')
  async getDailyTipsList(@Request() req: any) {
    const tickets = await this.aiFacade.getDailyTickets(req.user.id);

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
    const user = await this.aiFacade.findUserById(req.user.id);
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

    const ticket = await this.aiFacade.getCustomTicket(req.user.id, {
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
    const alerts = await this.aiFacade.getSharpMoneyAlerts(req.user.id);

    return {
      alerts,
      total: alerts.length,
      generatedAt: new Date().toISOString(),
    };
  }

  @Get('sharp-money/live')
  async getLiveSharpAction() {
    const alerts = await this.aiFacade.getLiveSharpAction();

    return {
      alerts,
      total: alerts.length,
      isLive: true,
      generatedAt: new Date().toISOString(),
    };
  }

  @Get('sharp-money/summary')
  async getSharpMoneySummary() {
    const summary = await this.aiFacade.getSteamMovesSummary();

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
    const language = await this.aiFacade.getLanguageFromIP(ipAddress);
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
    const user = await this.aiFacade.findUserById(userId);
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
      upcomingEvents = await this.aiFacade.db.event.findMany({
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
        standings = await this.aiFacade.db.standing.findMany({
          where: { teamId: { in: teamIds } },
          include: { team: true, league: true },
          orderBy: { updatedAt: 'desc' },
          take: 10,
        });
      }
    }

    // Fetch news for relevant sports
    const news = await this.aiFacade.getLatestSportsNews(['soccer', 'basketball']);

    // 5. Call OpenRouter chat
    const response = await this.aiFacade.chat(message, {
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

  // ========== Async Job Queue Endpoints ==========

  /**
   * Create an async job for AI advice generation
   * Returns immediately with a job ID
   */
  @Post('advice/async')
  async createAdviceJob(@Request() req: any, @Ip() ipAddress: string) {
    const user = await this.aiFacade.findUserById(req.user.id);
    const languageCode = await this.getUserLanguage(req.user.id, ipAddress);

    // Get user's active AI configuration
    const activeConfig = await this.aiFacade.db.aiConfiguration.findFirst({
      where: { userId: req.user.id, isActive: true },
    });

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

    // Get upcoming matches
    const events = await this.aiFacade.db.event.findMany({
      where: {
        sport: { key: configuration.sportKey },
        status: { in: ['upcoming', 'live'] },
        startTimeUtc: { gte: new Date() },
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
          where: { market: { marketKey: 'h2h' } },
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

    const jobId = await this.aiQueue.createJob(req.user.id, 'advice', {
      configuration,
      matches,
      languageCode,
      userId: req.user.id,
      ipAddress,
    });

    return {
      jobId,
      status: 'pending',
      message: 'AI advice generation started. Use GET /v1/ai/jobs/:jobId to check status.',
    };
  }

  /**
   * Create an async job for AI news generation
   */
  @Post('news/async')
  async createNewsJob(@Request() req: any, @Ip() ipAddress: string) {
    const languageCode = await this.getUserLanguage(req.user.id, ipAddress);
    const user = await this.aiFacade.findUserById(req.user.id);
    const preferences = JSON.parse(user?.preferences || '{}');
    const aiSettings = preferences.aiSettings || {
      sportScope: ['soccer', 'basketball', 'tennis', 'american_football'],
    };

    const activeConfig = await this.aiFacade.db.aiConfiguration.findFirst({
      where: { userId: req.user.id, isActive: true },
    });

    const sportKeys = activeConfig
      ? [activeConfig.sportKey, ...aiSettings.sportScope.filter((s: string) => s !== activeConfig.sportKey)]
      : aiSettings.sportScope;

    const cappedSportKeys: string[] = Array.from(
      new Set(
        (Array.isArray(sportKeys) ? sportKeys : [])
          .map((s: any) => String(s || '').trim())
          .filter(Boolean)
      )
    ).slice(0, 4);

    const jobId = await this.aiQueue.createJob(req.user.id, 'news', {
      sportKeys: cappedSportKeys,
      languageCode,
      userId: req.user.id,
    });

    return {
      jobId,
      status: 'pending',
      message: 'AI news generation started. Use GET /v1/ai/jobs/:jobId to check status.',
    };
  }

  /**
   * Get job status and result
   */
  @Get('jobs/:jobId')
  async getJobStatus(@Request() req: any, @Param('jobId') jobId: string) {
    const job = this.aiQueue.getJob(jobId, req.user.id);
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return {
      id: job.id,
      type: job.type,
      status: job.status,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      result: job.status === JobStatus.COMPLETED ? job.result : undefined,
      error: job.status === JobStatus.FAILED ? job.error : undefined,
      progress: job.progress,
    };
  }

  /**
   * Cancel a pending job
   */
  @Post('jobs/:jobId/cancel')
  async cancelJob(@Request() req: any, @Param('jobId') jobId: string) {
    const cancelled = this.aiQueue.cancelJob(jobId, req.user.id);
    if (!cancelled) {
      throw new NotFoundException('Job not found or cannot be cancelled');
    }

    return {
      jobId,
      status: 'cancelled',
      message: 'Job cancelled successfully',
    };
  }
}
