/*
  Tilt-on-hover for service and project cards.

  The card leans away from the pointer (like a pressed glass tile) and a soft
  highlight follows the cursor. Only for mouse / pen users who have not asked for
  reduced motion; on touch screens and for everyone else the cards behave as before.
  The visual rules live in styles.css under "CARD TILT".
*/
(function () {
  'use strict';

  var SELECTOR = '.service-card, .project-card';
  var MAX_DEG = 5;                                   // largest tilt in either direction

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (!finePointer.matches) return;

  Array.prototype.forEach.call(document.querySelectorAll(SELECTOR), function (card) {
    var glare = document.createElement('span');
    glare.className = 'tilt-glare';
    glare.setAttribute('aria-hidden', 'true');
    card.appendChild(glare);

    function reset() {
      card.classList.remove('is-tilting');
      card.style.removeProperty('--rx');
      card.style.removeProperty('--ry');
    }

    card.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch' || reduceMotion.matches) { reset(); return; }
      var r = card.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width;        // 0 (left) .. 1 (right)
      var y = (e.clientY - r.top) / r.height;        // 0 (top)  .. 1 (bottom)
      card.style.setProperty('--rx', ((0.5 - y) * 2 * MAX_DEG).toFixed(2) + 'deg');
      card.style.setProperty('--ry', ((x - 0.5) * 2 * MAX_DEG).toFixed(2) + 'deg');
      card.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      card.classList.add('is-tilting');
    });
    card.addEventListener('pointerleave', reset);
    card.addEventListener('pointercancel', reset);
  });
})();
