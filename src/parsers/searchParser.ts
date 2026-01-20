import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import type { SearchItem } from '../models/api';
import { normalizeText, parseInteger, parseNumber, toAbsoluteUrl } from '../utils/url';

const asinRegex = /\b(B[0-9A-Z]{9})\b/;
const fallbackAsinRegex = /\b([A-Z0-9]{10})\b/;

type CheerioElement = cheerio.Cheerio<AnyNode>;

function extractAsin(href: string): string | undefined {
  const match = href.match(asinRegex) ?? href.match(fallbackAsinRegex);
  return match ? match[1] : undefined;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function extractRuntimeMinutes(text: string): number | undefined {
  const hoursMatch = text.match(/(\d+)\s*(?:h|heure|hr)/i);
  const minsMatch = text.match(/(\d+)\s*(?:min|minutes)/i);
  const hours = hoursMatch ? Number.parseInt(hoursMatch[1], 10) : 0;
  const mins = minsMatch ? Number.parseInt(minsMatch[1], 10) : 0;
  const total = hours * 60 + mins;
  return total > 0 ? total : undefined;
}

function extractReleaseDate(text: string): string | undefined {
  const dateMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (dateMatch) {
    return dateMatch[1];
  }

  const frDateMatch = text.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  if (!frDateMatch) {
    return undefined;
  }

  const [, day, month, year] = frDateMatch;
  return `${year}-${month}-${day}`;
}

function getTitle(link: CheerioElement, container: CheerioElement): string {
  return (
    normalizeText(link.attr('aria-label') || '') ||
    normalizeText(link.text()) ||
    normalizeText(container.find('h2, h3').first().text())
  );
}

function getAuthors(container: CheerioElement, $: cheerio.CheerioAPI): string[] {
  return unique(
    container
      .find('li.authorLabel a, span.authorLabel a, a[href*="/author/"]')
      .map((_: number, el: AnyNode) => normalizeText($(el).text()))
      .get(),
  );
}

function getNarrators(container: CheerioElement, $: cheerio.CheerioAPI): string[] {
  return unique(
    container
      .find('li.narratorLabel a, span.narratorLabel a, a[href*="/narrator/"]')
      .map((_: number, el: AnyNode) => normalizeText($(el).text()))
      .get(),
  );
}

function getRating(container: CheerioElement): number | undefined {
  const ratingLabel = container
    .find('[aria-label*="etoile"], [aria-label*="star"], [aria-label*="\\u00e9toile"]')
    .first()
    .attr('aria-label');
  return ratingLabel ? parseNumber(ratingLabel) : undefined;
}

function getRatingCount(container: CheerioElement, fallbackText: string): number | undefined {
  const ratingCountText =
    container.find('[data-qa="rating-count"], .ratingsLabel').first().text() || fallbackText;
  return parseInteger(ratingCountText);
}

function getThumbnail(container: CheerioElement): string | undefined {
  return container.find('img').first().attr('src');
}

export function parseSearchResults(html: string, baseUrl: string): SearchItem[] {
  const $ = cheerio.load(html);
  const items: SearchItem[] = [];
  const seen = new Set<string>();

  $('a').each((_, element) => {
    const link = $(element);
    const href = link.attr('href');
    if (!href || !href.includes('/pd/')) {
      return;
    }

    const asin = extractAsin(href);
    if (!asin || seen.has(asin)) {
      return;
    }

    const container = link.closest('[data-asin], .productListItem, li');
    const titleText = getTitle(link, container);

    if (!titleText) {
      return;
    }

    const authors = getAuthors(container, $);
    const narrators = getNarrators(container, $);

    const containerText = normalizeText(container.text());
    const releaseDate = extractReleaseDate(containerText);
    const releaseYear = releaseDate ? Number.parseInt(releaseDate.slice(0, 4), 10) : undefined;
    const runtimeMinutes = extractRuntimeMinutes(containerText);

    const rating = getRating(container);
    const ratingCount = getRatingCount(container, containerText);
    const thumbnailUrl = getThumbnail(container);

    items.push({
      asin,
      title: titleText,
      authors,
      narrators,
      releaseDate,
      releaseYear,
      runtimeMinutes,
      rating,
      ratingCount,
      thumbnailUrl,
      detailUrl: toAbsoluteUrl(baseUrl, href),
    });
    seen.add(asin);
  });

  return items;
}
