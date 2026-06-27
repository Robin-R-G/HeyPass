const SENSITIVE_FIELDS = [
  'access_token_encrypted',
  'meta_app_secret_encrypted',
  'webhook_secret_encrypted',
  'webhook_verify_token',
] as const;

type SanitizedRecord = Record<string, unknown>;

export function sanitizeConfig<T extends SanitizedRecord>(config: T): T {
  if (!config) return config;
  const copy = { ...config };
  for (const field of SENSITIVE_FIELDS) {
    if (copy[field]) {
      copy[field] = '***' as unknown;
    }
  }
  return copy;
}

export function sanitizeConfigs<T extends SanitizedRecord>(configs: T[]): T[] {
  return configs.map(sanitizeConfig);
}
