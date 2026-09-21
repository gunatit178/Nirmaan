/*
  Page transitions.

  1. Browsers with cross-document View Transitions (Chrome / Edge 126+, Safari 18.2+)
     animate purely through the @view-transition rule in styles.css. This file only
     tells the CSS which way you are travelling, so pages slide forward or back in
     the same order as the menu (see "PAGE TRANSITIONS" in styles.css).
  2. Other browsers (e.g. Firefox) get a simple fade out / fade in from the second
     block below.

  Load it in <head>, after styles.css, so it is ready before first paint.
*/

/* ---- 1. Direction for native view transitions ---- */
(function () {
  'use strict';
  if (!('CSSViewTransitionRule' in window)) return;

  var root = document.documentElement;
  var ORDER = ['index', 'services', 'projects', 'process', 'technology', 'contact'];   // same as the nav

  function indexOf(url) {
    try {
      var name = new URL(url, location.href).pathname.split('/').pop().replace(/\.html$/, '') || 'index';
      return ORDER.indexOf(name);
    } catch (err) { return -1; }
  }
  function setDirection(from, to) {
    if (from < 0 || to < 0 || from === to) root.removeAttribute('data-vt-dir');
    else root.setAttribute('data-vt-dir', to > from ? 'forward' : 'back');
  }

  // Outgoing page: fires just before the old page is captured.
  window.addEventListener('pageswap', function (e) {
    if (!e.viewTransition || !e.activation || !e.activation.entry) return;
    setDirection(indexOf(location.href), indexOf(e.activation.entry.url));
  });

  // Incoming page: fires before its first paint, while the transition is being set up.
  window.addEventListener('pagereveal', function (e) {
    if (!e.viewTransition) return;
    var nav = window.navigation, from = nav && nav.activation && nav.activation.from;
    setDirection(indexOf(from ? from.url : document.referrer), indexOf(location.href));
  });
})();

/* ---- 2. Fade fallback for browsers without View Transitions ---- */
(function () {
  'use strict';

  if ('CSSViewTransitionRule' in window) return;

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var LEAVE_MS = 220; // keep in sync with .pt-leaving transition in styles.css

  root.classList.add('pt-fallback');

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (reduceMotion.matches) return;

    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.hasAttribute('download')) return;
    if (a.target && a.target !== '_self') return;

    var url;
    try { url = new URL(a.href, location.href); } catch (err) { return; }

    // Internal page-to-page links only (skips mailto:, external sites, same-page anchors)
    if (url.protocol !== location.protocol || url.host !== location.host) return;
    if (url.pathname === location.pathname && url.search === location.search) return;

    e.preventDefault();
    root.classList.add('pt-leaving');
    setTimeout(function () { location.href = url.href; }, LEAVE_MS);
  });

  // Back/forward cache restores the faded-out page as-is; bring it back.
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) root.classList.remove('pt-leaving');
  });
})();
