/**
 * Utility functions for parsing and handling HTTP cache headers
 */

export interface CacheDirectives {
  maxAge: number | null;
  staleWhileRevalidate: number | null;
  noCache: boolean;
  noStore: boolean;
  mustRevalidate: boolean;
  public: boolean;
  private: boolean;
}

/**
 * Parse Cache-Control header value into structured directives
 * @param cacheControlHeader - The Cache-Control header string
 * @returns Parsed cache directives
 */
export function parseCacheControl(cacheControlHeader: string | null | undefined): CacheDirectives {
  const directives: CacheDirectives = {
    maxAge: null,
    staleWhileRevalidate: null,
    noCache: false,
    noStore: false,
    mustRevalidate: false,
    public: false,
    private: false,
  };

  if (!cacheControlHeader) {
    return directives;
  }

  const parts = cacheControlHeader.toLowerCase().split(',').map(p => p.trim());

  for (const part of parts) {
    if (part.startsWith('max-age=')) {
      const value = parseInt(part.split('=')[1], 10);
      if (!isNaN(value)) {
        directives.maxAge = value;
      }
    } else if (part.startsWith('stale-while-revalidate=')) {
      const value = parseInt(part.split('=')[1], 10);
      if (!isNaN(value)) {
        directives.staleWhileRevalidate = value;
      }
    } else if (part === 'no-cache') {
      directives.noCache = true;
    } else if (part === 'no-store') {
      directives.noStore = true;
    } else if (part === 'must-revalidate') {
      directives.mustRevalidate = true;
    } else if (part === 'public') {
      directives.public = true;
    } else if (part === 'private') {
      directives.private = true;
    }
  }

  return directives;
}

/**
 * Calculate TanStack Query staleTime based on Cache-Control headers
 * @param cacheControlHeader - The Cache-Control header string
 * @param defaultStaleTime - Default stale time in milliseconds (default: 60000 = 1 minute)
 * @returns Stale time in milliseconds
 */
export function getStaleTimeFromCacheControl(
  cacheControlHeader: string | null | undefined,
  defaultStaleTime: number = 60000
): number {
  const directives = parseCacheControl(cacheControlHeader);

  // If no-store or no-cache, data should always be considered stale
  if (directives.noStore || directives.noCache) {
    return 0;
  }

  // Use max-age if available, convert seconds to milliseconds
  if (directives.maxAge !== null) {
    return directives.maxAge * 1000;
  }

  return defaultStaleTime;
}

/**
 * Calculate TanStack Query gcTime (garbage collection time) based on Cache-Control headers
 * Uses stale-while-revalidate as additional time to keep cached data
 * @param cacheControlHeader - The Cache-Control header string
 * @param defaultGcTime - Default gc time in milliseconds (default: 300000 = 5 minutes)
 * @returns GC time in milliseconds
 */
export function getGcTimeFromCacheControl(
  cacheControlHeader: string | null | undefined,
  defaultGcTime: number = 300000
): number {
  const directives = parseCacheControl(cacheControlHeader);

  // If no-store, don't cache at all
  if (directives.noStore) {
    return 0;
  }

  // Calculate total cache time: max-age + stale-while-revalidate
  let totalTime = 0;

  if (directives.maxAge !== null) {
    totalTime = directives.maxAge * 1000;
  }

  if (directives.staleWhileRevalidate !== null) {
    totalTime += directives.staleWhileRevalidate * 1000;
  }

  return totalTime > 0 ? totalTime : defaultGcTime;
}

/**
 * Store to track cache metadata for API responses
 * This allows queries to look up cache headers by endpoint
 */
class CacheMetadataStore {
  private cache: Map<string, { cacheControl: string | null; timestamp: number }> = new Map();
  private maxEntries = 100;

  set(endpoint: string, cacheControl: string | null): void {
    // Clean up old entries if we're at capacity
    if (this.cache.size >= this.maxEntries) {
      const oldest = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      if (oldest) {
        this.cache.delete(oldest[0]);
      }
    }

    this.cache.set(endpoint, {
      cacheControl,
      timestamp: Date.now(),
    });
  }

  get(endpoint: string): string | null {
    const entry = this.cache.get(endpoint);
    return entry?.cacheControl ?? null;
  }

  getStaleTime(endpoint: string, defaultStaleTime: number = 60000): number {
    const cacheControl = this.get(endpoint);
    return getStaleTimeFromCacheControl(cacheControl, defaultStaleTime);
  }

  getGcTime(endpoint: string, defaultGcTime: number = 300000): number {
    const cacheControl = this.get(endpoint);
    return getGcTimeFromCacheControl(cacheControl, defaultGcTime);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const cacheMetadataStore = new CacheMetadataStore();
