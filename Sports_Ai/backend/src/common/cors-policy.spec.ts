import { isAllowedCorsOrigin, resolveAllowedCorsOrigins } from './cors-policy';

describe('credentialed CORS policy', () => {
  it('allows only the stable frontend by default in production', () => {
    const origins = resolveAllowedCorsOrigins(undefined, 'production');

    expect(isAllowedCorsOrigin('https://sports-ai-one.vercel.app', origins)).toBe(true);
    expect(isAllowedCorsOrigin('https://attacker.vercel.app', origins)).toBe(false);
  });

  it('rejects wildcard and insecure production configuration', () => {
    const origins = resolveAllowedCorsOrigins(
      'https://*.vercel.app,http://example.com',
      'production',
    );

    expect(origins).toEqual(['https://sports-ai-one.vercel.app']);
  });

  it('normalizes and deduplicates exact configured origins', () => {
    expect(
      resolveAllowedCorsOrigins(
        'https://app.example.com/,https://app.example.com',
        'production',
      ),
    ).toEqual(['https://app.example.com']);
  });
});
