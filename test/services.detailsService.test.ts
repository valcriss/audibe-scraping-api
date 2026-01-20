describe('detailsService', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('returns db cached details', async () => {
    jest.doMock('../src/db/bookDetailsCache', () => ({
      getCachedBookDetails: async () => ({ asin: 'B01', title: 't', authors: [], narrators: [] }),
      setCachedBookDetails: jest.fn(),
    }));
    jest.doMock('../src/config/env', () => ({
      loadConfig: () => ({ DB_ENABLED: true, REDIS_ENABLED: false, AUDIBLE_BASE_URL: 'https://x' }),
    }));
    jest.doMock('../src/http/cacheClient', () => ({ getCached: jest.fn(), setCached: jest.fn() }));
    jest.doMock('../src/http/audibleClient', () => ({ fetchHtml: jest.fn(), HttpError: class {} }));
    jest.doMock('../src/parsers/detailsParser', () => ({ parseBookDetails: jest.fn() }));

    const { getDetailsWithCache } = await import('../src/services/detailsService');
    const response = await getDetailsWithCache('B01');
    expect(response.metadata).toEqual({ fromCache: true, source: 'db' });
  });

  it('returns redis cached details when db disabled', async () => {
    jest.doMock('../src/db/bookDetailsCache', () => ({
      getCachedBookDetails: async () => null,
      setCachedBookDetails: jest.fn(),
    }));
    jest.doMock('../src/config/env', () => ({
      loadConfig: () => ({ DB_ENABLED: false, REDIS_ENABLED: true, AUDIBLE_BASE_URL: 'https://x' }),
    }));
    jest.doMock('../src/http/cacheClient', () => ({
      getCached: async () => ({ asin: 'B02', title: 't', authors: [], narrators: [] }),
      setCached: jest.fn(),
    }));
    jest.doMock('../src/http/audibleClient', () => ({ fetchHtml: jest.fn(), HttpError: class {} }));
    jest.doMock('../src/parsers/detailsParser', () => ({ parseBookDetails: jest.fn() }));

    const { getDetailsWithCache } = await import('../src/services/detailsService');
    const response = await getDetailsWithCache('B02');
    expect(response.metadata).toEqual({ fromCache: true, source: 'redis' });
  });

  it('scrapes and stores in db when enabled', async () => {
    const setCachedBookDetails = jest.fn();
    jest.doMock('../src/db/bookDetailsCache', () => ({
      getCachedBookDetails: async () => null,
      setCachedBookDetails,
    }));
    jest.doMock('../src/config/env', () => ({
      loadConfig: () => ({ DB_ENABLED: true, REDIS_ENABLED: false, AUDIBLE_BASE_URL: 'https://x' }),
    }));
    jest.doMock('../src/http/cacheClient', () => ({ getCached: jest.fn(), setCached: jest.fn() }));
    jest.doMock('../src/http/audibleClient', () => ({
      fetchHtml: async () => '<html></html>',
      HttpError: class HttpError extends Error {
        constructor() {
          super('err');
        }
      },
    }));
    jest.doMock('../src/parsers/detailsParser', () => ({
      parseBookDetails: () => ({ asin: 'B03', title: 't', authors: [], narrators: [] }),
    }));

    const { getDetailsWithCache } = await import('../src/services/detailsService');
    const response = await getDetailsWithCache('B03');
    expect(setCachedBookDetails).toHaveBeenCalled();
    expect(response.metadata).toEqual({ fromCache: false, source: 'scrape' });
  });

  it('scrapes and stores in redis when db disabled', async () => {
    const setCached = jest.fn();
    jest.doMock('../src/db/bookDetailsCache', () => ({
      getCachedBookDetails: async () => null,
      setCachedBookDetails: jest.fn(),
    }));
    jest.doMock('../src/config/env', () => ({
      loadConfig: () => ({ DB_ENABLED: false, REDIS_ENABLED: true, AUDIBLE_BASE_URL: 'https://x' }),
    }));
    jest.doMock('../src/http/cacheClient', () => ({ getCached: async () => null, setCached }));
    jest.doMock('../src/http/audibleClient', () => ({
      fetchHtml: async () => '<html></html>',
      HttpError: class HttpError extends Error {
        constructor() {
          super('err');
        }
      },
    }));
    jest.doMock('../src/parsers/detailsParser', () => ({
      parseBookDetails: () => ({ asin: 'B04', title: 't', authors: [], narrators: [] }),
    }));

    const { getDetailsWithCache } = await import('../src/services/detailsService');
    await getDetailsWithCache('B04');
    expect(setCached).toHaveBeenCalledWith('details:B04', {
      asin: 'B04',
      title: 't',
      authors: [],
      narrators: [],
    });
  });

  it('throws when details missing title', async () => {
    jest.doMock('../src/db/bookDetailsCache', () => ({
      getCachedBookDetails: async () => null,
      setCachedBookDetails: jest.fn(),
    }));
    jest.doMock('../src/config/env', () => ({
      loadConfig: () => ({ DB_ENABLED: false, REDIS_ENABLED: false, AUDIBLE_BASE_URL: 'https://x' }),
    }));
    jest.doMock('../src/http/cacheClient', () => ({ getCached: async () => null, setCached: jest.fn() }));
    class HttpError extends Error {}
    jest.doMock('../src/http/audibleClient', () => ({
      fetchHtml: async () => '<html></html>',
      HttpError,
    }));
    jest.doMock('../src/parsers/detailsParser', () => ({
      parseBookDetails: () => ({ asin: 'B05', title: '', authors: [], narrators: [] }),
    }));

    const { getDetailsWithCache } = await import('../src/services/detailsService');
    await expect(getDetailsWithCache('B05')).rejects.toBeInstanceOf(HttpError);
  });
});
