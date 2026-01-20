import type { EnvConfig } from '../config/schema';

/** Builds the Audible search URL with keyword and paging parameters. */
export function buildSearchUrl(config: EnvConfig, keywords: string, page: number): string {
  const url = new URL(config.AUDIBLE_SEARCH_PATH, config.AUDIBLE_BASE_URL);
  url.searchParams.set('keywords', keywords);
  url.searchParams.set('page', String(page));
  return url.toString();
}

/** Builds the Audible details URL for a given ASIN. */
export function buildDetailsUrl(baseUrl: string, asin: string): string {
  return new URL(`/pd/${asin}`, baseUrl).toString();
}
