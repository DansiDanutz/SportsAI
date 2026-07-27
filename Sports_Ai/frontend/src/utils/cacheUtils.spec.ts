import { describe, expect, it } from 'vitest';
import { normalizeCacheControlHeader, parseCacheControl } from './cacheUtils';

describe('cache header handling', () => {
  it('normalizes supported Axios header values', () => {
    expect(normalizeCacheControlHeader('public, max-age=60')).toBe('public, max-age=60');
    expect(normalizeCacheControlHeader(['public', 'max-age=60'])).toBe('public, max-age=60');
  });

  it('rejects non-string header values', () => {
    expect(normalizeCacheControlHeader(true)).toBeNull();
    expect(normalizeCacheControlHeader({ value: 'max-age=60' })).toBeNull();
  });

  it('parses normalized cache directives', () => {
    expect(parseCacheControl('public, max-age=60, stale-while-revalidate=30')).toMatchObject({
      public: true,
      maxAge: 60,
      staleWhileRevalidate: 30,
    });
  });
});
