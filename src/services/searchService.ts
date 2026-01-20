import { loadConfig } from '../config/env';
import { fetchHtml } from '../http/audibleClient';
import { getCached, setCached } from '../http/cacheClient';
import { parseSearchResults } from '../parsers/searchParser';
import { buildSearchUrl } from '../utils/audible';
import { buildSearchMetadata } from '../utils/metadata';

export type SearchResponsePayload = {
  query: {
    keywords: string;
    page: number;
  };
  items: Array<{
    asin: string;
    title: string;
    authors: string[];
    releaseDate?: string;
  }>;
  metadata: {
    fromCache: boolean;
  };
};

function buildCacheKey(keywords: string, page: number): string {
  return `search:${keywords.toLowerCase()}:${page}`;
}

function toSearchItems(items: ReturnType<typeof parseSearchResults>): SearchResponsePayload['items'] {
  return items.slice(0, 5).map((item) => ({
    asin: item.asin,
    title: item.title,
    authors: item.authors,
    releaseDate: item.releaseDate,
  }));
}

function buildSearchResponse(
  keywords: string,
  page: number,
  items: SearchResponsePayload['items'],
  fromCache: boolean,
): SearchResponsePayload {
  return {
    query: {
      keywords,
      page,
    },
    items,
    metadata: buildSearchMetadata(fromCache),
  };
}

export async function getSearchResponse(
  keywords: string,
  page: number,
): Promise<SearchResponsePayload> {
  const config = loadConfig();
  const cacheKey = buildCacheKey(keywords, page);
  const cached = await getCached<SearchResponsePayload>(cacheKey);
  if (cached) {
    return buildSearchResponse(keywords, page, cached.items, true);
  }

  const url = buildSearchUrl(config, keywords, page);
  const html = await fetchHtml(url);
  const parsedItems = parseSearchResults(html, config.AUDIBLE_BASE_URL);
  const items = toSearchItems(parsedItems);

  const response = buildSearchResponse(keywords, page, items, false);
  await setCached(cacheKey, response, config.SEARCH_CACHE_TTL_SECONDS);
  return response;
}
