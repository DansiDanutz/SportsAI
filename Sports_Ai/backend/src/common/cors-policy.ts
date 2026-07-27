const DEVELOPMENT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
];

const PRODUCTION_ORIGINS = ['https://sports-ai-one.vercel.app'];

export function resolveAllowedCorsOrigins(
  configuredOrigins: string | undefined,
  nodeEnv: string | undefined,
): string[] {
  const isProduction = !['development', 'test'].includes(
    (nodeEnv || '').trim().toLowerCase(),
  );
  const configured = (configuredOrigins || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .filter((origin) => !origin.includes('*'))
    .flatMap((origin) => {
      try {
        const parsed = new URL(origin);
        if (isProduction && parsed.protocol !== 'https:') return [];
        return [parsed.origin];
      } catch {
        return [];
      }
    });

  if (configured.length > 0) {
    return [...new Set(configured)];
  }

  return isProduction ? PRODUCTION_ORIGINS : DEVELOPMENT_ORIGINS;
}

export function isAllowedCorsOrigin(
  origin: string | undefined,
  allowedOrigins: readonly string[],
): boolean {
  return typeof origin === 'string' && allowedOrigins.includes(origin);
}
