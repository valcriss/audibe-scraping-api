import fs from 'fs';
import path from 'path';
import { parseBookDetails } from '../src/parsers/detailsParser';

describe('parseBookDetails', () => {
  it('parses title and authors from fixtures', () => {
    const html = fs.readFileSync(path.join(__dirname, 'fixtures', 'details.html'), 'utf-8');
    const details = parseBookDetails('B012345678', html);

    expect(details.title).toBe('Detail Title');
    expect(details.authors).toContain('Author One');
  });
});
