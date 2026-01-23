import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitConfig {
  maxTokens: number;
  refillRate: number; // tokens per second
  refillInterval: number; // ms
}

type SubscriptionTier = 'free' | 'premium' | 'pro' | 'admin';

/**
 * General API Rate Limiter using Token Bucket algorithm
 * This provides per-user rate limiting across all API endpoints
 */
@Injectable()
export class ApiRateLimiterService implements OnModuleInit {
  // Store buckets per user (userId) or IP for unauthenticated requests
  private readonly buckets = new Map<string, RateLimitBucket>();

  // Tiered default configurations
  private readonly tieredConfigs: Map<SubscriptionTier, RateLimitConfig> = new Map([
    ['free', {
      maxTokens: 60, // 60 requests per minute
      refillRate: 60 / 60, // 1 token per second
      refillInterval: 60 * 1000,
    }],
    ['premium', {
      maxTokens: 200, // 200 requests per minute
      refillRate: 200 / 60, // ~3.33 tokens per second
      refillInterval: 60 * 1000,
    }],
    ['pro', {
      maxTokens: 500, // 500 requests per minute
      refillRate: 500 / 60, // ~8.33 tokens per second
      refillInterval: 60 * 1000,
    }],
    ['admin', {
      maxTokens: 1000, // 1000 requests per minute
      refillRate: 1000 / 60, // ~16.67 tokens per second
      refillInterval: 60 * 1000,
    }],
  ]);

  // Default configuration for unauthenticated users
  private readonly defaultConfig: RateLimitConfig = {
    maxTokens: 30, // 30 requests per minute for unauthenticated
    refillRate: 30 / 60, // 0.5 tokens per second
    refillInterval: 60 * 1000,
  };

  // Endpoint-specific rate limits (overrides tiered configs)
  // Format: { endpoint: { free: config, premium: config, pro: config, admin: config } }
  private readonly endpointConfigs: Map<string, Partial<Record<SubscriptionTier, RateLimitConfig>>> = new Map([
    // Auth endpoints - strict limits for all tiers
    ['/v1/auth/login', {
      free: { maxTokens: 5, refillRate: 5 / 900, refillInterval: 15 * 60 * 1000 },
      premium: { maxTokens: 10, refillRate: 10 / 900, refillInterval: 15 * 60 * 1000 },
      pro: { maxTokens: 20, refillRate: 20 / 900, refillInterval: 15 * 60 * 1000 },
      admin: { maxTokens: 50, refillRate: 50 / 900, refillInterval: 15 * 60 * 1000 },
    }],
    ['/v1/auth/signup', {
      free: { maxTokens: 3, refillRate: 3 / 3600, refillInterval: 60 * 60 * 1000 },
      premium: { maxTokens: 5, refillRate: 5 / 3600, refillInterval: 60 * 60 * 1000 },
      pro: { maxTokens: 10, refillRate: 10 / 3600, refillInterval: 60 * 60 * 1000 },
      admin: { maxTokens: 20, refillRate: 20 / 3600, refillInterval: 60 * 60 * 1000 },
    }],
    ['/v1/auth/forgot-password', {
      free: { maxTokens: 3, refillRate: 3 / 3600, refillInterval: 60 * 60 * 1000 },
      premium: { maxTokens: 5, refillRate: 5 / 3600, refillInterval: 60 * 60 * 1000 },
      pro: { maxTokens: 10, refillRate: 10 / 3600, refillInterval: 60 * 60 * 1000 },
      admin: { maxTokens: 20, refillRate: 20 / 3600, refillInterval: 60 * 60 * 1000 },
    }],
    // Credit purchase - tiered limits
    ['/v1/credits/purchase', {
      free: { maxTokens: 5, refillRate: 5 / 3600, refillInterval: 60 * 60 * 1000 },
      premium: { maxTokens: 20, refillRate: 20 / 3600, refillInterval: 60 * 60 * 1000 },
      pro: { maxTokens: 50, refillRate: 50 / 3600, refillInterval: 60 * 60 * 1000 },
      admin: { maxTokens: 100, refillRate: 100 / 3600, refillInterval: 60 * 60 * 1000 },
    }],
    // Arbitrage unlock - tiered limits
    ['/v1/arbitrage/unlock', {
      free: { maxTokens: 10, refillRate: 10 / 3600, refillInterval: 60 * 60 * 1000 },
      premium: { maxTokens: 50, refillRate: 50 / 3600, refillInterval: 60 * 60 * 1000 },
      pro: { maxTokens: 200, refillRate: 200 / 3600, refillInterval: 60 * 60 * 1000 },
      admin: { maxTokens: 500, refillRate: 500 / 3600, refillInterval: 60 * 60 * 1000 },
    }],
    // AI endpoints - tiered limits
    ['/v1/ai/advice', {
      free: { maxTokens: 10, refillRate: 10 / 3600, refillInterval: 60 * 60 * 1000 },
      premium: { maxTokens: 100, refillRate: 100 / 3600, refillInterval: 60 * 60 * 1000 },
      pro: { maxTokens: 500, refillRate: 500 / 3600, refillInterval: 60 * 60 * 1000 },
      admin: { maxTokens: 1000, refillRate: 1000 / 3600, refillInterval: 60 * 60 * 1000 },
    }],
    ['/v1/ai/tips', {
      free: { maxTokens: 5, refillRate: 5 / 3600, refillInterval: 60 * 60 * 1000 },
      premium: { maxTokens: 50, refillRate: 50 / 3600, refillInterval: 60 * 60 * 1000 },
      pro: { maxTokens: 200, refillRate: 200 / 3600, refillInterval: 60 * 60 * 1000 },
      admin: { maxTokens: 500, refillRate: 500 / 3600, refillInterval: 60 * 60 * 1000 },
    }],
  ]);

  /**
   * Get the configuration for a specific endpoint
   */
  private getConfig(endpoint: string, tier: SubscriptionTier | null): RateLimitConfig {
    // Check for exact match
    if (this.endpointConfigs.has(endpoint)) {
      const endpointConfig = this.endpointConfigs.get(endpoint)!;
      const tierConfig = endpointConfig[tier || 'free'];
      if (tierConfig) {
        return tierConfig;
      }
      // Fallback to free tier for this endpoint
      if (endpointConfig.free) {
        return endpointConfig.free;
      }
    }

    // Check for prefix match (for parameterized routes)
    for (const [pattern, configs] of this.endpointConfigs) {
      if (endpoint.startsWith(pattern.replace(/\/:[^/]+/g, ''))) {
        const tierConfig = configs[tier || 'free'];
        if (tierConfig) {
          return tierConfig;
        }
        if (configs.free) {
          return configs.free;
        }
      }
    }

    // Use tiered default or general default
    if (tier && this.tieredConfigs.has(tier)) {
      return this.tieredConfigs.get(tier)!;
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
    endpoint: string,
    subscriptionTier?: SubscriptionTier | null
  ): { allowed: boolean; remaining: number; retryAfter?: number; limit: number } {
    // Use userId if authenticated, otherwise use IP
    const identifier = userId ? `user:${userId}:${endpoint}` : `ip:${ip}:${endpoint}`;
    const tier = subscriptionTier || (userId ? 'free' : null);
    const config = this.getConfig(endpoint, tier);
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
    endpoint: string,
    subscriptionTier?: SubscriptionTier | null
  ): { remaining: number; limit: number; reset: number } {
    const identifier = userId ? `user:${userId}:${endpoint}` : `ip:${ip}:${endpoint}`;
    const tier = subscriptionTier || (userId ? 'free' : null);
    const config = this.getConfig(endpoint, tier);
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
   * Clean up old buckets periodically
   */
  @Cron(CronExpression.EVERY_HOUR)
  cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    let cleaned = 0;
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.lastRefill > maxAge) {
        this.buckets.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Rate limiter: Cleaned up ${cleaned} old buckets`);
    }
  }

  onModuleInit() {
    // Initial cleanup on startup
    this.cleanup();
  }

  /**
   * Get statistics for monitoring
   */
  getStats(): {
    totalBuckets: number;
    activeBuckets: number;
    memoryUsage: number;
  } {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000;
    let activeBuckets = 0;

    for (const bucket of this.buckets.values()) {
      if (now - bucket.lastRefill <= maxAge) {
        activeBuckets++;
      }
    }

    // Estimate memory usage (rough calculation)
    const avgKeySize = 50; // bytes
    const avgBucketSize = 16; // bytes (tokens: 8, lastRefill: 8)
    const memoryUsage = this.buckets.size * (avgKeySize + avgBucketSize);

    return {
      totalBuckets: this.buckets.size,
      activeBuckets,
      memoryUsage,
    };
  }
}
