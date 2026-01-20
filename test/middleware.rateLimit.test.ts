describe('rateLimitMiddleware', () => {
  it('returns rate limit middleware when enabled', async () => {
    jest.resetModules();
    jest.doMock('../src/config/env', () => ({
      loadConfig: () => ({
        API_RATE_LIMIT_ENABLED: true,
        API_RATE_LIMIT_WINDOW_MS: 1000,
        API_RATE_LIMIT_MAX: 1,
      }),
    }));
    const rateLimiter = jest.fn(() => 'rate-handler');
    jest.doMock('express-rate-limit', () => ({
      __esModule: true,
      default: rateLimiter,
    }));

    const { rateLimitMiddleware } = await import('../src/middleware/rateLimit');
    expect(rateLimitMiddleware).toBe('rate-handler');
    expect(rateLimiter).toHaveBeenCalledWith({
      windowMs: 1000,
      max: 1,
      standardHeaders: true,
      legacyHeaders: false,
    });
  });

  it('returns noop middleware when disabled', async () => {
    jest.resetModules();
    jest.doMock('../src/config/env', () => ({
      loadConfig: () => ({
        API_RATE_LIMIT_ENABLED: false,
        API_RATE_LIMIT_WINDOW_MS: 1000,
        API_RATE_LIMIT_MAX: 1,
      }),
    }));
    jest.doMock('express-rate-limit', () => ({
      __esModule: true,
      default: jest.fn(() => 'rate-handler'),
    }));

    const { rateLimitMiddleware } = await import('../src/middleware/rateLimit');
    const next = jest.fn();
    (rateLimitMiddleware as (req: unknown, res: unknown, next: () => void) => void)({}, {}, next);
    expect(next).toHaveBeenCalled();
  });
});
