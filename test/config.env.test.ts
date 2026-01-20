const ORIGINAL_ENV = process.env;

describe('loadConfig', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('loads dotenv in development and caches config', async () => {
    process.env.NODE_ENV = 'development';
    const dotenvConfig = jest.fn();
    jest.doMock('dotenv', () => ({ config: dotenvConfig }));

    const { loadConfig } = await import('../src/config/env');
    const first = loadConfig();
    const second = loadConfig();

    expect(dotenvConfig).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it('throws on invalid env', async () => {
    process.env.NODE_ENV = 'development';
    process.env.PORT = '-1';
    jest.doMock('dotenv', () => ({ config: jest.fn() }));

    const { loadConfig } = await import('../src/config/env');
    expect(() => loadConfig()).toThrow('Invalid environment configuration');
  });
});
