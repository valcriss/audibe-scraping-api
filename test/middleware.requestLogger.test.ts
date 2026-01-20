describe('requestLogger', () => {
  it('uses info level in production', async () => {
    jest.resetModules();
    process.env.NODE_ENV = 'production';
    const pinoHttp = jest.fn(() => 'logger');
    jest.doMock('pino-http', () => ({ __esModule: true, default: pinoHttp }));

    const { requestLogger } = await import('../src/middleware/requestLogger');
    expect(requestLogger).toBe('logger');
    expect(pinoHttp).toHaveBeenCalledWith({ level: 'info' });
  });

  it('uses debug level in development', async () => {
    jest.resetModules();
    process.env.NODE_ENV = 'development';
    const pinoHttp = jest.fn(() => 'logger');
    jest.doMock('pino-http', () => ({ __esModule: true, default: pinoHttp }));

    const { requestLogger } = await import('../src/middleware/requestLogger');
    expect(requestLogger).toBe('logger');
    expect(pinoHttp).toHaveBeenCalledWith({ level: 'debug' });
  });
});
