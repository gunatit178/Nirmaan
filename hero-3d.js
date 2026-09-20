/*
  Hero 3D scene: five glass layers (client, website, API, backend, admin)
  with a light pulse travelling down through them.

  Progressive enhancement: the existing 2D cards inside #hero-3d stay in place
  and are only hidden once the WebGL scene has rendered its first frame. If
  WebGL, the CDN, or a wide-enough screen is missing, nothing changes.

  Loaded with `defer` from <head>. Uses a dynamic import() so it also works
  when the page is opened straight from disk (file://).
*/
(function () {
  'use strict';

  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';

  var host = document.getElementById('hero-3d');
  if (!host) return;

  var nodes = Array.prototype.slice.call(host.querySelectorAll('.arch-node'));
  if (!nodes.length) return;

  // Single source of truth: titles, subtitles and colours come from the 2D cards.
  var layers = nodes.map(function (n) {
    var t = n.querySelector('.text-primary');
    var s = n.querySelector('.text-muted');
    return {
      color: n.getAttribute('data-color') || '#818cf8',
      title: t ? t.textContent.trim() : '',
      sub: s ? s.textContent.trim() : ''
    };
  });

  var wide = window.matchMedia('(min-width: 640px)');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  var api = null;      // set once Three.js has loaded and the scene is built
  var loading = false;

  function start() {
    if (api || loading || !wide.matches) return;
    loading = true;
    import(THREE_URL).then(function (THREE) {
      api = build(THREE);
      if (api) api.setEnabled(wide.matches);
    }).catch(function (err) {
      loading = false;
      if (window.console) console.warn('[hero-3d] keeping the 2D cards:', err);
    });
  }

  wide.addEventListener('change', function () {
    if (api) api.setEnabled(wide.matches); else start();
  });
  start();

  /* ------------------------------------------------------------------ */

  function build(THREE) {
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) {
      return null;
    }
    renderer.setClearColor(0x000000, 0);

    /* ---- DOM: stage = canvas + HTML labels ---- */
    var stage = document.createElement('div');
    stage.className = 'h3d-stage';
    var canvas = renderer.domElement;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Layered 3D diagram of what we build: ' +
      layers.map(function (l) { return l.title; }).join(', '));
    stage.appendChild(canvas);

    var labelEls = layers.map(function (l) {
      var el = document.createElement('div');
      el.className = 'h3d-label';
      el.setAttribute('aria-hidden', 'true');
      el.style.setProperty('--c', l.color);
      var t = document.createElement('p'); t.className = 'h3d-title'; t.textContent = l.title;
      var s = document.createElement('p'); s.className = 'h3d-sub';   s.textContent = l.sub;
      el.appendChild(t); el.appendChild(s);
      stage.appendChild(el);
      return el;
    });
    host.appendChild(stage);

    /* ---- Constants ---- */
    var N = layers.length;
    var SIZE = 2.7, RADIUS = 0.3, THICK = 0.14, BEVEL = 0.025;
    var HALF_H = THICK / 2 + BEVEL;             // half of the full plate height
    var DIAG = SIZE * Math.SQRT2;               // plate width when turned 45 degrees
    var SPACING = 1.08;
    var ELEV = 0.47;                            // camera elevation (radians)
    var FOV = 28;
    var TOPY = (N - 1) / 2 * SPACING;
    var BASE_YAW = Math.PI / 4;
    var PROJ_H = (N - 1) * SPACING * Math.cos(ELEV) + DIAG * Math.sin(ELEV) + 0.3;
    var STATIC_T = 99;                          // "intro finished" time, used for reduced motion
    var PULSE_START = 1.8, TRAVEL = 3.4, PAUSE = 1.3;
    var LABEL_GAP = 28;

    var colors = layers.map(function (l) { return new THREE.Color(l.color); });
    var WHITE = new THREE.Color(0xffffff);

    /* ---- Helpers ---- */
    function roundedRect(w, d, r) {
      var s = new THREE.Shape(), x = -w / 2, y = -d / 2, PI = Math.PI;
      s.moveTo(x + r, y);
      s.lineTo(x + w - r, y);         s.absarc(x + w - r, y + r,     r, -PI / 2, 0,        false);
      s.lineTo(x + w, y + d - r);     s.absarc(x + w - r, y + d - r, r, 0,       PI / 2,   false);
      s.lineTo(x + r, y + d);         s.absarc(x + r,     y + d - r, r, PI / 2,  PI,       false);
      s.lineTo(x, y + r);             s.absarc(x + r,     y + r,     r, PI,      PI * 1.5, false);
      return s;
    }
    function ease(k) { return 1 - Math.pow(1 - k, 3); }
    function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
    function smooth(a, b, v) { var k = clamp01((v - a) / (b - a)); return k * k * (3 - 2 * k); }

    function glowTexture() {
      var c = document.createElement('canvas'); c.width = c.height = 128;
      var g = c.getContext('2d');
      var grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.25, 'rgba(255,255,255,0.45)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
      var tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    }

    // Circuit-board style top face: grid, inset border, centre chip and traces.
    function topTexture(hex, seed) {
      var S = 512, c = document.createElement('canvas'); c.width = c.height = S;
      var g = c.getContext('2d');
      var rgb = parseInt(hex.slice(1, 3), 16) + ',' + parseInt(hex.slice(3, 5), 16) + ',' + parseInt(hex.slice(5, 7), 16);
      function rgba(a) { return 'rgba(' + rgb + ',' + a + ')'; }

      g.strokeStyle = rgba(0.11); g.lineWidth = 1;
      for (var i = 32; i < S; i += 32) {
        g.beginPath(); g.moveTo(i, 24); g.lineTo(i, S - 24); g.stroke();
        g.beginPath(); g.moveTo(24, i); g.lineTo(S - 24, i); g.stroke();
      }
      g.strokeStyle = rgba(0.5); g.lineWidth = 3;
      g.beginPath(); g.roundRect(20, 20, S - 40, S - 40, 44); g.stroke();

      // traces from the centre chip out to the four sides
      var mid = S / 2, ends = [[mid, 44], [mid, S - 44], [44, mid], [S - 44, mid]];
      g.strokeStyle = rgba(0.55); g.fillStyle = rgba(0.8);
      ends.forEach(function (e) {
        g.beginPath(); g.moveTo(mid, mid); g.lineTo(e[0], e[1]); g.stroke();
        g.beginPath(); g.arc(e[0], e[1], 7, 0, Math.PI * 2); g.fill();
      });
      // a few seeded nodes on the grid so every layer looks a little different
      g.fillStyle = rgba(0.35);
      for (var k = 0; k < 7; k++) {
        var nx = 64 + ((seed * 53 + k * 97) % 8) * 48 + 16, ny = 64 + ((seed * 31 + k * 71) % 8) * 48 + 16;
        g.fillRect(nx - 5, ny - 5, 10, 10);
      }
      g.fillStyle = 'rgba(8,12,20,0.92)'; g.strokeStyle = rgba(0.95); g.lineWidth = 4;
      g.beginPath(); g.roundRect(mid - 58, mid - 58, 116, 116, 18); g.fill(); g.stroke();
      g.fillStyle = rgba(0.9);
      g.beginPath(); g.roundRect(mid - 24, mid - 24, 48, 48, 8); g.fill();

      var tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      return tex;
    }

    /* ---- Scene ---- */
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    var key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 7, 5); scene.add(key);
    var rim = new THREE.DirectionalLight(0x818cf8, 1.4); rim.position.set(-5, 2, -4); scene.add(rim);

    var stack = new THREE.Group();
    scene.add(stack);

    var glowTex = glowTexture();
    var bodyGeo = new THREE.ExtrudeGeometry(roundedRect(SIZE, SIZE, RADIUS), {
      depth: THICK, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 2, curveSegments: 12
    });
    bodyGeo.rotateX(-Math.PI / 2);
    bodyGeo.translate(0, -THICK / 2, 0);

    var outlinePts = roundedRect(SIZE + BEVEL * 2, SIZE + BEVEL * 2, RADIUS + BEVEL).getPoints(14);
    function outlineGeo(y, grow) {
      var pts = outlinePts.map(function (p) { return new THREE.Vector3(p.x * grow, y, p.y * grow); });
      return new THREE.BufferGeometry().setFromPoints(pts);
    }
    var topGeo = new THREE.PlaneGeometry(SIZE - 0.16, SIZE - 0.16); topGeo.rotateX(-Math.PI / 2);
    var poolGeo = new THREE.PlaneGeometry(SIZE * 1.5, SIZE * 1.5);  poolGeo.rotateX(-Math.PI / 2);
    var ringGeo = new THREE.RingGeometry(0.86, 1, 72);              ringGeo.rotateX(-Math.PI / 2);

    var plates = layers.map(function (l, i) {
      var g = new THREE.Group();
      var order = (N - 1 - i) * 10;                       // upper plates draw later (camera looks down)
      var col = colors[i];
      var tint = col.clone().lerp(new THREE.Color(0x0b1020), 0.82);

      var pool = new THREE.Mesh(poolGeo, new THREE.MeshBasicMaterial({
        map: glowTex, color: col, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending }));
      pool.position.y = -0.22; pool.renderOrder = order;

      var bodyMat = new THREE.MeshStandardMaterial({
        color: tint, metalness: 0.35, roughness: 0.4, emissive: col, emissiveIntensity: 0.1,
        transparent: true, opacity: 0.8, depthWrite: false });
      var body = new THREE.Mesh(bodyGeo, bodyMat); body.renderOrder = order + 1;

      var top = new THREE.Mesh(topGeo, new THREE.MeshBasicMaterial({
        map: topTexture(l.color, i + 1), transparent: true, depthWrite: false, toneMapped: false }));
      top.position.y = HALF_H + 0.002; top.renderOrder = order + 2;

      var edgeMat = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.85, depthWrite: false });
      var haloMat = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.22, depthWrite: false });
      var edges = [
        new THREE.LineLoop(outlineGeo(HALF_H, 1), edgeMat),
        new THREE.LineLoop(outlineGeo(-HALF_H, 1), edgeMat),
        new THREE.LineLoop(outlineGeo(HALF_H, 1.025), haloMat)
      ];
      edges.forEach(function (e) { e.renderOrder = order + 3; });

      var ringMat = new THREE.MeshBasicMaterial({
        color: col, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
      var ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = HALF_H + 0.01; ring.renderOrder = order + 4;

      g.add(pool, body, top, edges[0], edges[1], edges[2], ring);
      stack.add(g);
      return {
        group: g, ring: ring, baseY: TOPY - i * SPACING, flash: 0,
        mats: { pool: pool.material, body: bodyMat, top: top.material, edge: edgeMat, halo: haloMat, ring: ringMat },
        base: { pool: 0.2, body: 0.8, top: 1, edge: 0.85, halo: 0.22 }
      };
    });

    // Axis beam running through every layer, coloured layer by layer
    (function () {
      var ext = 0.55;
      var p = [0, TOPY + ext, 0], c = [colors[0].r, colors[0].g, colors[0].b];
      for (var j = 0; j < N; j++) {
        p.push(0, TOPY - j * SPACING, 0);
        c.push(colors[j].r, colors[j].g, colors[j].b);
      }
      p.push(0, TOPY - (N - 1) * SPACING - ext, 0);
      c.push(colors[N - 1].r, colors[N - 1].g, colors[N - 1].b);
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
      var beam = new THREE.Line(geo, new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0.4, depthWrite: false, depthTest: false }));
      beam.renderOrder = 60;
      stack.add(beam);
    })();

    // Pulse: bright head plus a fading trail of glow sprites
    var TRAIL = 9;
    var pulse = [];
    for (var pi = 0; pi <= TRAIL; pi++) {
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: 0xffffff, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
      sp.renderOrder = 70 + pi; sp.visible = false;
      stack.add(sp); pulse.push(sp);
    }

    // Drifting particles
    var PN = 110, ppos = new Float32Array(PN * 3), pspd = new Float32Array(PN);
    for (var q = 0; q < PN; q++) {
      ppos[q * 3]     = (Math.random() - 0.5) * 8;
      ppos[q * 3 + 1] = (Math.random() - 0.5) * 8;
      ppos[q * 3 + 2] = (Math.random() - 0.5) * 6;
      pspd[q] = 0.05 + Math.random() * 0.12;
    }
    var pgeo = new THREE.BufferGeometry();
    pgeo.setAttribute('position', new THREE.BufferAttribute(ppos, 3));
    var particles = new THREE.Points(pgeo, new THREE.PointsMaterial({
      size: 0.075, map: glowTex, color: 0xa5b4fc, transparent: true, opacity: 0.75,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
    particles.renderOrder = -1;
    stack.add(particles);

    /* ---- Layout / sizing ---- */
    var W = 1, H = 1, shiftWorld = 0, pxPerUnit = 1, camDist = 10, labelSpace = 0;
    var enabled = false, inView = true, running = false, revealed = false, raf = 0, last = 0;
    var time = 0, px = 0, py = 0, tx = 0, ty = 0, prevPr = -1;

    function layout() {
      W = stage.clientWidth; H = stage.clientHeight;
      if (!W || !H) return false;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(W, H, false);
      camera.aspect = W / H;

      var lw = 0;
      labelEls.forEach(function (el) { lw = Math.max(lw, el.offsetWidth); });
      labelSpace = lw + LABEL_GAP;

      // Fit the plate stack plus its labels inside the stage.
      pxPerUnit = Math.min(H * 0.88 / PROJ_H, (W - labelSpace - 56) / (DIAG + 0.2));
      var halfViewH = H / (2 * pxPerUnit);
      camDist = halfViewH / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
      shiftWorld = -(labelSpace / 2) / pxPerUnit;   // centre plates + labels together
      camera.updateProjectionMatrix();
      return true;
    }

    var v = new THREE.Vector3();
    var corners = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    // Pin each HTML label to the right-most top corner of its plate.
    function placeLabels() {
      for (var i = 0; i < N; i++) {
        var best = -1e9, bx = 0, by = 0;
        for (var c = 0; c < 4; c++) {
          v.set(corners[c][0] * (SIZE / 2), HALF_H, corners[c][1] * (SIZE / 2));
          plates[i].group.localToWorld(v); v.project(camera);
          var sx = (v.x * 0.5 + 0.5) * W;
          if (sx > best) { best = sx; bx = sx; by = (-v.y * 0.5 + 0.5) * H; }
        }
        var el = labelEls[i];
        el.style.transform = 'translate3d(' + (bx + LABEL_GAP).toFixed(1) + 'px,' + by.toFixed(1) + 'px,0) translateY(-50%)';
        el.style.opacity = smooth(0.9 + i * 0.14, 1.5 + i * 0.14, time).toFixed(3);
      }
    }

    /* ---- Frame ---- */
    function update(dt, animated) {
      px += (tx - px) * (1 - Math.exp(-dt * 3.5));
      py += (ty - py) * (1 - Math.exp(-dt * 3.5));
      stack.rotation.y = BASE_YAW + (animated ? Math.sin(time * 0.35) * 0.1 : 0) + px * 0.3;
      stack.position.x = shiftWorld;
      var elev = ELEV - py * 0.07;
      camera.position.set(0, Math.sin(elev) * camDist, Math.cos(elev) * camDist);
      camera.lookAt(0, 0, 0);

      // layers: unfold on load, float gently, glow when the pulse passes
      for (var i = 0; i < N; i++) {
        var p = plates[i];
        var e = ease(clamp01((time - i * 0.12) / 1.2));
        p.group.position.y = p.baseY * e + (animated ? Math.sin(time * 0.9 + i * 0.9) * 0.05 * e : 0);
        p.group.rotation.y = animated ? Math.sin(time * 0.5 + i) * 0.035 * e : 0;
        p.flash = Math.max(0, p.flash - dt * 1.5);
        var f = p.flash, m = p.mats;
        m.pool.opacity = p.base.pool * e * (1 + f * 2.2);
        m.body.opacity = p.base.body * e;
        m.body.emissiveIntensity = 0.1 + f * 0.55;
        m.top.opacity = p.base.top * e;
        m.edge.opacity = (p.base.edge + f * 0.15) * e;
        m.halo.opacity = (p.base.halo + f * 0.5) * e;
        m.ring.opacity = f * 0.55 * e;
        var rs = 1 + (1 - f) * 0.7; p.ring.scale.set(rs, 1, rs);
      }

      // pulse
      var showPulse = false;
      if (animated) {
        var t0 = time - PULSE_START;
        if (t0 >= 0) {
          var ph = t0 % (TRAVEL + PAUSE);
          if (ph < TRAVEL) {
            showPulse = true;
            var pr = ph / TRAVEL;
            for (var k = 0; k < N; k++) {
              var at = k / (N - 1);
              if (prevPr < at && pr >= at) plates[k].flash = 1;
            }
            prevPr = pr;
            drawPulse(pr);
          } else {
            prevPr = -1;
          }
        }
      }
      if (!showPulse) for (var s = 0; s < pulse.length; s++) pulse[s].visible = false;

      if (animated) {
        for (var q2 = 0; q2 < PN; q2++) {
          var yy = ppos[q2 * 3 + 1] + pspd[q2] * dt;
          ppos[q2 * 3 + 1] = yy > 4 ? -4 : yy;
          ppos[q2 * 3] += Math.sin(time * 0.4 + q2) * 0.0015;
        }
        pgeo.attributes.position.needsUpdate = true;
      }
    }

    var tmpC = new THREE.Color();
    function drawPulse(pr) {
      var fade = smooth(0, 0.04, pr) * (1 - smooth(0.96, 1, pr));
      for (var k = 0; k <= TRAIL; k++) {
        var r = pr - k * 0.03, s = pulse[k];
        if (r < 0) { s.visible = false; continue; }
        var pos = r * (N - 1), i0 = Math.min(N - 2, Math.floor(pos)), fr = pos - i0;
        tmpC.copy(colors[i0]).lerp(colors[i0 + 1], fr).lerp(WHITE, k === 0 ? 0.55 : 0.2);
        s.material.color.copy(tmpC);
        s.position.set(0, TOPY - pos * SPACING, 0);
        var a = k / TRAIL, size = k === 0 ? 0.8 : 0.55 * (1 - a) + 0.12;
        s.scale.set(size, size, 1);
        s.material.opacity = (k === 0 ? 1 : 0.5 * (1 - a)) * fade;
        s.visible = true;
      }
    }

    function render() {
      placeLabels();
      renderer.render(scene, camera);
    }

    function tick(now) {
      raf = requestAnimationFrame(tick);
      var dt = Math.min((now - last) / 1000, 0.05); last = now;
      time += dt;
      update(dt, true);
      render();
    }

    function renderStatic() {
      if (!layout()) return;
      time = STATIC_T; px = py = tx = ty = 0;
      update(0.016, false);
      render();
    }

    /* ---- Run control ---- */
    function stop() { running = false; cancelAnimationFrame(raf); }
    function reveal() {
      if (revealed) return;
      revealed = true;
      requestAnimationFrame(function () { host.classList.add('is-3d'); });
    }
    function sync() {
      if (!enabled) { stop(); return; }
      if (reduceMotion.matches) { stop(); renderStatic(); reveal(); return; }
      if (inView && !document.hidden) {
        if (running) return;
        if (!layout()) return;
        running = true; last = performance.now(); raf = requestAnimationFrame(tick); reveal();
      } else {
        stop();
      }
    }

    new IntersectionObserver(function (es) { inView = es[0].isIntersecting; sync(); }, { threshold: 0 }).observe(host);
    document.addEventListener('visibilitychange', sync);
    reduceMotion.addEventListener('change', function () { time = reduceMotion.matches ? STATIC_T : 0; sync(); });

    new ResizeObserver(function () {
      if (!enabled || !layout()) return;
      if (!running) { update(0.016, false); render(); }   // while running, the next tick picks up the new size
    }).observe(stage);

    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch' || reduceMotion.matches) return;
      tx = e.clientX / window.innerWidth * 2 - 1;
      ty = e.clientY / window.innerHeight * 2 - 1;
    }, { passive: true });

    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault(); stop(); host.classList.remove('is-3d'); revealed = false;
    });
    canvas.addEventListener('webglcontextrestored', sync);

    return {
      setEnabled: function (on) {
        enabled = on;
        if (!on) { stop(); host.classList.remove('is-3d'); revealed = false; }
        else sync();
      }
    };
  }
})();
