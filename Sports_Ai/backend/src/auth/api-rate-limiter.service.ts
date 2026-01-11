import { Injectable } from '@nestjs/common';

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitConfig {
  maxTokens: number;
  refillRate: number; // tokens per second
  refillInterval: number; // ms
}

/**
 * General API Rate Limiter using Token Bucket algorithm
 * This provides per-user rate limiting across all API endpoints
 */
@Injectable()
export class ApiRateLimiterService {
  // Store buckets per user (userId) or IP for unauthenticated requests
  private readonly buckets = new Map<string, RateLimitBucket>();

  // Default configuration: 100 requests per minute per user
  private readonly defaultConfig: RateLimitConfig = {
    maxTokens: 100, // max requests
    refillRate: 100 / 60, // ~1.67 tokens per second
    refillInterval: 60 * 1000, // full refill every minute
  };

  // Endpoint-specific rate limits (some endpoints may have stricter limits)
  private readonly endpointConfigs: Map<string, RateLimitConfig> = new Map([
    // Auth endpoints - stricter limits
    ['/v1/auth/login', { maxTokens: 5, refillRate: 5 / 900, refillInterval: 15 * 60 * 1000 }],
    ['/v1/auth/signup', { maxTokens: 3, refillRate: 3 / 3600, refillInterval: 60 * 60 * 1000 }],
    ['/v1/auth/forgot-password', { maxTokens: 3, refillRate: 3 / 3600, refillInterval: 60 * 60 * 1000 }],
    // Credit purchase - moderate limits
    ['/v1/credits/purchase', { maxTokens: 10, refillRate: 10 / 3600, refillInterval: 60 * 60 * 1000 }],
    // Arbitrage unlock - moderate limits
    ['/v1/arbitrage/unlock', { maxTokens: 20, refillRate: 20 / 3600, refillInterval: 60 * 60 * 1000 }],
  ]);

  /**
   * Get the configuration for a specific endpoint
   */
  private getConfig(endpoint: string): RateLimitConfig {
    // Check for exact match
    if (this.endpointConfigs.has(endpoint)) {
      return this.endpointConfigs.get(endpoint)!;
    }

    // Check for prefix match (for parameterized routes)
    for (const [pattern, config] of this.endpointConfigs) {
      if (endpoint.startsWith(pattern.replace(/\/:[^/]+/g, ''))) {
        return config;
      }
    }

    return this.defaultConfig;
  }

  /**
   * Get or create a bucket for the given identifier
   */
  private getBucket(identifier: string, config: RateLimitConfig): RateLimitBucket {
    const existing = this.buckets.get(identifier);
    const now = Date.now();

    if (existing) {
      // Refill tokens based on time passed
      const timePassed = now - existing.lastRefill;
      const tokensToAdd = Math.floor(timePassed / 1000 * config.refillRate);

      if (tokensToAdd > 0) {
        existing.tokens = Math.min(config.maxTokens, existing.tokens + tokensToAdd);
        existing.lastRefill = now;
      }

      return existing;
    }

    // Create new bucket with full tokens
    const newBucket: RateLimitBucket = {
      tokens: config.maxTokens,
      lastRefill: now,
    };
    this.buckets.set(identifier, newBucket);
    return newBucket;
  }

  /**
   * Check if a request is allowed and consume a token if so
   * Returns { allowed: boolean, remaining: number, retryAfter?: number, limit: number }
   */
  checkAndConsume(
    userId: string | null,
    ip: string,
    endpoint: string
  ): { allowed: boolean; remaining: number; retryAfter?: number; limit: number } {
    // Use userId if authenticated, otherwise use IP
    const identifier = userId ? `user:${userId}:${endpoint}` : `ip:${ip}:${endpoint}`;
    const config = this.getConfig(endpoint);
    const bucket = this.getBucket(identifier, config);

    if (bucket.tokens > 0) {
      bucket.tokens--;
      return {
        allowed: true,
        remaining: bucket.tokens,
        limit: config.maxTokens,
      };
    }

    // Calculate retry-after based on refill rate
    const secondsUntilNextToken = Math.ceil(1 / config.refillRate);

    return {
      allowed: false,
      remaining: 0,
      retryAfter: secondsUntilNextToken,
      limit: config.maxTokens,
    };
  }

  /**
   * Get current status for a given identifier
   */
  getStatus(
    userId: string | null,
    ip: string,
    endpoint: string
  ): { remaining: number; limit: number; reset: number } {
    const identifier = userId ? `user:${userId}:${endpoint}` : `ip:${ip}:${endpoint}`;
    const config = this.getConfig(endpoint);
    const bucket = this.getBucket(identifier, config);

    // Calculate when the bucket will be fully refilled
    const tokensNeeded = config.maxTokens - bucket.tokens;
    const secondsToFull = Math.ceil(tokensNeeded / config.refillRate);

    return {
      remaining: bucket.tokens,
      limit: config.maxTokens,
      reset: Math.floor(Date.now() / 1000) + secondsToFull,
    };
  }

  /**
   * Clean up old buckets periodically (call this from a scheduled job)
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [key, bucket] of this.buckets) {
      if (now - bucket.lastRefill > maxAge) {
        this.buckets.delete(key);
      }
    }
  }
}
