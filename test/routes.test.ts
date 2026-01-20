import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { MockAgent, getGlobalDispatcher, setGlobalDispatcher } from 'undici';

const searchHtml = fs.readFileSync(path.join(__dirname, 'fixtures', 'search.html'), 'utf-8');
const detailsHtml = fs.readFileSync(path.join(__dirname, 'fixtures', 'details.html'), 'utf-8');

const originalDispatcher = getGlobalDispatcher();

async function loadApp() {
  jest.resetModules();
  const module = await import('../src/app');
  return module.app;
}

function setupMockAgent() {
  const mockAgent = new MockAgent();
  mockAgent.disableNetConnect();
  setGlobalDispatcher(mockAgent);
  return mockAgent;
}

describe('routes', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.AUDIBLE_BASE_URL = 'https://audible.test';
    process.env.AUDIBLE_SEARCH_PATH = '/search';
    process.env.AUDIBLE_DETAILS_URL_MODE = 'guess';
    process.env.API_RATE_LIMIT_ENABLED = 'false';
    process.env.REDIS_ENABLED = 'false';
    process.env.DB_ENABLED = 'false';
  });

  afterEach(() => {
    setGlobalDispatcher(originalDispatcher);
  });

  it('GET /health responds ok', async () => {
    const app = await loadApp();
    await request(app).get('/health').expect(200, { status: 'ok' });
  });

  it('GET /search returns items', async () => {
    const mockAgent = setupMockAgent();
    const client = mockAgent.get('https://audible.test');
    client
      .intercept({
        path: '/search?keywords=harry%20potter&page=1',
        method: 'GET',
      })
      .reply(200, searchHtml, { headers: { 'content-type': 'text/html' } });

    const app = await loadApp();
    const response = await request(app).get('/search?keywords=harry%20potter').expect(200);
    expect(response.body.items.length).toBeGreaterThan(0);
    expect(response.body.items.length).toBeLessThanOrEqual(5);
    expect(response.body.items[0].asin).toBe('B012345678');
    expect(response.body.items[0]).toMatchObject({
      asin: 'B012345678',
      title: 'Some Title',
      authors: ['Author One'],
      releaseDate: '2022-01-01',
    });
    expect(response.body.metadata).toEqual({ fromCache: false });
  });

  it('GET /search returns 400 on invalid query', async () => {
    const app = await loadApp();
    await request(app).get('/search').expect(400);
  });

  it('GET /details returns details', async () => {
    const mockAgent = setupMockAgent();
    const client = mockAgent.get('https://audible.test');
    client
      .intercept({
        path: '/pd/B012345678',
        method: 'GET',
      })
      .reply(200, detailsHtml, { headers: { 'content-type': 'text/html' } });

    const app = await loadApp();
    const response = await request(app).get('/details/B012345678').expect(200);
    expect(response.body.title).toBe('Detail Title');
    expect(response.body.asin).toBe('B012345678');
  });

  it('GET /details returns 400 on invalid asin', async () => {
    const app = await loadApp();
    await request(app).get('/details/!!').expect(400);
  });

  it('GET /find returns details for first match', async () => {
    const mockAgent = setupMockAgent();
    const client = mockAgent.get('https://audible.test');
    client
      .intercept({
        path: '/search?keywords=harry%20potter&page=1',
        method: 'GET',
      })
      .reply(200, searchHtml, { headers: { 'content-type': 'text/html' } });
    client
      .intercept({
        path: '/pd/B012345678',
        method: 'GET',
      })
      .reply(200, detailsHtml, { headers: { 'content-type': 'text/html' } });

    const app = await loadApp();
    const response = await request(app).get('/find?keywords=harry%20potter').expect(200);
    expect(response.body.asin).toBe('B012345678');
    expect(response.body.title).toBe('Detail Title');
    expect(response.body.metadata).toEqual({ fromCache: false, source: 'scrape' });
  });

  it('GET /find returns empty object when no results', async () => {
    const mockAgent = setupMockAgent();
    const client = mockAgent.get('https://audible.test');
    client
      .intercept({
        path: '/search?keywords=empty&page=1',
        method: 'GET',
      })
      .reply(200, '<html></html>', { headers: { 'content-type': 'text/html' } });

    const app = await loadApp();
    const response = await request(app).get('/find?keywords=empty').expect(200);
    expect(response.body).toEqual({});
  });

  it('GET /find returns 400 on invalid query', async () => {
    const app = await loadApp();
    await request(app).get('/find').expect(400);
  });
});
