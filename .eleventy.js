/*
  Eleventy config. Output lands at the repo root (index.html, services.html, …)
  so hosting needs no change; generated HTML is committed.

  Shortcodes:
    {% logo "class" %}              the Nirmaan pixel-N mark as inline SVG
    {% glyph "10001/…", "class" %}  any 5x5 pixel glyph in the same visual
                                    language as the logo (5 rows of 5 bits)
*/
const GLYPH = /^[01]{5}(\/[01]{5}){4}$/;

// The logo's own 5x5 grid: full-height stems plus a 3-step diagonal.
const LOGO = '10001/11001/10101/10011/10001';

const classes = (...names) => names.filter(Boolean).join(' ');

function cellsOf(pattern) {
  if (!GLYPH.test(pattern)) {
    throw new Error(`glyph: expected 5 rows of 5 bits like "${LOGO}", got "${pattern}"`);
  }
  const cells = [];
  pattern.split('/').forEach((row, y) => {
    [...row].forEach((bit, x) => { if (bit === '1') cells.push({ x, y }); });
  });
  return cells;
}

// Each lit cell is its own <rect> with --i (fill order) so CSS can assemble
// glyphs cell by cell; bottom row first, the way a structure is built.
function glyph(pattern, className = '') {
  const cells = cellsOf(pattern).sort((a, b) => b.y - a.y || a.x - b.x);
  const rects = cells
    .map((c, i) => `<rect x="${c.x}" y="${c.y}" width="1" height="1" style="--i:${i}"/>`)
    .join('');
  return `<svg class="${classes('glyph', className)}" viewBox="0 0 5 5" aria-hidden="true" focusable="false" shape-rendering="crispEdges">${rects}</svg>`;
}

function logo(className = '') {
  return `<svg class="${classes('logo', className)}" viewBox="0 0 5 5" aria-hidden="true" focusable="false" shape-rendering="crispEdges"><path d="M0 0h1v5H0zM4 0h1v5H4zM1 1h1v1H1zM2 2h1v1H2zM3 3h1v1H3z"/></svg>`;
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addShortcode('glyph', glyph);
  eleventyConfig.addShortcode('logo', logo);

  // {% set s = services | service(id) %}: look up a catalogue entry by id so
  // featured lists reference the one catalogue instead of copying glyphs.
  eleventyConfig.addFilter('service', (services, id) => {
    for (const group of services.groups) {
      const hit = group.items.find((item) => item.id === id);
      if (hit) return hit;
    }
    throw new Error(`service: no catalogue entry with id "${id}"`);
  });

  // {{ 15000 | inr }} → "₹15,000" (Indian digit grouping).
  const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  eleventyConfig.addFilter('inr', (amount) => INR.format(Number(amount)));

  // {{ services | serviceCount }}: how many services the catalogue offers.
  eleventyConfig.addFilter('serviceCount', (services) =>
    services.groups.reduce((n, group) => n + group.items.length, 0)
  );

  return {
    dir: {
      input: 'src',
      includes: '_includes',
      data: '_data',
      output: '.',
    },
    htmlOutputSuffix: '',
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
  };
};
