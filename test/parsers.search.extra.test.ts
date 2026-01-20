import { parseSearchResults } from '../src/parsers/searchParser';

describe('parseSearchResults extra', () => {
  it('handles fr date and skips invalid entries', () => {
    const html = `
      <ul>
        <li>
          <a>Missing href</a>
        </li>
        <li>
          <a href="/pd/NoTitle/B012345670"></a>
        </li>
        <li>
          <a href="/pd/NoAsin/NotAnAsin">No asin</a>
        </li>
        <li class="productListItem">
          <a href="/pd/Valid/B012345671">Valid Title</a>
          <span class="releaseDateLabel">Date de publication : 12/12/2024</span>
          <span class="runtimeLabel">Duree: 1 h 5 min</span>
          <span aria-label="4,8 etoile"></span>
          <img src="https://example.com/cover.jpg" />
        </li>
        <li class="productListItem">
          <a href="/pd/MinutesOnly/B012345672">Minutes Only</a>
          <span class="runtimeLabel">Duree: 30 min</span>
        </li>
        <li class="productListItem">
          <a href="/pd/Duplicate/B012345671">Duplicate Title</a>
        </li>
      </ul>
    `;

    const items = parseSearchResults(html, 'https://www.audible.fr');
    expect(items).toHaveLength(2);
    expect(items[0].releaseDate).toBe('2024-12-12');
    expect(items[0].runtimeMinutes).toBe(65);
    expect(items[0].rating).toBeCloseTo(4.8);
    expect(items[1].runtimeMinutes).toBe(30);
  });
});
