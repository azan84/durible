/* ordo-motion.js — "Toolpath" motion layer (pairs with ordo-motion.css).
   · Filament trail: the cursor extrudes a hot coral line that cools and fades
   · A click prints a tiny four-layer part on the spot
   · X-ray infill: hovering an image shows the part's insides in a lens
   · Hero frames tilt toward the cursor
   · Footer print bed: a gantry prints Ordo pieces layer by layer, then clears
   Vanilla, no dependencies. Reduced motion → nothing hidden, nothing moves
   (the print bed is drawn finished and still). */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var dpr = function () { return Math.min(window.devicePixelRatio || 1, 2); };
  var SKIP = 'input, textarea, select, label, #ordo-chat';

  // ─── Filament trail ───────────────────────────────────────────────────
  if (fine && !reduce) {
    var trail = document.createElement('canvas');
    trail.className = 'm-trail';
    trail.setAttribute('aria-hidden', 'true');
    document.body.appendChild(trail);
    var tc = trail.getContext('2d');
    var pts = [], traf = 0, LIFE = 520;
    var sizeTrail = function () {
      var r = dpr();
      trail.width = innerWidth * r; trail.height = innerHeight * r;
      tc.setTransform(r, 0, 0, r, 0, 0);
    };
    var drawTrail = function () {
      traf = 0;
      var now = performance.now();
      while (pts.length && now - pts[0].t > LIFE) pts.shift();
      tc.clearRect(0, 0, innerWidth, innerHeight);
      tc.lineCap = 'round';
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i];
        var age = (now - b.t) / LIFE;                       // 0 = just extruded, 1 = gone
        var hot = Math.max(0, 1 - age * 4);                  // first quarter glows near-white
        tc.strokeStyle = 'rgba(' + Math.round(232 + 23 * hot) + ',' + Math.round(137 + 88 * hot) + ',' + Math.round(115 + 99 * hot) + ',' + (0.85 * (1 - age)).toFixed(3) + ')';
        tc.lineWidth = 2.6 - age * 1.4;
        tc.beginPath(); tc.moveTo(a.x, a.y); tc.lineTo(b.x, b.y); tc.stroke();
      }
      if (pts.length) traf = requestAnimationFrame(drawTrail);
    };
    sizeTrail();
    window.addEventListener('resize', sizeTrail);
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      pts.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (pts.length > 60) pts.shift();
      if (!traf) traf = requestAnimationFrame(drawTrail);
    }, { passive: true });
  }

  // ─── Click: print a tiny part ─────────────────────────────────────────
  if (!reduce) {
    var live = 0;
    document.addEventListener('click', function (e) {
      if (live > 5 || !e.isTrusted || (e.clientX === 0 && e.clientY === 0)) return; // keyboard "clicks" have no point
      if (e.target.closest && e.target.closest(SKIP)) return;
      var part = document.createElement('span');
      part.className = 'm-part';
      if (e.target.closest && e.target.closest('[data-theme="teal"], .site-footer')) part.classList.add('is-light');
      part.setAttribute('aria-hidden', 'true');
      part.innerHTML = '<i></i><i></i><i></i><i></i>';
      part.style.left = e.clientX + 'px';
      part.style.top = e.clientY + 'px';
      document.body.appendChild(part);
      live++;
      setTimeout(function () { part.classList.add('is-done'); }, 1150);
      setTimeout(function () { part.remove(); live--; }, 1650);
    });
  }

  // ─── X-ray infill lens ────────────────────────────────────────────────
  if (fine && !reduce) {
    $$('.pcard-media, .app-media, .range-media, .made-a, .made-b, .gallery-main, .frame').forEach(function (el) {
      if (el.querySelector('.m-lens')) return;
      var lens = document.createElement('span');
      lens.className = 'm-lens';
      lens.setAttribute('aria-hidden', 'true');
      el.appendChild(lens);
      el.classList.add('m-xray');
    });
    var xr = null, xx = 0, xy = 0, xraf = 0;
    var paintLens = function () {
      xraf = 0;
      if (!xr) return;
      var r = xr.getBoundingClientRect();
      xr.style.setProperty('--mx', (xx - r.left).toFixed(1) + 'px');
      xr.style.setProperty('--my', (xy - r.top).toFixed(1) + 'px');
    };
    var setLens = function (el) {
      if (el === xr) return;
      if (xr) xr.classList.remove('is-xray');
      xr = el;
      if (xr) { paintLens(); xr.classList.add('is-xray'); }
    };
    document.addEventListener('pointermove', function (e) {
      setLens(e.target.closest ? e.target.closest('.m-xray') : null);
      xx = e.clientX; xy = e.clientY;
      if (xr && !xraf) xraf = requestAnimationFrame(paintLens);
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', function () { setLens(null); });
  }

  // ─── Hero tilt ────────────────────────────────────────────────────────
  if (fine && !reduce) {
    $$('.hero, .col-hero').forEach(function (sec) {
      var targets = $$('.slide-media, .col-hero-grid .frame', sec);
      if (!targets.length) return;
      targets.forEach(function (t) { t.classList.add('m-tilt'); });
      var traf2 = 0, px = 0, py = 0;
      var paint = function () {
        traf2 = 0;
        var t = targets.filter(function (el) { return el.offsetParent && el.closest('.slide, .col-hero-grid') && (!el.closest('.slide') || el.closest('.slide').classList.contains('is-active')); })[0];
        if (!t) return;
        var r = t.getBoundingClientRect();
        var nx = Math.max(-1, Math.min(1, (px - r.left) / r.width * 2 - 1));
        var ny = Math.max(-1, Math.min(1, (py - r.top) / r.height * 2 - 1));
        sec.style.setProperty('--ry', (nx * 5).toFixed(2) + 'deg');
        sec.style.setProperty('--rx', (-ny * 4).toFixed(2) + 'deg');
      };
      sec.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        px = e.clientX; py = e.clientY;
        sec.classList.add('is-tracking');
        if (!traf2) traf2 = requestAnimationFrame(paint);
      });
      sec.addEventListener('pointerleave', function () {
        sec.classList.remove('is-tracking');
        sec.style.setProperty('--rx', '0deg');
        sec.style.setProperty('--ry', '0deg');
      });
    });
  }

  // ─── Footer print bed ─────────────────────────────────────────────────
  var footer = document.querySelector('.site-footer');
  var base = footer && footer.querySelector('.footer-base');
  if (!footer || !base) return;

  var bed = document.createElement('div');
  bed.className = 'wrap m-bed';
  bed.setAttribute('aria-hidden', 'true');
  bed.innerHTML = '<p class="m-bed-label"></p><canvas></canvas>';
  footer.insertBefore(bed, base);
  var label = bed.querySelector('.m-bed-label');
  var cv = bed.querySelector('canvas');
  var cx = cv.getContext('2d');
  var LH = 4; // layer height, px

  // Each part is a stack of layers; a layer is a list of [x0, x1] spans
  // relative to the part's centre line, bottom layer first.
  var range = function (n, fn) { var out = []; for (var i = 0; i < n; i++) out.push(fn(i, n)); return out; };
  var PARTS = [
    { name: 'kuala lumpur keepsake', layers: range(19, function (i) {
      var hw = i < 10 ? 8 : i < 14 ? 6.5 : i < 16 ? 4.5 : i < 17 ? 3 : 1;
      var s = [[-15 - hw, -15 + hw], [15 - hw, 15 + hw]];
      if (i === 8) s.splice(1, 0, [-7, 7]);                 // the skybridge
      return s;
    }) },
    { name: 'diffuser holder · vase mode', layers: range(17, function (i, n) {
      var t = i / (n - 1);
      var hw = t > .84 ? (i === n - 1 ? 12 : 9) : 11 + 14 * Math.sin(Math.PI * Math.min(1, t * 1.2));
      return i < 2 ? [[-hw, hw]] : [[-hw, -hw + 3.5], [hw - 3.5, hw]];
    }) },
    { name: 'nfc keychain tag', layers: range(16, function (i) {
      if (i > 12) { var rw = [7, 6, 4][i - 13]; return [[-rw, -rw + 2.5], [rw - 2.5, rw]]; } // split ring
      var hw = i === 0 || i === 12 ? 19 : 21;
      return i >= 9 && i <= 10 ? [[-hw, -4], [4, hw]] : [[-hw, hw]];            // key hole
    }) },
    { name: 'ordo “o” desk piece', layers: range(17, function (i, n) {
      var R = n * LH / 2, r = R * .52, dy = (i + .5) * LH - R;
      var o = Math.sqrt(Math.max(0, R * R - dy * dy));
      if (Math.abs(dy) >= r) return [[-o, o]];
      var inner = Math.sqrt(r * r - dy * dy);
      return [[-o, -inner], [inner, o]];
    }) },
  ];

  var W = 0, H = 0, slots = 4, slotX = [];
  var placed = [];          // finished parts on the bed: { part, x, done: [timestamps] }
  var job = null;           // the part being printed
  var next = 0, nozzle = { x: 0, y: 0 }, phase = 'travel', hold = 0, fade = 1;
  var running = false, raf = 0, last = 0, visible = false;
  var SPEED = 150, TRAVEL = 420;

  var size = function () {
    var r = dpr();
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * r; cv.height = H * r;
    cx.setTransform(r, 0, 0, r, 0, 0);
    slots = Math.max(2, Math.min(4, Math.floor(W / 120)));
    slotX = range(slots, function (i) { return W * (i + .5) / slots; });
  };

  var floorY = function () { return H; };            // the footer-base border is the bed
  var layerTop = function (i) { return floorY() - (i + 1) * LH; };

  var startJob = function () {
    var part = PARTS[next % PARTS.length];
    next++;
    job = { part: part, x: slotX[placed.length], layer: 0, dir: 1, prog: 0, done: [] };
    var spans = part.layers[0];
    phase = 'travel';
    job.tx = job.x + spans[0][0];
    job.ty = layerTop(0);
  };

  var extent = function (spans) { return [spans[0][0], spans[spans.length - 1][1]]; };

  var setLabel = function () {
    if (phase === 'clear') { label.innerHTML = '<b>●</b> bed clear — next batch'; return; }
    if (!job) return;
    var n = job.part.layers.length;
    label.innerHTML = '<b>●</b> printing ' + job.part.name + ' — layer ' + String(Math.min(job.layer + 1, n)).padStart(2, '0') + '/' + n;
  };

  var colour = function (doneAt, now, i) {
    var k = doneAt == null ? 0 : Math.min(1, (now - doneAt) / 900); // 0 hot → 1 cooled
    var shade = i % 2 ? .82 : .94;                                    // visible layer lines
    return 'rgba(' + Math.round(232 + 5 * k) + ',' + Math.round(137 + 94 * k) + ',' + Math.round(115 + 101 * k) + ',' + (shade * fade).toFixed(3) + ')';
  };

  var drawPart = function (p, x, now, upTo, partial) {
    var layers = p.part.layers;
    for (var i = 0; i < layers.length && i <= upTo; i++) {
      var y = layerTop(i);
      cx.fillStyle = colour(p.done[i], now, i);
      layers[i].forEach(function (s) {
        var x0 = x + s[0], x1 = x + s[1];
        if (i === upTo && partial) {                                     // the layer being laid
          if (partial.dir > 0) x1 = Math.min(x1, partial.at); else x0 = Math.max(x0, partial.at);
          if (x1 <= x0) return;
        }
        cx.fillRect(x0, y + .5, x1 - x0, LH - 1);
      });
    }
  };

  var drawGantry = function (now) {
    var gy = nozzle.y - 15;
    cx.strokeStyle = 'rgba(245,241,232,.1)'; cx.lineWidth = 1;
    cx.beginPath(); cx.moveTo(0, gy + .5); cx.lineTo(W, gy + .5); cx.stroke();          // X rail
    cx.fillStyle = 'rgba(245,241,232,.55)';
    cx.fillRect(nozzle.x - 9, gy - 4, 18, 9);                                             // carriage
    cx.fillStyle = 'rgba(245,241,232,.75)';
    cx.beginPath(); cx.moveTo(nozzle.x - 4, gy + 5); cx.lineTo(nozzle.x + 4, gy + 5); cx.lineTo(nozzle.x, nozzle.y - 1); cx.closePath(); cx.fill(); // nozzle
    if (phase === 'print') {
      var g = .55 + .45 * Math.sin(now / 90);
      cx.fillStyle = 'rgba(255,210,196,' + g.toFixed(3) + ')';
      cx.beginPath(); cx.arc(nozzle.x, nozzle.y, 2, 0, Math.PI * 2); cx.fill();         // hot tip
    }
  };

  var render = function (now) {
    cx.clearRect(0, 0, W, H);
    placed.forEach(function (p) { drawPart(p, p.x, now, Infinity); });
    if (job) drawPart(job, job.x, now, phase === 'print' ? job.layer : job.layer - 1, phase === 'print' ? { at: nozzle.x, dir: job.dir } : null);
    if (!reduce) drawGantry(now);
  };

  var step = function (dt, now) {
    if (phase === 'clear') {
      fade -= dt / 600;
      if (fade <= 0) { fade = 1; placed = []; startJob(); setLabel(); }
      return;
    }
    if (phase === 'hold') {
      hold -= dt;
      if (hold <= 0) { phase = 'clear'; job = null; setLabel(); }
      return;
    }
    if (phase === 'travel') {
      var dx = job.tx - nozzle.x, dy = job.ty - nozzle.y, d = Math.hypot(dx, dy), m = TRAVEL * dt / 1000;
      if (d <= m) { nozzle.x = job.tx; nozzle.y = job.ty; phase = 'print'; setLabel(); }
      else { nozzle.x += dx / d * m; nozzle.y += dy / d * m; }
      return;
    }
    // print: sweep across the current layer, alternating direction like a real slicer
    var spans = job.part.layers[job.layer], ex = extent(spans);
    var end = job.dir > 0 ? job.x + ex[1] : job.x + ex[0];
    nozzle.x += job.dir * SPEED * dt / 1000;
    nozzle.y = layerTop(job.layer);
    if ((job.dir > 0 && nozzle.x >= end) || (job.dir < 0 && nozzle.x <= end)) {
      nozzle.x = end;
      job.done[job.layer] = now;
      job.layer++;
      if (job.layer >= job.part.layers.length) {
        placed.push(job);
        job = null;
        if (placed.length >= slots) { phase = 'hold'; hold = 2200; label.innerHTML = '<b>●</b> batch complete — ' + placed.length + ' parts'; }
        else { startJob(); }
        return;
      }
      job.dir = -job.dir;
      var nx = job.part.layers[job.layer], ne = extent(nx);
      job.tx = job.dir > 0 ? job.x + ne[0] : job.x + ne[1];
      job.ty = layerTop(job.layer);
      phase = 'travel';
    }
  };

  var loop = function (now) {
    raf = 0;
    if (!running) return;
    var dt = Math.min(now - last, 50);
    last = now;
    step(dt, now);
    render(now);
    raf = requestAnimationFrame(loop);
  };

  var sync = function () {
    var should = visible && !document.hidden;
    if (should && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
    else if (!should) { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  };

  size();

  if (reduce) {
    // A finished batch, drawn once.
    var drawStill = function () {
      size();
      placed = slotX.map(function (x, i) { return { part: PARTS[i % PARTS.length], x: x, done: [] }; });
      placed.forEach(function (p) { p.done = p.part.layers.map(function () { return -1e9; }); });
      render(performance.now());
    };
    drawStill();
    label.innerHTML = '<b>●</b> ' + slots + ' parts printed in PLA';
    window.addEventListener('resize', drawStill);
    return;
  }

  nozzle.x = W * .5; nozzle.y = floorY() - 60;
  startJob();
  setLabel();
  window.addEventListener('resize', function () {
    // Re-lay the bed for the new width and start a fresh batch.
    size();
    placed = []; fade = 1; startJob(); setLabel();
    if (!running) render(performance.now());
  });
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; sync(); }).observe(bed);
  } else { visible = true; sync(); }
})();
