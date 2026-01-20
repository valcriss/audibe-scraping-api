describe('getPrismaClient', () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.DATABASE_URL;
  });

  it('returns null when DB is disabled', async () => {
    const prismaCtor = jest.fn();
    jest.doMock('@prisma/client', () => ({ PrismaClient: prismaCtor }));
    jest.doMock('../src/config/env', () => ({
      loadConfig: () => ({ DB_ENABLED: false }),
    }));

    const { getPrismaClient } = await import('../src/db/prismaClient');
    await expect(getPrismaClient()).resolves.toBeNull();
    expect(prismaCtor).not.toHaveBeenCalled();
  });

  it('creates and caches client when DB is enabled', async () => {
    const connect = jest.fn().mockResolvedValue(undefined);
    const prismaInstance = { $connect: connect };
    const prismaCtor = jest.fn(() => prismaInstance);

    jest.doMock('@prisma/client', () => ({ PrismaClient: prismaCtor }));
    jest.doMock('../src/config/env', () => ({
      loadConfig: () => ({
        DB_ENABLED: true,
        DB_HOST: 'localhost',
        DB_USER: 'user',
        DB_PASSWORD: 'pass',
        DB_NAME: 'db',
      }),
    }));

    const { getPrismaClient } = await import('../src/db/prismaClient');
    const first = await getPrismaClient();
    const second = await getPrismaClient();

    expect(first).toBe(prismaInstance);
    expect(second).toBe(prismaInstance);
    expect(prismaCtor).toHaveBeenCalledWith({
      datasources: {
        db: { url: 'postgresql://user:pass@localhost:5432/db' },
      },
    });
  });

  it('uses defaults when db config values are missing', async () => {
    const connect = jest.fn().mockResolvedValue(undefined);
    const prismaInstance = { $connect: connect };
    const prismaCtor = jest.fn(() => prismaInstance);

    jest.doMock('@prisma/client', () => ({ PrismaClient: prismaCtor }));
    jest.doMock('../src/config/env', () => ({
      loadConfig: () => ({
        DB_ENABLED: true,
        DB_HOST: undefined,
        DB_USER: undefined,
        DB_PASSWORD: undefined,
        DB_NAME: undefined,
      }),
    }));

    const { getPrismaClient } = await import('../src/db/prismaClient');
    await getPrismaClient();
    expect(prismaCtor).toHaveBeenCalledWith({
      datasources: {
        db: { url: 'postgresql://:@localhost:5432/postgres' },
      },
    });
  });

  it('uses DATABASE_URL when provided', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@db:5432/name';
    const connect = jest.fn().mockResolvedValue(undefined);
    const prismaInstance = { $connect: connect };
    const prismaCtor = jest.fn(() => prismaInstance);

    jest.doMock('@prisma/client', () => ({ PrismaClient: prismaCtor }));
    jest.doMock('../src/config/env', () => ({
      loadConfig: () => ({ DB_ENABLED: true }),
    }));

    const { getPrismaClient } = await import('../src/db/prismaClient');
    await getPrismaClient();
    expect(prismaCtor).toHaveBeenCalledWith({
      datasources: {
        db: { url: 'postgresql://user:pass@db:5432/name' },
      },
    });
  });

  it('returns pending connection when already connecting', async () => {
    let resolveConnect: () => void = () => {};
    const connectPromise = new Promise<void>((resolve) => {
      resolveConnect = resolve;
    });
    const connect = jest.fn().mockReturnValue(connectPromise);
    const prismaInstance = { $connect: connect };
    const prismaCtor = jest.fn(() => prismaInstance);

    jest.doMock('@prisma/client', () => ({ PrismaClient: prismaCtor }));
    jest.doMock('../src/config/env', () => ({
      loadConfig: () => ({
        DB_ENABLED: true,
        DB_HOST: 'localhost',
        DB_USER: 'user',
        DB_PASSWORD: 'pass',
        DB_NAME: 'db',
      }),
    }));

    const { getPrismaClient } = await import('../src/db/prismaClient');
    const pending = getPrismaClient();
    const pendingAgain = getPrismaClient();
    resolveConnect();
    await expect(pending).resolves.toBe(prismaInstance);
    await expect(pendingAgain).resolves.toBe(prismaInstance);
  });

  it('returns null when connection fails', async () => {
    const connect = jest.fn().mockRejectedValue(new Error('fail'));
    const prismaInstance = { $connect: connect };
    const prismaCtor = jest.fn(() => prismaInstance);

    jest.doMock('@prisma/client', () => ({ PrismaClient: prismaCtor }));
    jest.doMock('../src/config/env', () => ({
      loadConfig: () => ({
        DB_ENABLED: true,
        DB_HOST: 'localhost',
        DB_USER: 'user',
        DB_PASSWORD: 'pass',
        DB_NAME: 'db',
      }),
    }));

    const { getPrismaClient } = await import('../src/db/prismaClient');
    await expect(getPrismaClient()).resolves.toBeNull();
  });
});
