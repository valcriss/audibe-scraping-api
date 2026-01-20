import { parseBookDetails } from '../src/parsers/detailsParser';

describe('parseBookDetails extra', () => {
  it('handles invalid json-ld and non-book types', () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json"></script>
          <script type="application/ld+json">{ invalid json }</script>
          <script type="application/ld+json">{"@type":"Movie","name":"Nope"}</script>
          <meta property="og:title" content="Fallback Title" />
          <meta name="description" content="Fallback description" />
        </head>
        <body>
          <h1>Fallback Title</h1>
          <img src="http://example.com/cover.jpg" />
        </body>
      </html>
    `;

    const details = parseBookDetails('B000000000', html);
    expect(details.title).toBe('Fallback Title');
    expect(details.description).toBe('Fallback description');
    expect(details.thumbnails).toBeUndefined();
  });

  it('parses json-ld book details and filters thumbnails', () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            [
              {"@type":"Book","name":"Title","author":["Author One", {"name":"Author Two"}, {"foo":"bar"}],
               "description":"Desc","publisher":"Pub","datePublished":"2020-01-01",
               "inLanguage":"fr","duration":"PT1H30M","aggregateRating":{"ratingValue":"4.5","ratingCount":"10"},
               "image":["https://example.com/cover.jpg"]}
            ]
          </script>
        </head>
        <body>
          <nav aria-label="Breadcrumb">
            <a>Cat1</a>
          </nav>
          <div class="seriesLabel">Book 2</div>
          <a href="/series/xyz">Series Name</a>
          <img src="https://example.com/1.jpg" />
          <img src="https://example.com/2.jpg" />
          <img src="https://example.com/3.jpg" />
          <img src="https://example.com/4.jpg" />
          <img src="https://example.com/5.jpg" />
          <img src="https://example.com/6.jpg" />
          <img src="https://example.com/7.jpg" />
          <img src="https://example.com/8.jpg" />
          <img src="http://example.com/9.jpg" />
        </body>
      </html>
    `;

    const details = parseBookDetails('B000000001', html);
    expect(details.authors).toEqual(['Author One', 'Author Two']);
    expect(details.runtimeMinutes).toBe(90);
    expect(details.series?.name).toBe('Series Name');
    expect(details.series?.position).toBe(2);
    expect(details.thumbnails?.length).toBe(7);
    expect(details.thumbnails?.every((url) => url.startsWith('https://'))).toBe(true);
  });

  it('handles invalid duration format', () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">{"@type":"Book","name":"Title","duration":"P1Y"}</script>
        </head>
      </html>
    `;

    const details = parseBookDetails('B000000002', html);
    expect(details.runtimeMinutes).toBeUndefined();
  });

  it('handles missing duration', () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">{"@type":"Book","name":"Title"}</script>
        </head>
      </html>
    `;

    const details = parseBookDetails('B000000003', html);
    expect(details.runtimeMinutes).toBeUndefined();
  });

  it('parses duration variants and rating labels', () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {"@type":["Book"],"name":"Title","duration":"PT2H"}
          </script>
        </head>
        <body>
          <span aria-label="4,7 etoile"></span>
          <span data-qa="rating-count">123</span>
        </body>
      </html>
    `;

    const details = parseBookDetails('B000000004', html);
    expect(details.runtimeMinutes).toBe(120);
    expect(details.rating).toBeCloseTo(4.7);
    expect(details.ratingCount).toBe(123);
  });

  it('parses duration with minutes only', () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {"@type":"Book","name":"Title","duration":"PT30M"}
          </script>
        </head>
      </html>
    `;

    const details = parseBookDetails('B000000005', html);
    expect(details.runtimeMinutes).toBe(30);
  });

  it('handles single author object and image string', () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {"@type":"Book","name":"Title","author":{"name":"Solo"},"image":"https://example.com/cover.jpg","duration":"PT0H0M"}
          </script>
        </head>
        <body>
          <h1>Ignored Title</h1>
        </body>
      </html>
    `;

    const details = parseBookDetails('B000000006', html);
    expect(details.authors).toEqual(['Solo']);
    expect(details.coverUrl).toBe('https://example.com/cover.jpg');
    expect(details.runtimeMinutes).toBeUndefined();
  });

  it('handles missing author data', () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {"@type":"Book","name":"Title"}
          </script>
        </head>
      </html>
    `;

    const details = parseBookDetails('B000000007', html);
    expect(details.authors).toEqual([]);
  });

  it('uses meta title when no json-ld title or h1', () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Meta Title" />
        </head>
        <body>
          <h1></h1>
        </body>
      </html>
    `;

    const details = parseBookDetails('B000000008', html);
    expect(details.title).toBe('Meta Title');
  });

  it('skips non-object entries in json-ld arrays', () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            ["string", {"@type":"Book","name":"Title"}]
          </script>
        </head>
      </html>
    `;

    const details = parseBookDetails('B000000009', html);
    expect(details.title).toBe('Title');
  });

  it('handles empty image arrays and author without name', () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {"@type":["Book"],"name":"","author":{"foo":"bar"},"image":[]}
          </script>
        </head>
        <body>
          <h1>Fallback Title</h1>
        </body>
      </html>
    `;

    const details = parseBookDetails('B000000010', html);
    expect(details.title).toBe('Fallback Title');
    expect(details.authors).toEqual([]);
    expect(details.coverUrl).toBeUndefined();
  });

  it('handles missing @type and empty title fallbacks', () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {"name":"NoType"}
          </script>
        </head>
        <body>
          <h1></h1>
          <img />
        </body>
      </html>
    `;

    const details = parseBookDetails('B000000011', html);
    expect(details.title).toBe('');
  });

  it('handles author with empty name', () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {"@type":"Book","name":"Title","author":{"name":""}}
          </script>
        </head>
      </html>
    `;

    const details = parseBookDetails('B000000012', html);
    expect(details.authors).toEqual([]);
  });
});
