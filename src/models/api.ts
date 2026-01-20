export type ApiErrorCode = 'VALIDATION_ERROR' | 'UPSTREAM_ERROR' | 'PARSING_ERROR' | 'NOT_FOUND';

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
};

export type SearchItem = {
  asin: string;
  title: string;
  authors: string[];
  narrators: string[];
  releaseDate?: string;
  releaseYear?: number;
  runtimeMinutes?: number;
  language?: string;
  rating?: number;
  ratingCount?: number;
  thumbnailUrl?: string;
  detailUrl: string;
};

export type SearchResponse = {
  query: {
    keywords: string;
    page: number;
  };
  items: SearchItem[];
};

export type BookDetails = {
  asin: string;
  title: string;
  authors: string[];
  narrators: string[];
  publisher?: string;
  releaseDate?: string;
  language?: string;
  runtimeMinutes?: number;
  series?: {
    name: string;
    position?: number;
  };
  categories?: string[];
  rating?: number;
  ratingCount?: number;
  description?: string;
  coverUrl?: string;
  thumbnails?: string[];
};
