import { z } from 'zod';

const booleanFromString = z
  .union([z.boolean(), z.string()])
  .transform((value) => {
    if (typeof value === 'boolean') {
      return value;
    }
    return value.toLowerCase() === 'true' || value === '1';
  });

export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  AUDIBLE_BASE_URL: z.string().url().default('https://www.audible.fr'),
  AUDIBLE_SEARCH_PATH: z.string().default('/search'),
  AUDIBLE_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  AUDIBLE_USER_AGENT: z
    .string()
    .default(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
    ),
  AUDIBLE_ACCEPT_LANGUAGE: z
    .string()
    .default('fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'),
  AUDIBLE_DETAILS_URL_MODE: z.enum(['guess', 'requireUrl']).default('guess'),
  API_RATE_LIMIT_ENABLED: booleanFromString.default(false),
  API_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  API_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
  OUTBOUND_CONCURRENCY: z.coerce.number().int().positive().default(2),
  OUTBOUND_MIN_TIME_MS: z.coerce.number().int().nonnegative().default(500),
  REDIS_ENABLED: booleanFromString.default(false),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  SEARCH_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(86400),
  DB_ENABLED: booleanFromString.default(false),
  DB_HOST: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_NAME: z.string().optional(),
}).superRefine((value, ctx) => {
  if (!value.DB_ENABLED) {
    return;
  }

  const requiredFields: Array<keyof typeof value> = [
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
  ];
  requiredFields.forEach((field) => {
    if (!value[field]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${field} is required when DB_ENABLED is true`,
        path: [field],
      });
    }
  });
});

export type EnvConfig = z.infer<typeof envSchema>;
