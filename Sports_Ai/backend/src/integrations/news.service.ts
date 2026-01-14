import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

export interface NewsArticle {
  id: string;
  headline: string;
  summary: string;
  url: string;
  source: string;
  sport: string;
  publishedAt: string;
  impact: 'high' | 'medium' | 'low';
}

@Injectable()
export class NewsService implements OnModuleInit {
  private readonly logger = new Logger(NewsService.name);
  private client: AxiosInstance;
  private apiKey: string;
  private readonly baseUrl = 'https://newsapi.org/v2';
  private readonly timeoutMs = Number(process.env.NEWS_API_TIMEOUT_MS || 8000);

  // Simple in-memory cache to avoid slow upstream calls on every page load.
  // Keyed by normalized sport list. TTL is intentionally short.
  private cache = new Map<string, { fetchedAt: number; items: NewsArticle[] }>();
  private readonly cacheTtlMs = Number(process.env.NEWS_CACHE_TTL_MS || 5 * 60 * 1000);

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('NEWS_API_KEY') || '';
  }

  onModuleInit() {
    if (this.apiKey) {
      this.client = axios.create({
        baseURL: this.baseUrl,
        headers: {
          'X-Api-Key': this.apiKey,
        },
        timeout: this.timeoutMs,
      });
    }
  }

  private cacheKey(sports: string[]): string {
    return (sports || [])
      .map((s) => String(s || '').trim().toLowerCase())
      .filter(Boolean)
      .sort()
      .join(',');
  }

  /**
   * Fetches latest sports news from NewsAPI.org
   */
  async getLatestSportsNews(sports: string[] = ['soccer', 'basketball']): Promise<NewsArticle[]> {
    if (!this.apiKey) {
      this.logger.warn('NEWS_API_KEY not configured, returning empty news array');
      return [];
    }

    const key = this.cacheKey(sports);
    const cached = this.cache.get(key);
    const now = Date.now();
    if (cached && now - cached.fetchedAt <= this.cacheTtlMs) {
      return cached.items;
    }

    try {
      const query = sports.join(' OR ');
      const response = await this.client.get('/everything', {
        params: {
          q: `(${query}) AND (injury OR transfer OR lineup OR "betting odds")`,
          language: 'en',
          sortBy: 'publishedAt',
          pageSize: 10,
          category: 'sports',
        },
      });

      const items: NewsArticle[] = response.data.articles.map((article: any, index: number) => ({
        id: `newsapi-${Date.now()}-${index}`,
        headline: article.title,
        summary: article.description,
        url: article.url,
        source: article.source.name,
        sport: this.detectSport(article.title + ' ' + article.description, sports),
        publishedAt: article.publishedAt,
        impact: this.detectImpact(article.title + ' ' + article.description),
      }));

      this.cache.set(key, { fetchedAt: now, items });
      return items;
    } catch (error: any) {
      this.logger.error(`Failed to fetch news from NewsAPI: ${error?.message || String(error)}`);
      // If upstream fails, serve stale cache if we have it.
      if (cached?.items?.length) {
        return cached.items;
      }
      return [];
    }
  }

  private detectSport(text: string, sports: string[]): string {
    const textLower = text.toLowerCase();
    for (const sport of sports) {
      if (textLower.includes(sport.toLowerCase())) return sport;
    }
    return sports[0] || 'sports';
  }

  private detectImpact(text: string): 'high' | 'medium' | 'low' {
    const textLower = text.toLowerCase();
    const highImpactKeywords = ['out for season', 'acl tear', 'broken leg', 'suspended', 'major injury', 'confirmed lineup'];
    const mediumImpactKeywords = ['doubtful', 'questionable', 'transfer rumor', 'minor injury', 'coach comments'];

    if (highImpactKeywords.some(k => textLower.includes(k))) return 'high';
    if (mediumImpactKeywords.some(k => textLower.includes(k))) return 'medium';
    return 'low';
  }
}
