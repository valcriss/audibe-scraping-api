import * as cheerio from 'cheerio';
import type { BookDetails } from '../models/api';
import { normalizeText, parseInteger, parseNumber } from '../utils/url';

/** Deduplicates an array of strings while preserving truthy values. */
function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

/** Parses ISO-8601 duration text into total minutes. */
function parseDurationToMinutes(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }
  const match = value.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!match) {
    return undefined;
  }
  const hours = match[1] ? Number.parseInt(match[1], 10) : 0;
  const mins = match[2] ? Number.parseInt(match[2], 10) : 0;
  const total = hours * 60 + mins;
  return total > 0 ? total : undefined;
}

type JsonDetails = Partial<BookDetails> | undefined;

/** Extracts JSON-LD objects embedded in HTML. */
function readJsonLd(html: string): Record<string, unknown>[] {
  const $ = cheerio.load(html);
  const items: Record<string, unknown>[] = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    const content = $(element).contents().text();
    if (!content) {
      return;
    }
    try {
      const parsed = JSON.parse(content) as unknown;
      if (Array.isArray(parsed)) {
        parsed.forEach((entry) => {
          if (entry && typeof entry === 'object') {
            items.push(entry as Record<string, unknown>);
          }
        });
      } else if (parsed && typeof parsed === 'object') {
        items.push(parsed as Record<string, unknown>);
      }
    } catch {
      return;
    }
  });

  return items;
}

/** Maps JSON-LD book fields into a partial BookDetails object. */
function extractJsonLdDetails(json: Record<string, unknown>): Partial<BookDetails> {
  const typeValue = json['@type'];
  const typeText = Array.isArray(typeValue) ? typeValue.join(' ') : String(typeValue || '');
  if (!typeText.toLowerCase().includes('book')) {
    return {};
  }

  const authors = Array.isArray(json.author)
    ? json.author
    : json.author
      ? [json.author]
      : [];
  const authorNames = authors
    .map((author) => {
      if (typeof author === 'string') {
        return author;
      }
      if (author && typeof author === 'object' && 'name' in author) {
        return String((author as Record<string, unknown>).name || '').trim();
      }
      return '';
    })
    .filter(Boolean);

  const ratingObj = json.aggregateRating as Record<string, unknown> | undefined;
  const ratingValue = ratingObj?.ratingValue ? Number(ratingObj.ratingValue) : undefined;
  const ratingCount = ratingObj?.ratingCount ? Number(ratingObj.ratingCount) : undefined;

  const imageValue = json.image;
  const imageUrl = Array.isArray(imageValue) ? String(imageValue[0] || '') : String(imageValue || '');

  return {
    title: json.name ? String(json.name) : undefined,
    authors: authorNames,
    description: json.description ? String(json.description) : undefined,
    publisher: json.publisher ? String(json.publisher) : undefined,
    releaseDate: json.datePublished ? String(json.datePublished) : undefined,
    language: json.inLanguage ? String(json.inLanguage) : undefined,
    rating: Number.isFinite(ratingValue) ? ratingValue : undefined,
    ratingCount: Number.isFinite(ratingCount) ? ratingCount : undefined,
    coverUrl: imageUrl || undefined,
    runtimeMinutes: parseDurationToMinutes(typeof json.duration === 'string' ? json.duration : undefined),
  };
}

/** Finds the first JSON-LD entry that looks like book metadata. */
function findJsonDetails(html: string): JsonDetails {
  const jsonLd = readJsonLd(html);
  return jsonLd
    .map((entry) => extractJsonLdDetails(entry))
    .find((entry) => entry.title || entry.authors?.length);
}

/** Extracts the book title from JSON-LD or the DOM. */
function extractTitle($: cheerio.CheerioAPI, jsonDetails?: JsonDetails): string {
  return (
    jsonDetails?.title ||
    normalizeText($('h1').first().text()) ||
    normalizeText($('meta[property="og:title"]').attr('content') || '')
  );
}

/** Extracts author names from JSON-LD or the DOM. */
function extractAuthors($: cheerio.CheerioAPI, jsonDetails?: JsonDetails): string[] {
  return unique([
    ...(jsonDetails?.authors ?? []),
    ...$('li.authorLabel a, span.authorLabel a, a[href*="/author/"]')
      .map((_, el) => normalizeText($(el).text()))
      .get(),
  ]);
}

/** Extracts narrator names from the DOM. */
function extractNarrators($: cheerio.CheerioAPI): string[] {
  return unique(
    $('li.narratorLabel a, span.narratorLabel a, a[href*="/narrator/"]')
      .map((_, el) => normalizeText($(el).text()))
      .get(),
  );
}

/** Extracts the description from JSON-LD or meta tags. */
function extractDescription($: cheerio.CheerioAPI, jsonDetails?: JsonDetails): string | undefined {
  return (
    jsonDetails?.description ||
    normalizeText($('#description').text()) ||
    normalizeText($('meta[name="description"]').attr('content') || '')
  );
}

/** Extracts the primary cover image URL. */
function extractCoverUrl($: cheerio.CheerioAPI, jsonDetails?: JsonDetails): string | undefined {
  return (
    jsonDetails?.coverUrl ||
    $('meta[property="og:image"]').attr('content') ||
    $('img#bookCover').attr('src') ||
    undefined
  );
}

/** Extracts a small set of image thumbnails from the page. */
function extractThumbnails($: cheerio.CheerioAPI): string[] | undefined {
  const thumbnails = unique(
    $('img')
      .map((_, el) => $(el).attr('src') || '')
      .get()
      .filter((src) => src.startsWith('https://')),
  ).slice(0, 7);
  return thumbnails.length > 0 ? thumbnails : undefined;
}

/** Extracts the rating value from JSON-LD or DOM attributes. */
function extractRating($: cheerio.CheerioAPI, jsonDetails?: JsonDetails): number | undefined {
  const ratingLabel =
    $('[aria-label*="etoile"], [aria-label*="star"], [aria-label*="\\u00e9toile"]')
      .first()
      .attr('aria-label') ||
    $('[itemprop="ratingValue"]').attr('content') ||
    '';
  return jsonDetails?.rating ?? parseNumber(ratingLabel);
}

/** Extracts the rating count from JSON-LD or DOM attributes. */
function extractRatingCount($: cheerio.CheerioAPI, jsonDetails?: JsonDetails): number | undefined {
  const ratingCountText =
    $('[itemprop="ratingCount"]').attr('content') ||
    $('[data-qa="rating-count"]').text() ||
    '';
  return jsonDetails?.ratingCount ?? parseInteger(ratingCountText);
}

/** Extracts breadcrumb categories from the DOM. */
function extractCategories($: cheerio.CheerioAPI): string[] | undefined {
  const breadcrumbs = unique(
    $('nav[aria-label="Breadcrumb"] a, .bc-breadcrumb a')
      .map((_, el) => normalizeText($(el).text()))
      .get()
      .filter(Boolean),
  );
  return breadcrumbs.length > 0 ? breadcrumbs : undefined;
}

/** Extracts series name and position when present. */
function extractSeries($: cheerio.CheerioAPI): BookDetails['series'] | undefined {
  const seriesName = normalizeText($('.seriesLabel a, a[href*="/series/"]').first().text());
  const seriesPositionText = normalizeText($('.seriesLabel').text());
  const seriesPosition = parseInteger(seriesPositionText);
  return seriesName
    ? {
        name: seriesName,
        position: seriesPosition,
      }
    : undefined;
}

/** Parses book details from an Audible details page HTML. */
export function parseBookDetails(asin: string, html: string): BookDetails {
  const $ = cheerio.load(html);

  const jsonDetails = findJsonDetails(html);
  const title = extractTitle($, jsonDetails);
  const authors = extractAuthors($, jsonDetails);
  const narrators = extractNarrators($);
  const description = extractDescription($, jsonDetails);
  const coverUrl = extractCoverUrl($, jsonDetails);
  const thumbnails = extractThumbnails($);
  const rating = extractRating($, jsonDetails);
  const ratingCount = extractRatingCount($, jsonDetails);
  const categories = extractCategories($);
  const series = extractSeries($);

  const details: BookDetails = {
    asin,
    title,
    authors,
    narrators,
    publisher: jsonDetails?.publisher,
    releaseDate: jsonDetails?.releaseDate,
    language: jsonDetails?.language,
    runtimeMinutes: jsonDetails?.runtimeMinutes,
    series,
    categories,
    rating,
    ratingCount,
    description: description || undefined,
    coverUrl,
    thumbnails,
  };

  return details;
}
