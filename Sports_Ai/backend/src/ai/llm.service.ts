import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { OpenRouterService, AiAdvice, AiNewsItem } from './openrouter.service';
import { ZaiService } from './zai.service';

export type LlmProvider = 'openrouter' | 'zai' | 'auto';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly provider: LlmProvider;

  constructor(
    private readonly openRouterService: OpenRouterService,
    private readonly zaiService: ZaiService,
  ) {
    // Determine which provider to use
    const configuredProvider = (process.env.LLM_PROVIDER || 'auto').toLowerCase() as LlmProvider;
    
    if (configuredProvider === 'auto') {
      // Auto-detect: prefer z.ai if configured, otherwise OpenRouter
      if (this.zaiService.isConfigured()) {
        this.provider = 'zai';
        this.logger.log('Using Z.AI as LLM provider (auto-detected)');
      } else {
        this.provider = 'openrouter';
        this.logger.log('Using OpenRouter as LLM provider (auto-detected)');
      }
    } else {
      this.provider = configuredProvider;
      this.logger.log(`Using ${this.provider} as LLM provider (configured)`);
    }

    // Validate provider is available
    if (this.provider === 'zai' && !this.zaiService.isConfigured()) {
      this.logger.warn('Z.AI requested but not configured, falling back to OpenRouter');
      this.provider = 'openrouter';
    }
  }

  /**
   * Get the currently active provider
   */
  getProvider(): LlmProvider {
    return this.provider;
  }

  /**
   * Check if a specific provider is configured
   */
  isProviderConfigured(provider: LlmProvider): boolean {
    if (provider === 'zai') {
      return this.zaiService.isConfigured();
    }
    if (provider === 'openrouter') {
      return !!process.env.OPENROUTER_API_KEY;
    }
    return false;
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
    if (this.provider === 'zai') {
      return this.zaiService.generateAdvice(configuration, matches, languageCode);
    }
    return this.openRouterService.generateAdvice(configuration, matches, languageCode);
  }

  async generateNews(
    sportKeys: string[],
    languageCode: string = 'en',
  ): Promise<AiNewsItem[]> {
    if (this.provider === 'zai') {
      return this.zaiService.generateNews(sportKeys, languageCode);
    }
    return this.openRouterService.generateNews(sportKeys, languageCode);
  }

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
    if (this.provider === 'zai') {
      return this.zaiService.chat(message, context);
    }
    return this.openRouterService.chat(message, context);
  }
}
