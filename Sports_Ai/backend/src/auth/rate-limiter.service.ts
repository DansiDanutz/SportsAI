import { Injectable } from '@nestjs/common';

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lockedUntil?: number;
}

@Injectable()
export class RateLimiterService {
  private readonly attempts = new Map<string, RateLimitEntry>();

  // Configuration
  private readonly maxAttempts = 5;
  private readonly windowMs = 15 * 60 * 1000; // 15 minutes
  private readonly lockoutMs = 15 * 60 * 1000; // 15 minutes lockout

  /**
   * Check if the identifier (IP or email) is rate limited
   * Returns { limited: boolean, retryAfter?: number, attemptsRemaining?: number }
   */
  checkLimit(identifier: string): { limited: boolean; retryAfter?: number; attemptsRemaining?: number } {
    const now = Date.now();
    const entry = this.attempts.get(identifier);

    // No previous attempts
    if (!entry) {
      return { limited: false, attemptsRemaining: this.maxAttempts };
    }

    // Check if currently locked out
    if (entry.lockedUntil && entry.lockedUntil > now) {
      return {
        limited: true,
        retryAfter: Math.ceil((entry.lockedUntil - now) / 1000),
      };
    }

    // Check if window has expired (reset attempts)
    if (now - entry.firstAttempt > this.windowMs) {
      this.attempts.delete(identifier);
      return { limited: false, attemptsRemaining: this.maxAttempts };
    }

    // Check if max attempts exceeded
    if (entry.attempts >= this.maxAttempts) {
      // Lock the account
      entry.lockedUntil = now + this.lockoutMs;
      return {
        limited: true,
        retryAfter: Math.ceil(this.lockoutMs / 1000),
      };
    }

    return {
      limited: false,
      attemptsRemaining: this.maxAttempts - entry.attempts,
    };
  }

  /**
   * Record a failed login attempt
   */
  recordFailedAttempt(identifier: string): { attemptsRemaining: number; locked: boolean } {
    const now = Date.now();
    const entry = this.attempts.get(identifier);

    if (!entry || now - entry.firstAttempt > this.windowMs) {
      // Start new window
      this.attempts.set(identifier, {
        attempts: 1,
        firstAttempt: now,
      });
      return { attemptsRemaining: this.maxAttempts - 1, locked: false };
    }

    // Increment attempts
    entry.attempts++;

    if (entry.attempts >= this.maxAttempts) {
      entry.lockedUntil = now + this.lockoutMs;
      return { attemptsRemaining: 0, locked: true };
    }

    return { attemptsRemaining: this.maxAttempts - entry.attempts, locked: false };
  }

  /**
   * Clear rate limit for an identifier (e.g., after successful login)
   */
  clearLimit(identifier: string): void {
    this.attempts.delete(identifier);
  }

  /**
   * Get current status for an identifier
   */
  getStatus(identifier: string): { attempts: number; locked: boolean; lockedUntil?: Date } {
    const entry = this.attempts.get(identifier);
    if (!entry) {
      return { attempts: 0, locked: false };
    }

    const now = Date.now();
    return {
      attempts: entry.attempts,
      locked: entry.lockedUntil ? entry.lockedUntil > now : false,
      lockedUntil: entry.lockedUntil ? new Date(entry.lockedUntil) : undefined,
    };
  }
}
