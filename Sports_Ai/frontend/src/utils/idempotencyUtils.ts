/**
 * Utility functions for idempotency key generation and management
 *
 * Idempotency keys ensure that duplicate requests (e.g., due to network retries
 * or double-clicks) don't create duplicate resources on the server.
 */

/**
 * Generate a unique idempotency key
 * Uses a combination of timestamp and random string for uniqueness
 */
export function generateIdempotencyKey(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `idem_${timestamp}_${randomPart}`;
}

/**
 * Store for tracking idempotency keys per request
 * Helps prevent sending different keys for retry attempts
 */
class IdempotencyKeyStore {
  private keys: Map<string, { key: string; timestamp: number }> = new Map();
  private maxAge = 5 * 60 * 1000; // 5 minutes TTL
  private maxEntries = 100;

  /**
   * Get or create an idempotency key for a given request signature
   * @param requestSignature Unique identifier for the request (e.g., method + url + body hash)
   * @returns The idempotency key
   */
  getOrCreate(requestSignature: string): string {
    this.cleanup();

    const existing = this.keys.get(requestSignature);
    if (existing) {
      return existing.key;
    }

    const key = generateIdempotencyKey();
    this.keys.set(requestSignature, {
      key,
      timestamp: Date.now(),
    });

    return key;
  }

  /**
   * Clear a specific key after successful request
   */
  clear(requestSignature: string): void {
    this.keys.delete(requestSignature);
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.keys.entries());

    // Remove expired entries
    for (const [signature, data] of entries) {
      if (now - data.timestamp > this.maxAge) {
        this.keys.delete(signature);
      }
    }

    // If still over capacity, remove oldest
    if (this.keys.size > this.maxEntries) {
      const sortedEntries = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = sortedEntries.slice(0, this.keys.size - this.maxEntries);
      for (const [signature] of toRemove) {
        this.keys.delete(signature);
      }
    }
  }
}

// Export singleton instance
export const idempotencyKeyStore = new IdempotencyKeyStore();

/**
 * Create a request signature for idempotency tracking
 * @param method HTTP method
 * @param url Request URL
 * @param data Request body (optional)
 * @returns A unique signature for this request
 */
export function createRequestSignature(method: string, url: string, data?: unknown): string {
  const bodyHash = data ? simpleHash(JSON.stringify(data)) : '';
  return `${method}:${url}:${bodyHash}`;
}

/**
 * Simple hash function for creating body signatures
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * List of endpoints that should use idempotency keys
 * POST requests to these endpoints will automatically include Idempotency-Key header
 */
export const IDEMPOTENT_ENDPOINTS = [
  '/v1/presets',
  '/v1/favorites',
  '/v1/credits/purchase',
  '/v1/auth/signup',
  '/v1/arbitrage/opportunities',
];

/**
 * Check if a request should include an idempotency key
 */
export function shouldUseIdempotencyKey(method: string, url: string): boolean {
  if (method.toUpperCase() !== 'POST') {
    return false;
  }

  // Check if URL matches any idempotent endpoint
  return IDEMPOTENT_ENDPOINTS.some(endpoint => url.includes(endpoint));
}
