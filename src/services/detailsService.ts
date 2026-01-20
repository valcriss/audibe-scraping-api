import { loadConfig } from '../config/env';
import { fetchHtml, HttpError } from '../http/audibleClient';
import { getCachedBookDetails, setCachedBookDetails } from '../db/bookDetailsCache';
import { getCached, setCached } from '../http/cacheClient';
import { parseBookDetails } from '../parsers/detailsParser';
import type { BookDetails } from '../models/api';
import { buildDetailsUrl } from '../utils/audible';
import { buildDetailsMetadata, type DetailsCacheSource } from '../utils/metadata';

export type DetailsResponse = BookDetails & {
  metadata: ReturnType<typeof buildDetailsMetadata>;
};

/** Builds a details response payload with metadata. */
function buildDetailsResponse(
  details: BookDetails,
  fromCache: boolean,
  source: DetailsCacheSource,
): DetailsResponse {
  return {
    ...details,
    metadata: buildDetailsMetadata(fromCache, source),
  };
}

/** Loads cached details from the database cache. */
async function getFromDatabase(asin: string): Promise<BookDetails | null> {
  return getCachedBookDetails(asin);
}

/** Loads cached details from Redis when enabled. */
async function getFromRedis(asin: string, enabled: boolean): Promise<BookDetails | null> {
  if (!enabled) {
    return null;
  }
  return getCached<BookDetails>(`details:${asin}`);
}

/** Scrapes Audible for book details and maps them into the API model. */
async function fetchDetailsFromAudible(asin: string, baseUrl: string): Promise<BookDetails> {
  const detailUrl = buildDetailsUrl(baseUrl, asin);
  const html = await fetchHtml(detailUrl, { allowNotFound: true });
  const details = parseBookDetails(asin, html);
  if (!details.title) {
    throw new HttpError('NOT_FOUND', 'Book details not found', 404);
  }
  return details;
}

/** Persists details into the configured cache layer. */
async function persistDetails(
  details: BookDetails,
  dbEnabled: boolean,
  redisEnabled: boolean,
): Promise<void> {
  if (dbEnabled) {
    await setCachedBookDetails(details);
    return;
  }
  if (redisEnabled) {
    await setCached(`details:${details.asin}`, details);
  }
}

/** Retrieves book details with database/Redis cache fallbacks. */
export async function getDetailsWithCache(asin: string): Promise<DetailsResponse> {
  const cachedDb = await getFromDatabase(asin);
  if (cachedDb) {
    return buildDetailsResponse(cachedDb, true, 'db');
  }

  const config = loadConfig();
  if (!config.DB_ENABLED) {
    const cachedRedis = await getFromRedis(asin, config.REDIS_ENABLED);
    if (cachedRedis) {
      return buildDetailsResponse(cachedRedis, true, 'redis');
    }
  }

  const details = await fetchDetailsFromAudible(asin, config.AUDIBLE_BASE_URL);
  await persistDetails(details, config.DB_ENABLED, config.REDIS_ENABLED);
  return buildDetailsResponse(details, false, 'scrape');
}
