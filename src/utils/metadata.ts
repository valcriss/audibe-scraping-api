export type DetailsCacheSource = 'db' | 'redis' | 'scrape';

/** Builds response metadata for search endpoints. */
export function buildSearchMetadata(fromCache: boolean) {
  return { fromCache };
}

/** Builds response metadata for detail endpoints. */
export function buildDetailsMetadata(fromCache: boolean, source: DetailsCacheSource) {
  return { fromCache, source };
}
