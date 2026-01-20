import { envSchema } from '../src/config/schema';

describe('envSchema', () => {
  it('coerces booleans from strings', () => {
    const parsed = envSchema.parse({ API_RATE_LIMIT_ENABLED: 'true' });
    expect(parsed.API_RATE_LIMIT_ENABLED).toBe(true);
  });

  it('requires db fields when DB_ENABLED is true', () => {
    const parsed = envSchema.safeParse({ DB_ENABLED: 'true' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((issue) => issue.message);
      expect(messages).toEqual(
        expect.arrayContaining([
          'DB_HOST is required when DB_ENABLED is true',
          'DB_USER is required when DB_ENABLED is true',
          'DB_PASSWORD is required when DB_ENABLED is true',
          'DB_NAME is required when DB_ENABLED is true',
        ]),
      );
    }
  });

  it('accepts db fields when enabled', () => {
    const parsed = envSchema.parse({
      DB_ENABLED: 'true',
      DB_HOST: 'localhost',
      DB_USER: 'user',
      DB_PASSWORD: 'pass',
      DB_NAME: 'db',
    });
    expect(parsed.DB_ENABLED).toBe(true);
  });
});
