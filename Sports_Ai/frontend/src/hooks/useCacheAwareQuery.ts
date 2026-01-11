import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { cacheMetadataStore } from '../utils/cacheUtils';

/**
 * Default cache configuration matching backend Cache-Control headers
 */
const DEFAULT_CACHE_CONFIG = {
  events: { staleTime: 30000, gcTime: 90000 },      // max-age=30, stale-while-revalidate=60
  arbitrage: { staleTime: 15000, gcTime: 45000 },   // max-age=15, stale-while-revalidate=30
  favorites: { staleTime: 60000, gcTime: 180000 },  // max-age=60, stale-while-revalidate=120
  presets: { staleTime: 120000, gcTime: 360000 },   // max-age=120, stale-while-revalidate=240
  default: { staleTime: 60000, gcTime: 300000 },    // Default: 1 minute stale, 5 minutes gc
};

/**
 * Get cache config based on endpoint pattern
 */
function getCacheConfigForEndpoint(endpoint: string): { staleTime: number; gcTime: number } {
  // First, try to get cached metadata from a previous request
  const cachedStaleTime = cacheMetadataStore.getStaleTime(endpoint);
  const cachedGcTime = cacheMetadataStore.getGcTime(endpoint);

  // If we have cached metadata, use it
  if (cachedStaleTime > 0) {
    return { staleTime: cachedStaleTime, gcTime: cachedGcTime };
  }

  // Otherwise, use defaults based on endpoint pattern
  if (endpoint.includes('/events')) {
    return DEFAULT_CACHE_CONFIG.events;
  }
  if (endpoint.includes('/arbitrage')) {
    return DEFAULT_CACHE_CONFIG.arbitrage;
  }
  if (endpoint.includes('/favorites')) {
    return DEFAULT_CACHE_CONFIG.favorites;
  }
  if (endpoint.includes('/presets')) {
    return DEFAULT_CACHE_CONFIG.presets;
  }

  return DEFAULT_CACHE_CONFIG.default;
}

/**
 * Options for cache-aware query
 */
interface CacheAwareQueryOptions<TData, TError = Error> extends Omit<UseQueryOptions<TData, TError>, 'staleTime' | 'gcTime'> {
  /** Endpoint path for cache configuration lookup */
  endpoint?: string;
  /** Override stale time (in ms) - takes precedence over cache headers */
  staleTimeOverride?: number;
  /** Override gc time (in ms) - takes precedence over cache headers */
  gcTimeOverride?: number;
}

/**
 * A wrapper around useQuery that automatically configures caching based on
 * HTTP Cache-Control headers received from the backend.
 *
 * This hook:
 * 1. Uses cached Cache-Control metadata if available from previous requests
 * 2. Falls back to sensible defaults based on endpoint patterns
 * 3. Allows manual overrides via options
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useCacheAwareQuery({
 *   queryKey: ['events'],
 *   queryFn: () => eventsApi.getAll(),
 *   endpoint: '/v1/events',
 * });
 * ```
 */
export function useCacheAwareQuery<TData, TError = Error>(
  options: CacheAwareQueryOptions<TData, TError>
): UseQueryResult<TData, TError> {
  const { endpoint, staleTimeOverride, gcTimeOverride, ...queryOptions } = options;

  // Get cache configuration based on endpoint
  const cacheConfig = endpoint ? getCacheConfigForEndpoint(endpoint) : DEFAULT_CACHE_CONFIG.default;

  return useQuery<TData, TError>({
    ...queryOptions,
    staleTime: staleTimeOverride ?? cacheConfig.staleTime,
    gcTime: gcTimeOverride ?? cacheConfig.gcTime,
  });
}

/**
 * Hook to get cache stats for debugging/display purposes
 */
export function useCacheStats(endpoint: string) {
  const cacheControl = cacheMetadataStore.get(endpoint);
  const staleTime = cacheMetadataStore.getStaleTime(endpoint);
  const gcTime = cacheMetadataStore.getGcTime(endpoint);

  return {
    cacheControl,
    staleTime,
    gcTime,
    staleTimeSeconds: staleTime / 1000,
    gcTimeSeconds: gcTime / 1000,
    hasCacheMetadata: cacheControl !== null,
  };
}

/**
 * Export the cache metadata store for direct access when needed
 */
export { cacheMetadataStore };
