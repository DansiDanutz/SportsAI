import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiRateLimiterService } from './api-rate-limiter.service';

/**
 * Guard that enforces API rate limiting per user/IP
 * Returns 429 Too Many Requests when limit exceeded
 *
 * Default: 100 requests per minute per user
 * Stricter limits on auth/credits endpoints
 */
@Injectable()
export class ApiRateLimitGuard implements CanActivate {
  constructor(private readonly rateLimiter: ApiRateLimiterService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Get user ID from JWT if authenticated
    const userId = request.user?.id || request.user?.userId || null;

    // Get IP address (handle proxies)
    const ip = this.getClientIp(request);

    // Get endpoint path
    const endpoint = request.url?.split('?')[0] || '/'; // Remove query params

    // Check rate limit
    const result = this.rateLimiter.checkAndConsume(userId, ip, endpoint);

    // Set rate limit headers on response (Fastify uses .header())
    // These headers are standard for rate limiting APIs
    try {
      const raw = response.raw || response;
      if (typeof response.header === 'function') {
        response.header('X-RateLimit-Limit', String(result.limit));
        response.header('X-RateLimit-Remaining', String(result.remaining));
        if (result.retryAfter) {
          response.header('Retry-After', String(result.retryAfter));
          response.header('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + result.retryAfter));
        }
      } else if (typeof raw.setHeader === 'function') {
        raw.setHeader('X-RateLimit-Limit', String(result.limit));
        raw.setHeader('X-RateLimit-Remaining', String(result.remaining));
        if (result.retryAfter) {
          raw.setHeader('Retry-After', String(result.retryAfter));
          raw.setHeader('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + result.retryAfter));
        }
      }
    } catch {
      // Ignore header setting errors
    }

    if (!result.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please try again later.',
          error: 'Too Many Requests',
          retryAfter: result.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }

  /**
   * Extract client IP address, handling proxies
   */
  private getClientIp(request: any): string {
    // Check for forwarded headers (when behind proxy)
    const forwarded = request.headers?.['x-forwarded-for'];
    if (forwarded) {
      // x-forwarded-for can contain multiple IPs, use the first one
      return forwarded.split(',')[0].trim();
    }

    // Check for real IP header (some proxies use this)
    const realIp = request.headers?.['x-real-ip'];
    if (realIp) {
      return realIp;
    }

    // Fall back to connection remote address
    return request.ip || request.connection?.remoteAddress || '127.0.0.1';
  }
}
