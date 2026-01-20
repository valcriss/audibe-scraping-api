export type DetailsCacheSource = 'db' | 'redis' | 'scrape';

export function buildSearchMetadata(fromCache: boolean) {
  return { fromCache };
}

export function buildDetailsMetadata(fromCache: boolean, source: DetailsCacheSource) {
  return { fromCache, source };
}
