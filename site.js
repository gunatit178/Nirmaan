/*
  site.js: shared behaviour for every page.

    1. Nav state: border once scrolled, reading-progress bar
    2. Theme toggle: system → light → dark, remembered per browser
    3. Mobile menu: focus management, Escape, scroll lock
    4. Scroll reveal: [data-reveal] elements rise in once; section rules draw
       across as each section arrives; [data-count] figures count up to their
       value the first time they're seen; cards get a pointer spotlight
    5. Scroll scenes, all driven from one rAF-throttled scroll loop:
         [data-scene="stack"]     layer tower builds as you scroll (pinned), or
                                  once, bottom layer first, on narrower screens
         [data-scene="rail"]      services track moves sideways (pinned)
         [data-scene="line"]      process timeline fills as it passes
         [data-scene="spy"]       process index highlights the step in view

  Everything here is progressive enhancement. With JS off, or with reduced
  motion, every section renders fully built and in normal document flow.
*/
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var wide = window.matchMedia('(min-width: 60.001rem)');
  var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------------------------------------------------------------
     2. Theme toggle
  --------------------------------------------------------------- */
  var THEME_KEY = 'nirmaan-theme';
  var THEME_LABEL = { system: 'match system', light: 'light', dark: 'dark' };
  var THEME_NEXT = { system: 'light', light: 'dark', dark: 'system' };

  function currentTheme() {
    var t = root.getAttribute('data-theme');
    return t === 'light' || t === 'dark' ? t : 'system';
  }
  function applyTheme(mode) {
    if (mode === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', mode);
    try {
      if (mode === 'system') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, mode);
    } catch (e) { /* storage blocked: the choice still applies to this page */ }
    syncThemeButtons();
    document.dispatchEvent(new CustomEvent('nirmaan:themechange'));
  }
  function syncThemeButtons() {
    var mode = currentTheme();
    $$('[data-theme-toggle]').forEach(function (btn) {
      btn.setAttribute('data-mode', mode);
      btn.setAttribute('aria-label', 'Colour theme: ' + THEME_LABEL[mode] + '. Switch to ' + THEME_LABEL[THEME_NEXT[mode]] + '.');
    });
  }
  $$('[data-theme-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () { applyTheme(THEME_NEXT[currentTheme()]); });
  });
  syncThemeButtons();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
    if (currentTheme() === 'system') document.dispatchEvent(new CustomEvent('nirmaan:themechange'));
  });

  /* ---------------------------------------------------------------
     3. Mobile menu
  --------------------------------------------------------------- */
  var menu = document.querySelector('[data-menu]');
  var menuBtn = document.querySelector('[data-menu-toggle]');

  function setMenu(open, restoreFocus) {
    if (!menu || !menuBtn) return;
    menuBtn.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    root.classList.toggle('menu-open', open);
    if (open) {
      // Next frame so the entrance animation runs from the un-hidden state.
      requestAnimationFrame(function () { menu.classList.add('is-open'); });
      var first = menu.querySelector('a');
      if (first) first.focus();
    } else {
      menu.classList.remove('is-open');
      if (restoreFocus) menuBtn.focus();
    }
  }
  if (menu && menuBtn) {
    menuBtn.addEventListener('click', function () {
      setMenu(menuBtn.getAttribute('aria-expanded') !== 'true', true);
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false, false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) setMenu(false, true);
      // Keep Tab inside the open sheet (plus the toggle that closes it).
      if (e.key === 'Tab' && !menu.hidden) {
        var stops = [menuBtn].concat($$('a', menu));
        var i = stops.indexOf(document.activeElement);
        var next = e.shiftKey ? (i <= 0 ? stops.length - 1 : i - 1) : (i === stops.length - 1 ? 0 : i + 1);
        e.preventDefault();
        stops[next].focus();
      }
    });
    window.matchMedia('(min-width: 64.001rem)').addEventListener('change', function (e) {
      if (e.matches) setMenu(false, false);
    });
  }

  /* ---------------------------------------------------------------
     4. Scroll reveal
  --------------------------------------------------------------- */
  if (root.classList.contains('motion')) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    $$('[data-reveal]').forEach(function (el) { revealObserver.observe(el); });

    // Section rules: drawn once the section's top edge is on screen.
    var ruleObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-seen');
        ruleObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    $$('.section + .section').forEach(function (el) { ruleObserver.observe(el); });

    // Count-ups: rupee figures run up to their value once. The markup always
    // holds the real figure, so without this (or mid-count) nothing is wrong.
    var rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
    var easeOut = function (t) { return 1 - Math.pow(1 - t, 4); };
    function countUp(el) {
      var to = Number(el.getAttribute('data-count'));
      if (!(to > 0)) return;
      var final = el.textContent;
      el.style.minWidth = el.getBoundingClientRect().width + 'px'; // no reflow while digits change
      var start = null, DURATION = 1100;
      function tick(now) {
        if (start === null) start = now;
        var t = Math.min(1, (now - start) / DURATION);
        el.textContent = t < 1 ? rupees.format(Math.round((to * easeOut(t)) / 100) * 100) : final;
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        countObserver.unobserve(entry.target);
        countUp(entry.target);
      });
    }, { threshold: 0.8 });
    $$('[data-count]').forEach(function (el) { countObserver.observe(el); });
  }

  /* Pointer spotlight: a soft light follows the pointer across cards. */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var SPOT = '.price-card, .package, .care-card, .care-link, .plan-switch__item, .included__group, .fit__other, .principles li, .svc-card, .includes li, .gets__list li';
    $$(SPOT).forEach(function (el) { el.classList.add('has-spot'); });
    document.addEventListener('pointermove', function (e) {
      var card = e.target.closest && e.target.closest('.has-spot');
      if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  /* ---------------------------------------------------------------
     5. Scroll scenes
  --------------------------------------------------------------- */
  var nav = document.querySelector('[data-nav]');
  var progressBar = document.querySelector('[data-scroll-progress]');
  var scenes = [];

  // Progress of an element's scroll through the viewport while pinned:
  // 0 when its top reaches the nav, 1 when its bottom reaches the viewport bottom.
  function pinProgress(el) {
    var r = el.getBoundingClientRect();
    var navH = nav ? nav.offsetHeight : 0;
    var travel = r.height - (window.innerHeight - navH);
    return travel > 0 ? clamp01((navH - r.top) / travel) : 0;
  }
  function canPin() { return wide.matches && !reduceMotion.matches; }

  /* Layer stack: 5 layers placed one per fifth of the pinned scroll. Below the
     pinning width it builds once instead, bottom layer first, when it comes into view. */
  $$('[data-scene="stack"]').forEach(function (el) {
    var layers = $$('[data-layer]', el);
    var meter = $$('[data-meter] span', el);
    var count = el.querySelector('[data-stack-count]');
    var n = layers.length;
    var last = -1;
    var built = false;
    var flows = function () { return !canPin() && root.classList.contains('motion'); };
    var builder = 'IntersectionObserver' in window && new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting || built || !flows()) return;
      built = true;
      layers.forEach(function (_, i) { setTimeout(function () { set(i); }, 180 + i * 190); });
    }, { threshold: 0.45 });
    if (builder) builder.observe(el.querySelector('.tower') || el);

    function set(k) {
      if (k === last) return;
      last = k;
      layers.forEach(function (layer, i) {
        layer.classList.toggle('is-placed', i <= k);
        layer.classList.toggle('is-current', i === k);
      });
      meter.forEach(function (m, i) { m.classList.toggle('is-on', i <= k); });
      if (count) count.textContent = (k + 1) + ' / ' + n;
    }

    scenes.push({
      el: el,
      layout: function () {
        el.classList.toggle('is-pinned', canPin());
        last = -1;
        if (!canPin()) set(flows() && !built ? -1 : n - 1);
      },
      update: function () {
        if (!canPin()) return;
        set(Math.min(n - 1, Math.floor(pinProgress(el) * n)));
      },
    });
  });

  /* Services rail: vertical scroll drives the track sideways */
  $$('[data-scene="rail"]').forEach(function (el) {
    var viewport = el.querySelector('[data-rail-viewport]');
    var track = el.querySelector('[data-rail-track]');
    var distance = 0;

    scenes.push({
      el: el,
      layout: function () {
        var pin = canPin();
        el.classList.toggle('is-pinned', pin);
        el.style.height = '';
        if (!pin) { el.style.setProperty('--rail', '0'); return; }
        distance = Math.max(0, track.scrollWidth - viewport.clientWidth);
        el.style.setProperty('--rail-distance', distance + 'px');
        // Pinned height = one screen + the sideways distance, so 1px down = 1px across.
        el.style.height = (el.querySelector('.rail__sticky').offsetHeight + distance) + 'px';
      },
      update: function () {
        if (canPin()) { el.style.setProperty('--rail', pinProgress(el).toFixed(4)); return; }
        var max = viewport.scrollWidth - viewport.clientWidth;
        el.style.setProperty('--rail', max > 0 ? (viewport.scrollLeft / max).toFixed(4) : '0');
      },
    });
    viewport.addEventListener('scroll', function () { schedule(); }, { passive: true });
  });

  /* Timeline line: fills as the list crosses the middle of the screen, and
     marks each step .is-reached once the line gets to it. */
  $$('[data-scene="line"]').forEach(function (el) {
    var steps = $$('ol > li', el);
    function reach(p) {
      steps.forEach(function (li, i) { li.classList.toggle('is-reached', p >= (i + 0.35) / steps.length); });
    }
    scenes.push({
      el: el,
      layout: function () {},
      update: function () {
        if (reduceMotion.matches) { el.style.setProperty('--progress-line', '1'); reach(1); return; }
        var r = el.getBoundingClientRect();
        var vh = window.innerHeight;
        var p = clamp01((vh * 0.8 - r.top) / (r.height + vh * 0.35));
        el.style.setProperty('--progress-line', p.toFixed(4));
        reach(p);
      },
    });
  });

  /* Scroll spy: highlights the index link of the step nearest the top third */
  $$('[data-scene="spy"]').forEach(function (el) {
    var links = $$('a[href^="#"]', el);
    var targets = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
    scenes.push({
      el: el.parentElement,
      layout: function () {},
      update: function () {
        var line = window.innerHeight * 0.35;
        var active = 0;
        targets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top <= line) active = i; });
        links.forEach(function (a, i) {
          a.classList.toggle('is-active', i === active);
          if (i === active) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
        });
      },
    });
  });

  /* Only scenes near the viewport do work each frame. */
  var visible = new Set();
  if ('IntersectionObserver' in window) {
    var sceneObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var scene = scenes.filter(function (s) { return s.el === entry.target; });
        scene.forEach(function (s) { if (entry.isIntersecting) visible.add(s); else visible.delete(s); });
      });
      schedule();
    }, { rootMargin: '25% 0px 25% 0px' });
    scenes.forEach(function (s) { sceneObserver.observe(s.el); });
  } else {
    scenes.forEach(function (s) { visible.add(s); });
  }

  var ticking = false;
  function frame() {
    ticking = false;
    var y = window.scrollY;
    if (nav) nav.classList.toggle('is-scrolled', y > 8);
    if (progressBar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.setProperty('--progress', max > 0 ? clamp01(y / max).toFixed(4) : '0');
    }
    visible.forEach(function (s) { s.update(); });
  }
  function schedule() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(frame);
  }
  function relayout() {
    scenes.forEach(function (s) { s.layout(); s.update(); });
    schedule();
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', relayout);
  wide.addEventListener('change', relayout);
  reduceMotion.addEventListener('change', relayout);
  // Web fonts change card widths, which changes the rail's travel distance.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  relayout();
})();
