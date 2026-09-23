module.exports = function (eleventyConfig) {
  // Output lands at the repo root, same paths the hand-written pages used
  // to occupy (index.html, services.html, ...) — no hosting/deploy change
  // required. Generated files are committed, same convention this repo
  // already uses for tailwind.css (see package.json's build:css).
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
