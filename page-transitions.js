/*
  Page-transition fallback for browsers without cross-document View Transitions
  (e.g. Firefox). Supported browsers are animated purely by the
  @view-transition rule in styles.css, so this script does nothing there.
  Load it in <head>, after styles.css, so the fade-in starts before first paint.
*/
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

// Interactive Device Switcher Logic
window.switchDevice = function(btn, deviceType, frameId) {
  // Update button classes
  var container = btn.parentElement;
  var buttons = container.querySelectorAll('.device-btn');
  buttons.forEach(function(b) {
    b.classList.remove('active');
    b.querySelector('svg').classList.remove('text-accent');
    b.querySelector('svg').classList.add('text-secondary');
  });
  
  btn.classList.add('active');
  btn.querySelector('svg').classList.remove('text-secondary');
  btn.querySelector('svg').classList.add('text-accent');
  
  // Update frame classes
  var frame = document.getElementById(frameId);
  if (frame) {
    frame.classList.remove('desktop', 'tablet', 'mobile');
    frame.classList.add(deviceType);
  }
};
