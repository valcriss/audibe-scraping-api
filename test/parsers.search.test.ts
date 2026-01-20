import fs from 'fs';
import path from 'path';
import { parseSearchResults } from '../src/parsers/searchParser';

describe('parseSearchResults', () => {
  it('parses items with asin, title, and detailUrl', () => {
    const html = fs.readFileSync(path.join(__dirname, 'fixtures', 'search.html'), 'utf-8');
    const items = parseSearchResults(html, 'https://www.audible.fr');

    expect(items.length).toBeGreaterThan(0);
    expect(items[0].asin).toBe('B012345678');
    expect(items[0].title).toBe('Some Title');
    expect(items[0].detailUrl).toContain('https://www.audible.fr/pd/Some-Title/B012345678');
  });
});
