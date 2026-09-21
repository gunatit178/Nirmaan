/*
  Layered 3D scenes: glass layers with a light pulse travelling down through them.

  Used for the homepage hero (timed intro) and the architecture section
  (assembles as you scroll to it). Any element marked  data-layers-3d  becomes a
  scene; each child marked  data-layer  (with data-color) becomes a layer, and its
  text is read from the existing 2D markup:
      title  = first .text-primary      subtitle = first .text-muted
      detail = first .leading-relaxed
  Optional on the host:  data-intro="scroll"  assembles the layers with page scroll
  instead of on load.

  Interaction
    - Hover a layer (or its label): it lifts and glows.
    - Click / tap a layer or label: it is selected. The others spread apart and dim,
      and its description is shown. Click it again, click empty space, or press Esc.
    - Drag to rotate the stack (with inertia); it settles back to a clean pose.
    - Labels are real <button>s, so layers are reachable by keyboard.
    - On narrow screens the labels move into a single detail card under the scene.

  Progressive enhancement: the existing 2D markup stays in place (marked
  .l3d-fallback) and is only hidden once WebGL has drawn its first frame. If WebGL,
  the network, or Three.js is missing, or the visitor has Data Saver on, nothing changes.

  Three.js is loaded from vendor/ first and from the CDN if that fails (e.g. when the
  page is opened straight from disk), and only once a scene is near the viewport.
*/
(function () {
  'use strict';

  var LOCAL_URL = new URL('vendor/three.module.min.js', document.baseURI).href;
  var CDN_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var coarse = window.matchMedia('(pointer: coarse)');

  var conn = navigator.connection;
  if (conn && conn.saveData) return;              // Data Saver: keep the light 2D version

  // One shared download of Three.js for every scene on the page.
  var threePromise = null;
  function loadThree() {
    if (!threePromise) {
      threePromise = [LOCAL_URL, CDN_URL].reduce(function (chain, url) {
        return chain.catch(function () { return import(url); });
      }, Promise.reject());
    }
    return threePromise;
  }

  function whenNearViewport(el, cb) {
    if (!('IntersectionObserver' in window)) { cb(); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { io.disconnect(); cb(); }
    }, { rootMargin: '300px' });
    io.observe(el);
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-layers-3d]'), init);

  /* ------------------------------------------------------------------ */

  function init(host) {
    var nodes = Array.prototype.slice.call(host.querySelectorAll('[data-layer]'));
    if (!nodes.length) return;

    // Single source of truth: text and colours come from the 2D markup.
    var layers = nodes.map(function (n) {
      var t = n.querySelector('.text-primary');
      var s = n.querySelector('.text-muted');
      var d = n.querySelector('.leading-relaxed');
      return {
        color: n.getAttribute('data-color') || '#818cf8',
        title: t ? t.textContent.trim() : '',
        sub: s ? s.textContent.trim() : '',
        desc: d ? d.textContent.trim() : ''
      };
    });
    var scrollMode = host.getAttribute('data-intro') === 'scroll';

    whenNearViewport(host, function () {
      loadThree().then(function (THREE) {
        var api = build(THREE, host, layers, scrollMode);
        if (api) api.setEnabled(true);
      }).catch(function (err) {
        if (window.console) console.warn('[layers-3d] keeping the 2D version:', err);
      });
    });
  }

  function build(THREE, host, layers, scrollMode) {
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) {
      return null;
    }
    renderer.setClearColor(0x000000, 0);

    /* ---- DOM: stage = canvas + HTML labels + detail card + hint ---- */
    var stage = document.createElement('div');
    stage.className = 'h3d-stage';
    var canvas = renderer.domElement;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Interactive 3D diagram: ' +
      layers.map(function (l) { return l.title; }).join(', ') + '. Drag to rotate.');
    stage.appendChild(canvas);

    var labelEls = layers.map(function (l, i) {
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'h3d-label';
      el.setAttribute('aria-pressed', 'false');
      el.style.setProperty('--c', l.color);
      var t = document.createElement('span'); t.className = 'h3d-title'; t.textContent = l.title;
      var s = document.createElement('span'); s.className = 'h3d-sub';   s.textContent = l.sub;
      el.appendChild(t); el.appendChild(s);
      if (l.desc) {
        var d = document.createElement('span'); d.className = 'h3d-desc'; d.textContent = l.desc;
        el.appendChild(d);
      }
      el.addEventListener('pointerenter', function () { labelHover = i; kick(); });
      el.addEventListener('pointerleave', function () { if (labelHover === i) labelHover = -1; kick(); });
      el.addEventListener('focus',        function () { labelHover = i; kick(); });
      el.addEventListener('blur',         function () { if (labelHover === i) labelHover = -1; kick(); });
      el.addEventListener('click',        function () { select(sel === i ? -1 : i); });
      stage.appendChild(el);
      return el;
    });

    var detail = document.createElement('div');           // used instead of the labels on narrow screens
    detail.className = 'h3d-detail';
    detail.setAttribute('aria-live', 'polite');
    stage.appendChild(detail);

    var hint = document.createElement('div');
    hint.className = 'h3d-hint';
    hint.setAttribute('aria-hidden', 'true');
    hint.textContent = coarse.matches ? 'Swipe to rotate · Tap a layer' : 'Drag to rotate · Click a layer';
    stage.appendChild(hint);
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
    var LABEL_GAP = 28, COMPACT_W = 520, DETAIL_H = 112, HINT_H = 34;
    var LIFT = 0.14, SEL_LIFT = 0.1, SPREAD = 0.32, BEAM_EXT = 0.55;

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

    var pickMeshes = [];
    var plateY = [];
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
      body.userData.index = i;
      pickMeshes.push(body);

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
      plateY[i] = TOPY - i * SPACING;
      return {
        group: g, ring: ring, baseY: TOPY - i * SPACING,
        e: 0, flash: 0, lift: 0, focus: 0, dim: 0, off: 0,   // animated state
        mats: { pool: pool.material, body: bodyMat, top: top.material, edge: edgeMat, halo: haloMat, ring: ringMat }
      };
    });

    // Axis beam running through every layer, coloured layer by layer
    var beamPos;
    (function () {
      var p = [0, TOPY + BEAM_EXT, 0], c = [colors[0].r, colors[0].g, colors[0].b];
      for (var j = 0; j < N; j++) {
        p.push(0, TOPY - j * SPACING, 0);
        c.push(colors[j].r, colors[j].g, colors[j].b);
      }
      p.push(0, TOPY - (N - 1) * SPACING - BEAM_EXT, 0);
      c.push(colors[N - 1].r, colors[N - 1].g, colors[N - 1].b);
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
      beamPos = geo.attributes.position;
      var beam = new THREE.Line(geo, new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0.4, depthWrite: false, depthTest: false }));
      beam.renderOrder = 60;
      beam.frustumCulled = false;
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

    /* ---- State ---- */
    var W = 1, H = 1, shiftWorld = 0, pxPerUnit = 1, camDist = 10, labelSpace = 0, restLabelW = 150, compact = false;
    var enabled = false, inView = true, running = false, staticPending = false, revealed = false, raf = 0, last = 0;
    var time = 0, px = 0, py = 0, tx = 0, ty = 0, prevPr = -1;
    var scrollP = 0, ready = false, readyAt = 0;             // ready = all layers are in place

    // interaction
    var hover = -1, prevHover = -1, hoverPlate = -1, labelHover = -1, sel = -1, selAmt = 0;
    var yawUser = 0, yawVel = 0, elevUser = 0, idle = 0;
    var dragging = false, dragMoved = false, downX = 0, downY = 0, lastX = 0, lastY = 0, lastT = 0;
    var ptrIn = false, ptrCX = 0, ptrCY = 0, cursor = '';
    var hintShown = false, hintDone = false;
    var raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();

    /* ---- Layout / sizing ---- */
    function layout() {
      W = stage.clientWidth; H = stage.clientHeight;
      if (!W || !H) return false;
      compact = W < COMPACT_W;
      stage.classList.toggle('is-compact', compact);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 2));
      renderer.setSize(W, H, false);
      camera.aspect = W / H;

      if (compact) {
        // Phone layout: scene on top, one detail card underneath instead of side labels.
        pxPerUnit = Math.min((H - DETAIL_H) * 0.9 / PROJ_H, (W - 32) / (DIAG + 0.2));
        shiftWorld = 0;
        camera.setViewOffset(W, H, 0, DETAIL_H / 2, W, H);     // nudge the scene up, clear of the card
      } else {
        // Measure labels at rest only; an expanded label would skew the layout.
        if (sel < 0) {
          var lw = 0;
          labelEls.forEach(function (el) { lw = Math.max(lw, el.offsetWidth); });
          restLabelW = lw;
          stage.style.setProperty('--h3d-sel-w', (lw + 44) + 'px');
        }
        labelSpace = restLabelW + LABEL_GAP;
        pxPerUnit = Math.min((H - HINT_H) * 0.9 / PROJ_H, (W - labelSpace - 56) / (DIAG + 0.2));
        shiftWorld = -(labelSpace / 2) / pxPerUnit;               // centre plates + labels together
        camera.setViewOffset(W, H, 0, HINT_H / 2, W, H);           // leave room for the hint pill below
      }
      var halfViewH = H / (2 * pxPerUnit);
      camDist = halfViewH / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
      camera.updateProjectionMatrix();
      return true;
    }

    var v = new THREE.Vector3();
    var corners = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    // Pin each HTML label to the right-hand silhouette of its plate, at the plate's height.
    // (Using the centre height keeps labels steady while the stack is rotated.)
    function placeLabels() {
      if (compact) return;                                        // labels are hidden by CSS on phones
      for (var i = 0; i < N; i++) {
        var g = plates[i].group;
        v.set(0, HALF_H, 0); g.localToWorld(v); v.project(camera);
        var cx = (v.x * 0.5 + 0.5) * W, cy = (-v.y * 0.5 + 0.5) * H, maxX = cx;
        for (var c = 0; c < 4; c++) {
          v.set(corners[c][0] * (SIZE / 2), HALF_H, corners[c][1] * (SIZE / 2));
          g.localToWorld(v); v.project(camera);
          var sx = (v.x * 0.5 + 0.5) * W;
          if (sx > maxX) maxX = sx;
        }
        var el = labelEls[i];
        var fade = scrollMode ? smooth(0.5, 0.9, plates[i].e) : smooth(0.9 + i * 0.14, 1.5 + i * 0.14, time);
        el.style.transform = 'translate3d(' + (maxX + LABEL_GAP).toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0) translateY(-50%)';
        el.style.opacity = (fade * (1 - 0.6 * plates[i].dim)).toFixed(3);
      }
    }

    /* ---- Interaction ---- */
    function snapping() { return reduceMotion.matches; }

    function pickAt(cx, cy) {
      var r = canvas.getBoundingClientRect();
      if (!r.width || !ready) return -1;
      ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      raycaster.setFromCamera(ndc, camera);
      var hits = raycaster.intersectObjects(pickMeshes, false);
      return hits.length ? hits[0].object.userData.index : -1;
    }

    function updateDetail() {
      detail.textContent = '';
      var t = document.createElement('span'), s = document.createElement('span');
      if (sel < 0) {
        detail.classList.add('is-empty');
        t.className = 'h3d-sub';
        t.textContent = coarse.matches ? 'Tap a layer to see what it does' : 'Select a layer to see what it does';
        detail.appendChild(t);
        return;
      }
      var l = layers[sel];
      detail.classList.remove('is-empty');
      detail.style.setProperty('--c', l.color);
      t.className = 'h3d-title'; t.textContent = l.title;
      s.className = 'h3d-sub';   s.textContent = l.sub;
      detail.appendChild(t); detail.appendChild(s);
      if (l.desc) {
        var d = document.createElement('span'); d.className = 'h3d-desc-static'; d.textContent = l.desc;
        detail.appendChild(d);
      }
    }
    function select(i) {
      if (i === sel) return;
      sel = i;
      labelEls.forEach(function (el, k) {
        el.classList.toggle('is-sel', k === i);
        el.setAttribute('aria-pressed', k === i ? 'true' : 'false');
      });
      if (i >= 0) { plates[i].flash = 1; dismissHint(); }
      updateDetail();
      kick();
    }
    function dismissHint() { hintDone = true; hint.classList.remove('show'); }
    function setCursor() {
      var c = dragging && dragMoved ? 'grabbing' : hover >= 0 ? 'pointer' : 'grab';
      if (c !== cursor) { cursor = c; canvas.style.cursor = c; }
    }
    // In reduced-motion mode there is no render loop, so draw one frame per interaction.
    function kick() {
      if (running || staticPending || !enabled) return;
      staticPending = true;
      requestAnimationFrame(function () {
        staticPending = false;
        if (!running && enabled && layout()) { update(0.016, false); render(); }
      });
    }
    function resetInteraction() {
      hover = prevHover = hoverPlate = labelHover = -1; dragging = false; ptrIn = false;
      select(-1);
      labelEls.forEach(function (el) { el.classList.remove('is-hover'); });
    }
    updateDetail();

    canvas.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true; dragMoved = false;
      downX = lastX = e.clientX; downY = lastY = e.clientY; lastT = e.timeStamp;
      yawVel = 0; idle = 0;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not critical */ }
      dismissHint(); setCursor(); kick();
    });
    canvas.addEventListener('pointermove', function (e) {
      ptrIn = true; ptrCX = e.clientX; ptrCY = e.clientY;
      if (dragging) {
        if (!dragMoved && Math.hypot(e.clientX - downX, e.clientY - downY) > 5) dragMoved = true;
        if (dragMoved) {
          var dx = e.clientX - lastX, dy = e.clientY - lastY, dtm = Math.max(e.timeStamp - lastT, 4);
          yawUser += dx * 0.008;
          elevUser = Math.max(-0.25, Math.min(0.4, elevUser + dy * 0.004));
          yawVel = Math.max(-6, Math.min(6, 0.6 * yawVel + 0.4 * (dx * 0.008 / dtm * 1000)));
        }
        lastX = e.clientX; lastY = e.clientY; lastT = e.timeStamp; idle = 0;
      }
      kick();
    });
    function endDrag(e, cancelled) {
      if (!dragging) return;
      dragging = false;
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* not critical */ }
      if (!cancelled && !dragMoved) {                       // a click, not a drag
        var i = pickAt(e.clientX, e.clientY);
        select(i >= 0 && i === sel ? -1 : i);               // same layer or empty space clears
      }
      if (snapping()) yawVel = 0;
      idle = 0; setCursor(); kick();
    }
    canvas.addEventListener('pointerup', function (e) { endDrag(e, false); });
    canvas.addEventListener('pointercancel', function (e) { endDrag(e, true); });
    canvas.addEventListener('pointerleave', function () { ptrIn = false; hoverPlate = -1; kick(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && sel >= 0) select(-1); });

    /* ---- Frame ---- */
    // 0 (host just entering the viewport) to 1 (host centred): drives the assemble-on-scroll intro.
    function scrollProgress() {
      var r = host.getBoundingClientRect(), vh = window.innerHeight || 800;
      return clamp01((vh - r.top) / (0.4 * vh + r.height / 2));
    }

    function update(dt, animated) {
      var snap = snapping();
      var kf = snap ? 1 : 1 - Math.exp(-dt * 9);            // smoothing factor (1 = jump straight there)
      selAmt += ((sel >= 0 ? 1 : 0) - selAmt) * kf;
      if (scrollMode) scrollP += ((snap ? 1 : scrollProgress()) - scrollP) * (snap ? 1 : 1 - Math.exp(-dt * 6));

      // user rotation: inertia after release, then settle on the nearest equivalent pose
      if (!dragging) {
        idle += dt;
        if (snap) yawVel = 0;
        yawUser += yawVel * dt; yawVel *= Math.exp(-dt * 3.2);
        if (!snap && idle > 2.2 && Math.abs(yawVel) < 0.08) {
          var home = Math.round(yawUser / (Math.PI / 2)) * (Math.PI / 2);   // plates are 4-fold symmetric
          yawUser += (home - yawUser) * (1 - Math.exp(-dt * 2.4));
        }
        if (!snap && idle > 1.0) elevUser -= elevUser * (1 - Math.exp(-dt * 3));
      }

      // camera + stack pose
      px += (tx - px) * (1 - Math.exp(-dt * 3.5));
      py += (ty - py) * (1 - Math.exp(-dt * 3.5));
      var calm = 1 - selAmt * 0.7;                          // less sway while a layer is selected
      stack.rotation.y = BASE_YAW + (animated ? Math.sin(time * 0.35) * 0.1 * (1 - selAmt) : 0) + px * 0.3 * calm + yawUser;
      stack.position.x = shiftWorld;
      stack.scale.setScalar(1 - 0.06 * selAmt);             // leave room for the spread
      var elev = Math.max(0.2, Math.min(0.95, ELEV - py * 0.07 * calm + elevUser));
      camera.position.set(0, Math.sin(elev) * camDist, Math.cos(elev) * camDist);
      camera.lookAt(0, 0, 0);

      // layers: assemble (on load or with scroll), float, react to hover / selection, glow when the pulse passes
      var allIn = true;
      for (var i = 0; i < N; i++) {
        var p = plates[i];
        var e = scrollMode
          ? ease(clamp01(scrollP * (1 + 0.15 * (N - 1)) - 0.15 * i))
          : ease(clamp01((time - i * 0.12) / 1.2));
        p.e = e;
        if (e < 0.98) allIn = false;
        var isSel = i === sel;
        p.focus += ((isSel ? 1 : 0) - p.focus) * kf;
        p.lift  += (((isSel || i === hover) ? 1 : 0) - p.lift) * kf;
        p.dim   += ((sel >= 0 && !isSel ? 1 : 0) - p.dim) * kf;
        p.off   += ((sel < 0 || isSel ? 0 : (i < sel ? SPREAD : -SPREAD)) - p.off) * kf;

        var y = p.baseY * e + (animated ? Math.sin(time * 0.9 + i * 0.9) * 0.05 * e : 0) +
                (p.off + p.lift * LIFT + p.focus * SEL_LIFT) * e;
        p.group.position.y = y; plateY[i] = y;
        p.group.rotation.y = animated ? Math.sin(time * 0.5 + i) * 0.035 * e : 0;

        p.flash = Math.max(0, p.flash - dt * 1.5);
        var f = p.flash, l = p.lift, fo = p.focus, dm = p.dim, m = p.mats;
        m.pool.opacity = 0.2 * e * (1 + f * 2.2 + l * 1.2 + fo * 1.2) * (1 - 0.6 * dm);
        m.body.opacity = 0.8 * e * (1 - 0.4 * dm);
        m.body.emissiveIntensity = 0.1 + f * 0.55 + l * 0.25 + fo * 0.2;
        m.top.opacity = e * (1 - 0.5 * dm);
        m.edge.opacity = Math.min(1, 0.85 + f * 0.15 + l * 0.15) * e * (1 - 0.45 * dm);
        m.halo.opacity = (0.22 + f * 0.5 + l * 0.3 + fo * 0.35) * e * (1 - 0.5 * dm);
        m.ring.opacity = f * 0.55 * e;
        var rs = 1 + (1 - f) * 0.7; p.ring.scale.set(rs, 1, rs);
      }
      if (allIn && !ready) { ready = true; readyAt = time; }
      else if (!allIn && ready) ready = false;                // scrolled back up: layers separate again

      // the axis beam follows the layers wherever they are
      var bp = beamPos.array;
      bp[1] = plateY[0] + BEAM_EXT;
      for (var j = 0; j < N; j++) bp[(j + 1) * 3 + 1] = plateY[j];
      bp[(N + 1) * 3 + 1] = plateY[N - 1] - BEAM_EXT;
      beamPos.needsUpdate = true;

      // pulse (starts once the layers are in place)
      var showPulse = false;
      var pulseAt = scrollMode ? (ready ? readyAt + 0.5 : -1) : PULSE_START;
      if (animated && pulseAt >= 0 && (scrollMode || time >= pulseAt)) {
        var ph = Math.max(0, time - pulseAt) % (TRAVEL + PAUSE);
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
      } else {
        prevPr = -1;
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

      // hover: ray-pick the layer under the pointer (a hovered label wins)
      hoverPlate = ptrIn && !dragging ? pickAt(ptrCX, ptrCY) : -1;
      hover = dragging ? -1 : labelHover >= 0 ? labelHover : hoverPlate;
      if (hover !== prevHover) {
        if (hover >= 0) plates[hover].flash = Math.max(plates[hover].flash, 0.55);
        labelEls.forEach(function (el, k) { el.classList.toggle('is-hover', k === hover); });
        prevHover = hover;
      }
      setCursor();

      if (!hintDone && !hintShown && ready && (snap || time - readyAt > 1.2)) { hintShown = true; hint.classList.add('show'); }
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
        s.position.set(0, plateY[i0] + (plateY[i0 + 1] - plateY[i0]) * fr, 0);
        var a = k / TRAIL, size = k === 0 ? 0.8 : 0.55 * (1 - a) + 0.12;
        s.scale.set(size, size, 1);
        s.material.opacity = (k === 0 ? 1 : 0.5 * (1 - a)) * fade;
        s.visible = true;
      }
    }

    function render() {
      scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);   // labels use this frame's poses
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
      time = STATIC_T; scrollP = 1; px = py = tx = ty = 0;
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
        if (!on) { stop(); resetInteraction(); host.classList.remove('is-3d'); revealed = false; }
        else sync();
      }
    };
  }
})();
