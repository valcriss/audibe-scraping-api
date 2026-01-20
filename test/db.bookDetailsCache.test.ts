describe('bookDetailsCache', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('returns null when prisma is not available', async () => {
    jest.doMock('../src/db/prismaClient', () => ({ getPrismaClient: async () => null }));
    const { getCachedBookDetails, setCachedBookDetails } = await import(
      '../src/db/bookDetailsCache'
    );

    await expect(getCachedBookDetails('B01')).resolves.toBeNull();
    await expect(setCachedBookDetails({ asin: 'B01', title: 't', authors: [], narrators: [] })).resolves.toBeUndefined();
  });

  it('returns cached record payload', async () => {
    const findUnique = jest.fn().mockResolvedValue({ payload: { asin: 'B01' } });
    const prisma = { bookDetailsCache: { findUnique } };
    jest.doMock('../src/db/prismaClient', () => ({ getPrismaClient: async () => prisma }));

    const { getCachedBookDetails } = await import('../src/db/bookDetailsCache');
    await expect(getCachedBookDetails('B01')).resolves.toEqual({ asin: 'B01' });
  });

  it('returns null when record is missing', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const prisma = { bookDetailsCache: { findUnique } };
    jest.doMock('../src/db/prismaClient', () => ({ getPrismaClient: async () => prisma }));

    const { getCachedBookDetails } = await import('../src/db/bookDetailsCache');
    await expect(getCachedBookDetails('B01')).resolves.toBeNull();
  });

  it('returns null on findUnique error', async () => {
    const findUnique = jest.fn().mockRejectedValue(new Error('fail'));
    const prisma = { bookDetailsCache: { findUnique } };
    jest.doMock('../src/db/prismaClient', () => ({ getPrismaClient: async () => prisma }));

    const { getCachedBookDetails } = await import('../src/db/bookDetailsCache');
    await expect(getCachedBookDetails('B01')).resolves.toBeNull();
  });

  it('upserts cached record', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const prisma = { bookDetailsCache: { upsert } };
    jest.doMock('../src/db/prismaClient', () => ({ getPrismaClient: async () => prisma }));

    const { setCachedBookDetails } = await import('../src/db/bookDetailsCache');
    await setCachedBookDetails({ asin: 'B01', title: 't', authors: [], narrators: [] });
    expect(upsert).toHaveBeenCalled();
  });

  it('swallows upsert error', async () => {
    const upsert = jest.fn().mockRejectedValue(new Error('fail'));
    const prisma = { bookDetailsCache: { upsert } };
    jest.doMock('../src/db/prismaClient', () => ({ getPrismaClient: async () => prisma }));

    const { setCachedBookDetails } = await import('../src/db/bookDetailsCache');
    await expect(
      setCachedBookDetails({ asin: 'B01', title: 't', authors: [], narrators: [] }),
    ).resolves.toBeUndefined();
  });
});
