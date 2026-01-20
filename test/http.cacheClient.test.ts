describe('cacheClient', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('returns null when redis disabled', async () => {
    jest.doMock('../src/config/env', () => ({
      loadConfig: () => ({ REDIS_ENABLED: false, REDIS_URL: 'redis://localhost:6379' }),
    }));
    const { getCached, setCached } = await import('../src/http/cacheClient');
    await expect(getCached('key')).resolves.toBeNull();
    await expect(setCached('key', { ok: true })).resolves.toBeUndefined();
  });

  it('gets and sets cache when enabled', async () => {
    const get = jest.fn().mockResolvedValue('{"value":123}');
    const set = jest.fn().mockResolvedValue('OK');
    const connect = jest.fn().mockResolvedValue(undefined);
    const fakeClient = { get, set, connect };

    jest.doMock('redis', () => ({ createClient: jest.fn(() => fakeClient) }));
    jest.doMock('../src/config/env', () => ({
      loadConfig: () => ({ REDIS_ENABLED: true, REDIS_URL: 'redis://localhost:6379' }),
    }));

    const { getCached, setCached } = await import('../src/http/cacheClient');
    await expect(getCached('key')).resolves.toEqual({ value: 123 });
    await setCached('key', { value: 456 }, 10);
    expect(set).toHaveBeenCalledWith('key', JSON.stringify({ value: 456 }), { EX: 10 });
  });

  it('handles cache misses and no ttl', async () => {
    const get = jest.fn().mockResolvedValue(null);
    const set = jest.fn().mockResolvedValue('OK');
    const connect = jest.fn().mockResolvedValue(undefined);
    const fakeClient = { get, set, connect };

    jest.doMock('redis', () => ({ createClient: jest.fn(() => fakeClient) }));
    jest.doMock('../src/config/env', () => ({
      loadConfig: () => ({ REDIS_ENABLED: true, REDIS_URL: 'redis://localhost:6379' }),
    }));

    const { getCached, setCached } = await import('../src/http/cacheClient');
    await expect(getCached('missing')).resolves.toBeNull();
    await setCached('key', { value: 1 });
    expect(set).toHaveBeenCalledWith('key', JSON.stringify({ value: 1 }));
  });

  it('reuses pending connection and handles connect failure', async () => {
    let resolveConnect: () => void = () => {};
    const connectPromise = new Promise<void>((resolve) => {
      resolveConnect = resolve;
    });
    const get = jest.fn().mockResolvedValue(null);
    const set = jest.fn().mockResolvedValue('OK');
    const connect = jest.fn().mockReturnValue(connectPromise);
    const fakeClient = { get, set, connect };

    jest.doMock('redis', () => ({ createClient: jest.fn(() => fakeClient) }));
    jest.doMock('../src/config/env', () => ({
      loadConfig: () => ({ REDIS_ENABLED: true, REDIS_URL: 'redis://localhost:6379' }),
    }));

    const { getCached } = await import('../src/http/cacheClient');
    const pending = getCached('key');
    const pendingAgain = getCached('key');
    resolveConnect();
    await expect(pending).resolves.toBeNull();
    await expect(pendingAgain).resolves.toBeNull();

    jest.resetModules();
    jest.doMock('redis', () => ({
      createClient: jest.fn(() => ({ get, set, connect: jest.fn().mockRejectedValue(new Error('fail')) })),
    }));
    jest.doMock('../src/config/env', () => ({
      loadConfig: () => ({ REDIS_ENABLED: true, REDIS_URL: 'redis://localhost:6379' }),
    }));

    const { getCached: getCachedFail } = await import('../src/http/cacheClient');
    await expect(getCachedFail('key')).resolves.toBeNull();
  });

  it('swallows redis errors', async () => {
    const get = jest.fn().mockRejectedValue(new Error('boom'));
    const set = jest.fn().mockRejectedValue(new Error('boom'));
    const connect = jest.fn().mockResolvedValue(undefined);
    const fakeClient = { get, set, connect };

    jest.doMock('redis', () => ({ createClient: jest.fn(() => fakeClient) }));
    jest.doMock('../src/config/env', () => ({
      loadConfig: () => ({ REDIS_ENABLED: true, REDIS_URL: 'redis://localhost:6379' }),
    }));

    const { getCached, setCached } = await import('../src/http/cacheClient');
    await expect(getCached('key')).resolves.toBeNull();
    await expect(setCached('key', { value: 1 })).resolves.toBeUndefined();
  });
});
