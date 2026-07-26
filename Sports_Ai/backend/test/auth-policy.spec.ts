import { getCookieSecret, getJwtSecret, validateAuthSecrets } from '../src/auth/auth-secret-policy';

describe('authentication secret policy', () => {
  it('rejects a missing production JWT secret', () => {
    expect(() => validateAuthSecrets({ NODE_ENV: 'production' })).toThrow(
      'JWT_SECRET is required in production',
    );
  });

  it.each([
    'sportsai-secret-key-change-in-production',
    'your-jwt-secret-here',
    'too-short',
  ])('rejects an unsafe production JWT secret: %s', (JWT_SECRET) => {
    expect(() => getJwtSecret({ NODE_ENV: 'production', JWT_SECRET })).toThrow(
      'JWT_SECRET must be a non-placeholder secret of at least 32 characters in production',
    );
  });

  it('uses validated production secrets', () => {
    const JWT_SECRET = 'j'.repeat(64);
    const COOKIE_SECRET = 'c'.repeat(64);
    const env = { NODE_ENV: 'production', JWT_SECRET, COOKIE_SECRET };

    expect(getJwtSecret(env)).toBe(JWT_SECRET);
    expect(getCookieSecret(env)).toBe(COOKIE_SECRET);
    expect(() => validateAuthSecrets(env)).not.toThrow();
  });

  it('uses the JWT secret for cookies when no dedicated production cookie secret exists', () => {
    const JWT_SECRET = 'j'.repeat(64);

    expect(getCookieSecret({ NODE_ENV: 'production', JWT_SECRET })).toBe(JWT_SECRET);
  });

  it('keeps local development usable without production credentials', () => {
    expect(getJwtSecret({ NODE_ENV: 'development' })).toBe(
      'sportsai-development-only-jwt-secret',
    );
    expect(getCookieSecret({ NODE_ENV: 'test' })).toBe(
      'sportsai-development-only-jwt-secret',
    );
  });
});
