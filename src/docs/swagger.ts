import { loadConfig } from '../config/env';

export function buildSwaggerSpec() {
  const config = loadConfig();

  return {
    openapi: '3.0.3',
    info: {
      title: 'Audible Scraping API',
      version: '0.1.0',
      description: 'Local API for scraping Audible search and book details.',
    },
    servers: [
      {
        url: `http://localhost:${config.PORT}`,
        description: 'Local development',
      },
    ],
    tags: [
      { name: 'Health' },
      { name: 'Search' },
      { name: 'Details' },
    ],
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          responses: {
            '200': {
              description: 'Server is running',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                    },
                    required: ['status'],
                  },
                },
              },
            },
          },
        },
      },
      '/search': {
        get: {
          tags: ['Search'],
          summary: 'Search Audible catalog',
          parameters: [
            {
              name: 'keywords',
              in: 'query',
              required: true,
              schema: { type: 'string' },
              example: 'harry potter',
            },
            {
              name: 'page',
              in: 'query',
              required: false,
              schema: { type: 'integer', minimum: 1, default: 1 },
            },
          ],
          responses: {
            '200': {
              description: 'Search results',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SearchResponse' },
                },
              },
            },
            '400': {
              description: 'Invalid query parameters',
            },
            '502': {
              description: 'Upstream error',
            },
            '500': {
              description: 'Parsing error',
            },
          },
        },
      },
      '/details/{asin}': {
        get: {
          tags: ['Details'],
          summary: 'Fetch book details by ASIN',
          parameters: [
            {
              name: 'asin',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Book details',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/BookDetailsResponse' },
                },
              },
            },
            '400': {
              description: 'Invalid ASIN',
            },
            '404': {
              description: 'Book not found',
            },
            '502': {
              description: 'Upstream error',
            },
            '500': {
              description: 'Parsing error',
            },
          },
        },
      },
      '/find': {
        get: {
          tags: ['Search', 'Details'],
          summary: 'Search and return details of the first match',
          parameters: [
            {
              name: 'keywords',
              in: 'query',
              required: true,
              schema: { type: 'string' },
              example: 'harry potter',
            },
          ],
          responses: {
            '200': {
              description: 'Details for the first match, or empty object when no results',
              content: {
                'application/json': {
                  schema: {
                    oneOf: [
                      { $ref: '#/components/schemas/BookDetailsResponse' },
                      { $ref: '#/components/schemas/EmptyObject' },
                    ],
                  },
                },
              },
            },
            '400': {
              description: 'Invalid query parameters',
            },
            '502': {
              description: 'Upstream error',
            },
            '500': {
              description: 'Parsing error',
            },
          },
        },
      },
    },
    components: {
      schemas: {
        SearchItem: {
          type: 'object',
          properties: {
            asin: { type: 'string' },
            title: { type: 'string' },
            authors: { type: 'array', items: { type: 'string' } },
            releaseDate: { type: 'string', format: 'date' },
          },
          required: ['asin', 'title', 'authors'],
        },
        SearchResponse: {
          type: 'object',
          properties: {
            query: {
              type: 'object',
              properties: {
                keywords: { type: 'string' },
                page: { type: 'integer' },
              },
              required: ['keywords', 'page'],
            },
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/SearchItem' },
            },
            metadata: {
              type: 'object',
              properties: {
                fromCache: { type: 'boolean' },
              },
              required: ['fromCache'],
            },
          },
          required: ['query', 'items', 'metadata'],
        },
        BookDetails: {
          type: 'object',
          properties: {
            asin: { type: 'string' },
            title: { type: 'string' },
            authors: { type: 'array', items: { type: 'string' } },
            narrators: { type: 'array', items: { type: 'string' } },
            publisher: { type: 'string' },
            releaseDate: { type: 'string', format: 'date' },
            language: { type: 'string' },
            runtimeMinutes: { type: 'integer' },
            series: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                position: { type: 'integer' },
              },
            },
            categories: { type: 'array', items: { type: 'string' } },
            rating: { type: 'number' },
            ratingCount: { type: 'integer' },
            description: { type: 'string' },
            coverUrl: { type: 'string', format: 'uri' },
            thumbnails: { type: 'array', items: { type: 'string', format: 'uri' } },
          },
          required: ['asin', 'title', 'authors', 'narrators'],
        },
        BookDetailsResponse: {
          allOf: [
            { $ref: '#/components/schemas/BookDetails' },
            {
              type: 'object',
              properties: {
                metadata: {
                  type: 'object',
                  properties: {
                    fromCache: { type: 'boolean' },
                    source: { type: 'string', enum: ['db', 'redis', 'scrape'] },
                  },
                  required: ['fromCache', 'source'],
                },
              },
              required: ['metadata'],
            },
          ],
        },
        EmptyObject: {
          type: 'object',
          additionalProperties: false,
        },
        ApiError: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'object' },
          },
          required: ['code', 'message'],
        },
      },
    },
  };
}
