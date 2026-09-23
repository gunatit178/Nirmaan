/*
  Shared nav/scroll behavior for every page: navbar scroll state, mobile
  menu toggle, and scroll-reveal. Previously duplicated inline in each of
  the 6 pages' <script> blocks, which had drifted — services.html's copy
  never reset aria-expanded when a mobile link was clicked, and reveal
  thresholds differed slightly page to page. One file now, so that class
  of drift is structurally impossible.
*/
(function () {
  'use strict';

  var navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', function () {
      navbar.classList.toggle('scrolled', window.scrollY > 30);
    }, { passive: true });
  }

  var hamburger = document.getElementById('hamburger');
  var mobileMenu = document.getElementById('mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function () {
      var open = hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', open);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.mobile-link'), function (l) {
      l.addEventListener('click', function () {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  if ('IntersectionObserver' in window) {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    Array.prototype.forEach.call(document.querySelectorAll('.reveal'), function (el) { revealObs.observe(el); });
  } else {
    Array.prototype.forEach.call(document.querySelectorAll('.reveal'), function (el) { el.classList.add('visible'); });
  }

  Array.prototype.forEach.call(document.querySelectorAll('a[href^="#"]'), function (a) {
    a.addEventListener('click', function (e) {
      var id = this.getAttribute('href');
      if (id === '#') return;
      var t = document.querySelector(id);
      if (t && navbar) {
        e.preventDefault();
        var top = t.getBoundingClientRect().top + window.pageYOffset - navbar.offsetHeight - 12;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });
})();
