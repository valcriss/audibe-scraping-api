describe('fetchHtml', () => {
  const mockResponse = (statusCode: number, bodyText: string) => ({
    statusCode,
    body: {
      text: async () => bodyText,
    },
  });

  beforeEach(() => {
    jest.resetModules();
  });

  it('returns html on success', async () => {
    const request = jest.fn().mockResolvedValue(mockResponse(200, '<html></html>'));
    jest.doMock('undici', () => ({ request }));
    jest.doMock('../src/config/env', () => ({
      loadConfig: () => ({
        AUDIBLE_USER_AGENT: 'ua',
        AUDIBLE_ACCEPT_LANGUAGE: 'fr',
        AUDIBLE_TIMEOUT_MS: 1000,
      }),
    }));
    jest.doMock('../src/http/outboundLimiter', () => ({
      outboundLimiter: { schedule: (fn: () => Promise<string>) => fn() },
    }));

    const { fetchHtml } = await import('../src/http/audibleClient');
    const result = await fetchHtml('https://example.com');
    expect(result).toBe('<html></html>');
    expect(request).toHaveBeenCalled();
  });

  it('throws NOT_FOUND on 404 with allowNotFound', async () => {
    const request = jest.fn().mockResolvedValue(mockResponse(404, 'missing'));
    jest.doMock('undici', () => ({ request }));
    jest.doMock('../src/config/env', () => ({
      loadConfig: () => ({
        AUDIBLE_USER_AGENT: 'ua',
        AUDIBLE_ACCEPT_LANGUAGE: 'fr',
        AUDIBLE_TIMEOUT_MS: 1000,
      }),
    }));
    jest.doMock('../src/http/outboundLimiter', () => ({
      outboundLimiter: { schedule: (fn: () => Promise<string>) => fn() },
    }));

    const { fetchHtml, HttpError } = await import('../src/http/audibleClient');
    await expect(fetchHtml('https://example.com', { allowNotFound: true })).rejects.toBeInstanceOf(
      HttpError,
    );
  });

  it('throws UPSTREAM_ERROR on >=400', async () => {
    const request = jest.fn().mockResolvedValue(mockResponse(500, 'error'));
    jest.doMock('undici', () => ({ request }));
    jest.doMock('../src/config/env', () => ({
      loadConfig: () => ({
        AUDIBLE_USER_AGENT: 'ua',
        AUDIBLE_ACCEPT_LANGUAGE: 'fr',
        AUDIBLE_TIMEOUT_MS: 1000,
      }),
    }));
    jest.doMock('../src/http/outboundLimiter', () => ({
      outboundLimiter: { schedule: (fn: () => Promise<string>) => fn() },
    }));

    const { fetchHtml, HttpError } = await import('../src/http/audibleClient');
    await expect(fetchHtml('https://example.com')).rejects.toBeInstanceOf(HttpError);
  });
});
