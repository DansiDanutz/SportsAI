import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  BadGatewayException,
} from '@nestjs/common';
import { LanguageService } from './language.service';

interface ZaiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ZaiResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AiAdvice {
  id: string;
  title: string;
  content: string;
  category: 'strategy' | 'insight' | 'warning' | 'opportunity';
  confidence: number;
  sport?: string;
  relatedMatch?: string;
  createdAt: string;
}

export interface AiNewsItem {
  id: string;
  headline: string;
  summary: string;
  sport: string;
  impact: 'high' | 'medium' | 'low';
  createdAt: string;
}

@Injectable()
export class ZaiService {
  private readonly logger = new Logger(ZaiService.name);
  private readonly apiUrl = process.env.ZAI_API_URL || 'https://api.z.ai/v1/chat/completions';
  // Default model - can be overridden via ZAI_MODEL env var
  // Using glm-4 as the base GLM model (can be changed to glm-4-plus, glm-4.6, etc.)
  private readonly defaultModel = process.env.ZAI_MODEL || 'glm-4';
  
  constructor(private languageService: LanguageService) {
    // No fallback content: never fabricate responses.
  }

  private async fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(t);
    }
  }

  /**
   * Check if Z.AI is configured
   */
  isConfigured(): boolean {
    return !!process.env.ZAI_API_KEY;
  }

  async generateAdvice(
    configuration: {
      sportKey: string;
      countries: string[];
      leagues: string[];
      markets: string[];
    },
    matches: Array<{
      homeTeam: string;
      awayTeam: string;
      league: string;
      startTime: string;
      odds: { home: number; draw?: number; away: number };
    }>,
    languageCode: string = 'en',
  ): Promise<AiAdvice[]> {
    const apiKey = process.env.ZAI_API_KEY;

    if (!apiKey) {
      throw new ServiceUnavailableException('ZAI_API_KEY not configured');
    }

    const translationInstruction = this.languageService.getTranslationInstruction(languageCode);

    const systemPrompt = `You are an expert sports betting analyst AI. You provide clear, actionable betting advice based on statistical analysis, historical trends, and current odds.

Your advice should be:
- Data-driven and objective
- Clear about risk levels
- Focused on value opportunities
- Respectful of responsible gambling

${translationInstruction}

Format your response as a JSON array of advice objects with this structure:
[
  {
    "title": "Brief advice title",
    "content": "Detailed explanation of the advice",
    "category": "strategy|insight|warning|opportunity",
    "confidence": 70-95,
    "relatedMatch": "Team A vs Team B (if applicable)"
  }
]

Only return the JSON array, no other text.`;

    const userPrompt = this.buildUserPrompt(configuration, matches);

    try {
      const timeoutMs = Number(process.env.ZAI_TIMEOUT_MS || 12000);
      const response = await this.fetchWithTimeout(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ] as ZaiMessage[],
          temperature: 0.7,
          max_tokens: 1500,
        }),
      }, timeoutMs);

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Z.AI API error: ${error}`);
        throw new BadGatewayException('Z.AI API error');
      }

      const data = (await response.json()) as ZaiResponse;
      const content = data.choices[0]?.message?.content || '';

      // Parse the JSON response
      try {
        const adviceArray = JSON.parse(content);
        return adviceArray.map((advice: any, index: number) => ({
          id: `advice-${Date.now()}-${index}`,
          title: advice.title || 'AI Insight',
          content: advice.content || '',
          category: advice.category || 'insight',
          confidence: advice.confidence || 75,
          sport: configuration.sportKey,
          relatedMatch: advice.relatedMatch,
          createdAt: new Date().toISOString(),
        }));
      } catch {
        throw new BadGatewayException('Failed to parse AI response from Z.AI');
      }
    } catch (error) {
      this.logger.error(`Z.AI request failed: ${error}`);
      throw new BadGatewayException('Z.AI request failed');
    }
  }

  async generateNews(
    sportKeys: string[],
    languageCode: string = 'en',
  ): Promise<AiNewsItem[]> {
    const apiKey = process.env.ZAI_API_KEY;

    if (!apiKey) {
      throw new ServiceUnavailableException('ZAI_API_KEY not configured');
    }

    const translationInstruction = this.languageService.getTranslationInstruction(languageCode);

    const systemPrompt = `You are a sports news AI that provides relevant updates for sports bettors. Generate news items about injuries, team form, weather impacts, and other factors that affect betting markets.

${translationInstruction}

Format your response as a JSON array of news objects with this structure:
[
  {
    "headline": "Brief headline",
    "summary": "2-3 sentence summary",
    "sport": "soccer|basketball|tennis|etc",
    "impact": "high|medium|low"
  }
]

Only return the JSON array, no other text.`;

    const userPrompt = `Generate 5 relevant sports news items for betting analysis. Focus on these sports: ${sportKeys.join(', ')}. Include updates about:
- Key player injuries or returns
- Team form and momentum
- Weather or venue factors
- Market movements and sharp action
- Historical matchup insights`;

    try {
      const timeoutMs = Number(process.env.ZAI_TIMEOUT_MS || 12000);
      const response = await this.fetchWithTimeout(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ] as ZaiMessage[],
          temperature: 0.8,
          max_tokens: 1000,
        }),
      }, timeoutMs);

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Z.AI API error: ${error}`);
        throw new BadGatewayException('Z.AI API error');
      }

      const data = (await response.json()) as ZaiResponse;
      const content = data.choices[0]?.message?.content || '';

      // Parse the JSON response
      try {
        const newsArray = JSON.parse(content);
        return newsArray.map((news: any, index: number) => ({
          id: `news-${Date.now()}-${index}`,
          headline: news.headline || 'Sports Update',
          summary: news.summary || '',
          sport: news.sport || sportKeys[0] || 'general',
          impact: news.impact || 'medium',
          createdAt: new Date().toISOString(),
        }));
      } catch {
        throw new BadGatewayException('Failed to parse AI news response from Z.AI');
      }
    } catch (error) {
      const msg = (error as any)?.name === 'AbortError' ? 'timeout' : String(error);
      this.logger.error(`Z.AI news request failed: ${msg}`);
      throw new BadGatewayException('Z.AI news request failed');
    }
  }

  /**
   * General chat method. No mock fallback: requires ZAI_API_KEY.
   */
  async chat(
    message: string,
    context: {
      userPreferences: any;
      relevantMatches: any[];
      recentNews: any[];
      standings?: any[];
      languageCode: string;
    },
  ): Promise<string> {
    const apiKey = process.env.ZAI_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException('ZAI_API_KEY not configured');
    }

    const translationInstruction = this.languageService.getTranslationInstruction(context.languageCode);

    const systemPrompt = `You are the SportsAI Concierge, a sports betting assistant.
You must be explicit when information is missing. Do not fabricate live odds, injuries, or results.

Context:
- User Preferences: ${JSON.stringify(context.userPreferences)}
- Relevant Matches: ${JSON.stringify(context.relevantMatches)}
- Recent News: ${JSON.stringify(context.recentNews)}
- Standings: ${JSON.stringify(context.standings || [])}

${translationInstruction}`;

    try {
      const timeoutMs = Number(process.env.ZAI_TIMEOUT_MS || 12000);
      const response = await this.fetchWithTimeout(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ] as ZaiMessage[],
          temperature: 0.6,
          max_tokens: 1200,
        }),
      }, timeoutMs);

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Z.AI chat error: ${error}`);
        throw new BadGatewayException('Z.AI API error');
      }

      const data = (await response.json()) as ZaiResponse;
      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      this.logger.error(`Z.AI chat request failed: ${error}`);
      throw new BadGatewayException('Z.AI request failed');
    }
  }

  private buildUserPrompt(
    configuration: {
      sportKey: string;
      countries: string[];
      leagues: string[];
      markets: string[];
    },
    matches: Array<{
      homeTeam: string;
      awayTeam: string;
      league: string;
      startTime: string;
      odds: { home: number; draw?: number; away: number };
    }>,
  ): string {
    let prompt = `Analyze the following betting configuration and upcoming matches to provide strategic advice:

Configuration:
- Sport: ${configuration.sportKey}
- Countries: ${configuration.countries.length > 0 ? configuration.countries.join(', ') : 'All'}
- Leagues: ${configuration.leagues.length > 0 ? configuration.leagues.join(', ') : 'All'}
- Markets: ${configuration.markets.length > 0 ? configuration.markets.join(', ') : 'All'}

Upcoming Matches:
`;

    matches.forEach((match, index) => {
      prompt += `
${index + 1}. ${match.homeTeam} vs ${match.awayTeam}
   League: ${match.league}
   Date: ${match.startTime}
   Odds: Home ${match.odds.home}${match.odds.draw ? ` | Draw ${match.odds.draw}` : ''} | Away ${match.odds.away}`;
    });

    prompt += `

Provide 4-5 pieces of advice covering:
1. A value betting opportunity
2. A strategic insight about one of the matches
3. A risk warning if applicable
4. A general market observation`;

    return prompt;
  }
}
