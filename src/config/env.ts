import dotenv from 'dotenv';
import { envSchema, type EnvConfig } from './schema';

let cachedConfig: EnvConfig | null = null;

/** Loads and validates environment configuration, with memoization. */
export function loadConfig(): EnvConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    dotenv.config();
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment configuration: ${issues.join('; ')}`);
  }

  cachedConfig = parsed.data;
  return cachedConfig;
}
