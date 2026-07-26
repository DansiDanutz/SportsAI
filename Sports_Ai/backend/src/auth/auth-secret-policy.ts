export type AuthEnvironment = Record<string, string | undefined>;

const DEVELOPMENT_JWT_SECRET = 'sportsai-development-only-jwt-secret';

const KNOWN_PLACEHOLDERS = new Set([
  'sportsai-secret-key-change-in-production',
  'sportsai-cookie-secret-change-in-production',
  'your-jwt-secret-here',
  'your-secret-key',
  'your-super-secret-jwt-key-change-in-production',
]);

function isProduction(env: AuthEnvironment): boolean {
  return (env.NODE_ENV || '').trim().toLowerCase() === 'production';
}

function validateProductionSecret(name: string, value: string | undefined): string {
  const secret = value?.trim();

  if (!secret) {
    throw new Error(`${name} is required in production`);
  }

  if (secret.length < 32 || KNOWN_PLACEHOLDERS.has(secret.toLowerCase())) {
    throw new Error(`${name} must be a non-placeholder secret of at least 32 characters in production`);
  }

  return secret;
}

export function getJwtSecret(env: AuthEnvironment = process.env): string {
  if (isProduction(env)) {
    return validateProductionSecret('JWT_SECRET', env.JWT_SECRET);
  }

  return env.JWT_SECRET?.trim() || DEVELOPMENT_JWT_SECRET;
}

export function getCookieSecret(env: AuthEnvironment = process.env): string {
  if (isProduction(env)) {
    return env.COOKIE_SECRET
      ? validateProductionSecret('COOKIE_SECRET', env.COOKIE_SECRET)
      : getJwtSecret(env);
  }

  return env.COOKIE_SECRET?.trim() || getJwtSecret(env);
}

export function validateAuthSecrets(env: AuthEnvironment = process.env): void {
  getJwtSecret(env);
  getCookieSecret(env);
}
