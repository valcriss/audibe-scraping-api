# Audibe Scraping API (MVP)

Node/TypeScript API to search and retrieve audiobook details from Audible.fr.
This project is intended for local development only and should not be exposed publicly.

## Stack
- Node.js LTS, TypeScript, Express
- HTTP: undici
- HTML parsing: cheerio
- Validation: zod
- Logging: pino + pino-http
- Tests: Jest
- Cache: Redis (optional) + PostgreSQL via Prisma (optional)
- Docs: Swagger UI

## Endpoints
- GET /health
  - Purpose: Health check to verify the server is running.
  - Parameters: none.
  - Example:
    - Request: `GET /health`
    - Response:
      ```json
      { "status": "ok" }
      ```

- GET /search?keywords=...&page=1
  - Purpose: Search Audible for audiobooks by keywords.
  - Parameters:
    - keywords (string, required)
    - page (number, optional, default 1)
  - Example:
    - Request: `GET /search?keywords=harry%20potter&page=1`
    - Response:
      ```json
      {
        "query": { "keywords": "harry potter", "page": 1 },
        "items": [
          {
            "asin": "B012345678",
            "title": "Some Title",
            "authors": ["Author One"],
            "releaseDate": "2024-12-12"
          }
        ],
        "metadata": { "fromCache": false }
      }
      ```

- GET /details/:asin
  - Purpose: Fetch detailed information for a specific audiobook by ASIN.
  - Parameters:
    - asin (string, required)
  - Example:
    - Request: `GET /details/B012345678`
    - Response:
      ```json
      {
        "asin": "B012345678",
        "title": "Detail Title",
        "authors": ["Author One"],
        "narrators": ["Narrator One"],
        "publisher": "Publisher",
        "releaseDate": "2022-01-01",
        "language": "fr-FR",
        "runtimeMinutes": 605,
        "series": { "name": "Series", "position": 1 },
        "categories": ["Fantasy"],
        "rating": 4.6,
        "ratingCount": 1234,
        "description": "...",
        "coverUrl": "https://example.com/cover.jpg",
        "thumbnails": ["https://example.com/1.jpg"],
        "metadata": { "fromCache": false, "source": "scrape" }
      }
      ```

- GET /find?keywords=...
  - Purpose: Search and return details for the first result.
  - Parameters:
    - keywords (string, required)
  - Example:
    - Request: `GET /find?keywords=harry%20potter`
    - Response:
      ```json
      {
        "asin": "B012345678",
        "title": "Detail Title",
        "authors": ["Author One"],
        "narrators": ["Narrator One"],
        "publisher": "Publisher",
        "releaseDate": "2022-01-01",
        "language": "fr-FR",
        "runtimeMinutes": 605,
        "series": { "name": "Series", "position": 1 },
        "categories": ["Fantasy"],
        "rating": 4.6,
        "ratingCount": 1234,
        "description": "...",
        "coverUrl": "https://example.com/cover.jpg",
        "thumbnails": ["https://example.com/1.jpg"],
        "metadata": { "fromCache": false, "source": "scrape" }
      }
      ```

- Swagger UI: /docs
  - Purpose: Interactive API documentation.
  - Parameters: none.
  - Example:
    - URL: `http://localhost:3000/docs`

## Cache behavior
- /search: Redis cache for 24h (SEARCH_CACHE_TTL_SECONDS)
- /details: PostgreSQL cache if DB_ENABLED=true, otherwise Redis if REDIS_ENABLED=true
- /find: reuses /search and /details

## Configuration (.env)
All available variables are listed in `.env.example`.

Minimal example:

```
PORT=3000
NODE_ENV=development

AUDIBLE_BASE_URL=https://www.audible.fr
AUDIBLE_SEARCH_PATH=/search

REDIS_ENABLED=false
DB_ENABLED=false
```

## How to use (Docker Compose)
The production `docker-compose.yml` uses the published GitHub Container Registry image.

1) Copy `.env.example` to `.env` and set the required values.
2) Start the stack:

```
docker compose up -d
```

This will pull `ghcr.io/valcriss/audibe-scraping-api:latest`, start Redis and Postgres,
run migrations in the container entrypoint, and expose the API on `PORT` (default 3000).

## Local development
1) Start Redis and Postgres (optional):
```
docker compose -f docker-compose.dev.yml up
```
2) Install and run the API:
```
npm install
npm run dev
```

## Prisma migrations
- Generate client: `npm run prisma:generate`
- Deploy migrations: `npm run migrate`

## Tests
```
npm test
```

## Educational purpose and usage restrictions
This project is an educational exercise to demonstrate HTML scraping, caching, and API structuring.
You are not allowed to use this project to scrape Audible.fr or any other website without explicit permission.
Always respect the terms of service and applicable laws.

## Notes
- The API is designed for private/local use.
- HTML may change at any time; parsing is best-effort.
