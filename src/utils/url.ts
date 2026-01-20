/** Builds an absolute URL, falling back to the original href when parsing fails. */
export function toAbsoluteUrl(baseUrl: string, href: string): string {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

/** Collapses repeated whitespace and trims leading/trailing spaces. */
export function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** Parses a floating-point number from mixed text content. */
export function parseNumber(value: string): number | undefined {
  const normalized = value.replace(/[^0-9.,]/g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Parses an integer from mixed text content. */
export function parseInteger(value: string): number | undefined {
  const normalized = value.replace(/[^0-9]/g, '');
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}
