import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Browser, chromium } from 'playwright';
import type { FlashscoreMatch, FlashscoreMatchStatus } from './flashscore.types';

type CacheEntry<T> = { expiresAt: number; value: T };

@Injectable()
export class FlashscoreService implements OnModuleDestroy {
  private readonly logger = new Logger(FlashscoreService.name);
  private browser?: Browser;
  private browserInit?: Promise<Browser>;

  private readonly enabled =
    (process.env.FLASHSCORE_ENABLED || 'true').toLowerCase() === 'true';
  private readonly timeoutMs = Number(process.env.FLASHSCORE_TIMEOUT_MS || 15_000);
  private readonly cacheTtlMs = Number(process.env.FLASHSCORE_CACHE_TTL_MS || 60_000);
  private readonly concurrency = Math.max(1, Number(process.env.FLASHSCORE_CONCURRENCY || 2));

  private readonly cache = new Map<string, CacheEntry<FlashscoreMatch>>();

  async onModuleDestroy() {
    try {
      await this.browser?.close();
    } catch {
      // ignore
    } finally {
      this.browser = undefined;
      this.browserInit = undefined;
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser) return this.browser;
    if (this.browserInit) return this.browserInit;

    this.browserInit = chromium
      .launch({
        headless: true,
        args: [
          '--disable-dev-shm-usage',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
        ],
      })
      .then((b) => {
        this.browser = b;
        return b;
      })
      .finally(() => {
        this.browserInit = undefined;
      });

    return this.browserInit;
  }

  private normalizeUrl(url: string): string {
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      throw new BadRequestException(`Invalid URL: ${url}`);
    }

    if (!/flashscore\./i.test(u.hostname)) {
      throw new BadRequestException(`URL must be a Flashscore URL: ${url}`);
    }

    return u.toString();
  }

  private getFromCache(url: string): FlashscoreMatch | null {
    const entry = this.cache.get(url);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(url);
      return null;
    }
    return entry.value;
  }

  private setCache(url: string, value: FlashscoreMatch) {
    this.cache.set(url, { expiresAt: Date.now() + this.cacheTtlMs, value });
  }

  private async withTimeout<T>(p: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (await Promise.race([
        p,
        new Promise<T>((_, reject) =>
          ac.signal.addEventListener('abort', () => reject(new Error(`${label} timed out`)), {
            once: true,
          }),
        ),
      ])) as T;
    } finally {
      clearTimeout(t);
    }
  }

  private parseStatus(raw: string | null | undefined): FlashscoreMatchStatus {
    const s = (raw || '').toLowerCase();
    if (!s) return 'unknown';
    if (s.includes('finished') || s.includes('ft') || s.includes('ended')) return 'finished';
    if (s.includes('live') || s.includes("'") || s.includes('ht')) return 'live';
    if (s.includes('scheduled') || s.includes('not started') || s.includes('starts')) return 'scheduled';
    return 'unknown';
  }

  private async scrapeMatch(url: string): Promise<FlashscoreMatch> {
    const browser = await this.getBrowser();
    const page = await browser.newPage({
      userAgent:
        process.env.FLASHSCORE_USER_AGENT ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-US',
    });

    try {
      // Speed-up: block images/fonts/media
      await page.route('**/*', (route) => {
        const type = route.request().resourceType();
        if (type === 'image' || type === 'media' || type === 'font') return route.abort();
        return route.continue();
      });

      await this.withTimeout(
        page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.timeoutMs }),
        this.timeoutMs,
        'Flashscore navigation',
      );

      // Give client-side render a moment
      await page.waitForTimeout(500);

      const extracted = await this.withTimeout(
        page.evaluate(() => {
          // Backend TS config doesn't include DOM libs; access via globalThis to avoid `document` typing.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const doc = (globalThis as any).document as any;

          const firstText = (selectors: string[]): string | null => {
            for (const sel of selectors) {
              const el = doc?.querySelector?.(sel);
              const t = el?.textContent?.trim();
              if (t) return t;
            }
            return null;
          };

          const firstNumber = (selectors: string[]): number | null => {
            const t = firstText(selectors);
            if (!t) return null;
            const m = t.match(/-?\d+/);
            return m ? Number(m[0]) : null;
          };

          const homeTeam =
            firstText([
              '.duelParticipant__home .participant__participantName',
              '.duelParticipant__home .participant__participantNameWrapper',
              '.duelParticipant__home .participant__participantName span',
              '.duelParticipant__home',
            ]) || '';

          const awayTeam =
            firstText([
              '.duelParticipant__away .participant__participantName',
              '.duelParticipant__away .participant__participantNameWrapper',
              '.duelParticipant__away .participant__participantName span',
              '.duelParticipant__away',
            ]) || '';

          const homeScore =
            firstNumber(['.detailScore__home', '.detailScore__wrapper .detailScore__home']) ??
            null;
          const awayScore =
            firstNumber(['.detailScore__away', '.detailScore__wrapper .detailScore__away']) ??
            null;

          const scoreWrapper =
            firstText([
              '.detailScore__wrapper',
              '.detailScore__wrapper span',
              '.detailScore__wrapper div',
              '.detailScore',
            ]) || null;

          // Fallback: parse "2 - 1" style wrapper text.
          let homeScoreParsed = homeScore;
          let awayScoreParsed = awayScore;
          if ((homeScoreParsed === null || awayScoreParsed === null) && scoreWrapper) {
            const nums = scoreWrapper.match(/\d+/g);
            if (nums && nums.length >= 2) {
              homeScoreParsed = Number(nums[0]);
              awayScoreParsed = Number(nums[1]);
            }
          }

          const status =
            firstText(['.detailScore__status', '.eventTime', '.detailScore__time']) || null;

          const startTime =
            firstText(['.duelParticipant__startTime', '.duelParticipant__startTime div']) || null;

          const tournament =
            firstText(['.tournamentHeader__country', '.tournamentHeader__country a']) || null;

          return {
            homeTeam,
            awayTeam,
            homeScore: homeScoreParsed,
            awayScore: awayScoreParsed,
            status,
            startTime,
            tournament,
          };
        }),
        this.timeoutMs,
        'Flashscore extraction',
      );

      if (!extracted.homeTeam || !extracted.awayTeam) {
        throw new Error('Could not extract team names from page (layout may have changed)');
      }

      const match: FlashscoreMatch = {
        url,
        homeTeam: extracted.homeTeam,
        awayTeam: extracted.awayTeam,
        homeScore: extracted.homeScore ?? undefined,
        awayScore: extracted.awayScore ?? undefined,
        status: this.parseStatus(extracted.status),
        startTime: extracted.startTime ?? undefined,
        tournament: extracted.tournament ?? undefined,
        scrapedAt: new Date().toISOString(),
      };

      return match;
    } finally {
      await page.close().catch(() => undefined);
    }
  }

  async fetchMatch(url: string): Promise<FlashscoreMatch> {
    if (!this.enabled) {
      throw new ServiceUnavailableException('Flashscore scraping is disabled (FLASHSCORE_ENABLED=false)');
    }

    const normalized = this.normalizeUrl(url);
    const cached = this.getFromCache(normalized);
    if (cached) return cached;

    try {
      const match = await this.scrapeMatch(normalized);
      this.setCache(normalized, match);
      return match;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Flashscore scrape failed: ${msg}`);
      throw new ServiceUnavailableException(`Flashscore scrape failed: ${msg}`);
    }
  }

  private async mapWithConcurrency<T, R>(
    items: T[],
    limit: number,
    fn: (item: T) => Promise<R>,
  ): Promise<Array<PromiseSettledResult<R>>> {
    const results: Array<PromiseSettledResult<R>> = new Array(items.length);
    let idx = 0;

    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (true) {
        const current = idx++;
        if (current >= items.length) break;
        try {
          const value = await fn(items[current]);
          results[current] = { status: 'fulfilled', value };
        } catch (reason) {
          results[current] = { status: 'rejected', reason };
        }
      }
    });

    await Promise.all(workers);
    return results;
  }

  async fetchMatches(urls: string[]): Promise<{
    matches: FlashscoreMatch[];
    errors: Array<{ url: string; error: string }>;
  }> {
    if (!Array.isArray(urls) || urls.length === 0) {
      throw new BadRequestException('urls must be a non-empty array');
    }

    const settled = await this.mapWithConcurrency(
      urls,
      this.concurrency,
      async (u) => this.fetchMatch(u),
    );

    const matches: FlashscoreMatch[] = [];
    const errors: Array<{ url: string; error: string }> = [];

    for (let i = 0; i < settled.length; i++) {
      const r = settled[i];
      if (r.status === 'fulfilled') {
        matches.push(r.value);
      } else {
        const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
        errors.push({ url: urls[i], error: msg });
      }
    }

    return { matches, errors };
  }
}

