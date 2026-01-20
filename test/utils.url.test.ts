import { normalizeText, parseInteger, parseNumber, toAbsoluteUrl } from '../src/utils/url';

describe('url utils', () => {
  it('normalizes text', () => {
    expect(normalizeText('  foo\nbar  ')).toBe('foo bar');
  });

  it('parses numbers', () => {
    expect(parseNumber('4,6')).toBeCloseTo(4.6);
    expect(parseNumber('nope')).toBeUndefined();
  });

  it('parses integers', () => {
    expect(parseInteger('1 234 avis')).toBe(1234);
    expect(parseInteger('n/a')).toBeUndefined();
  });

  it('builds absolute url with fallback', () => {
    expect(toAbsoluteUrl('https://example.com', '/pd/B01')).toBe('https://example.com/pd/B01');
    expect(toAbsoluteUrl('not-a-url', '::invalid')).toBe('::invalid');
  });
});
