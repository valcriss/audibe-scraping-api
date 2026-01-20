describe('searchService', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('returns cached response', async () => {
    jest.doMock('../src/config/env', () => ({
      loadConfig: () => ({
        AUDIBLE_BASE_URL: 'https://audible.test',
        AUDIBLE_SEARCH_PATH: '/search',
        SEARCH_CACHE_TTL_SECONDS: 10,
      }),
    }));
    jest.doMock('../src/http/cacheClient', () => ({
      getCached: async () => ({
        query: { keywords: 'test', page: 1 },
        items: [],
        metadata: { fromCache: false },
      }),
      setCached: jest.fn(),
    }));
    jest.doMock('../src/http/audibleClient', () => ({ fetchHtml: jest.fn() }));
    jest.doMock('../src/parsers/searchParser', () => ({ parseSearchResults: jest.fn() }));

    const { getSearchResponse } = await import('../src/services/searchService');
    const response = await getSearchResponse('test', 1);
    expect(response.metadata).toEqual({ fromCache: true });
  });

  it('fetches and caches on miss', async () => {
    const setCached = jest.fn();
    jest.doMock('../src/config/env', () => ({
      loadConfig: () => ({
        AUDIBLE_BASE_URL: 'https://audible.test',
        AUDIBLE_SEARCH_PATH: '/search',
        SEARCH_CACHE_TTL_SECONDS: 10,
      }),
    }));
    jest.doMock('../src/http/cacheClient', () => ({
      getCached: async () => null,
      setCached,
    }));
    jest.doMock('../src/http/audibleClient', () => ({ fetchHtml: async () => '<html></html>' }));
    jest.doMock('../src/parsers/searchParser', () => ({
      parseSearchResults: () => [
        { asin: 'B01', title: 'Title', authors: ['A'], releaseDate: '2020-01-01' },
      ],
    }));

    const { getSearchResponse } = await import('../src/services/searchService');
    const response = await getSearchResponse('test', 1);
    expect(response.items[0].asin).toBe('B01');
    expect(setCached).toHaveBeenCalled();
  });
});
