/* ================================================================
   ORDO — Interactions layer (vanilla)
   Scroll reveals · cursor parallax · wishlist drawer ·
   mobile nav · count-up · pillar/type filter · sticky CTA ·
   accordions · image-loaded shimmer · nav scroll state
   ================================================================ */

(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ------- 1. Scroll reveal -------

  function setupReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;

    if (!('IntersectionObserver' in window) || prefersReduced) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

    els.forEach(function (el) { io.observe(el); });
  }

  // ------- 2. Story word-by-word reveal -------

  function setupStoryWords() {
    var container = document.getElementById('storyWords');
    if (!container) return;

    var words = container.querySelectorAll('.story-word');
    if (!words.length) return;

    words.forEach(function (w, i) {
      w.style.transitionDelay = (i * 60) + 'ms';
    });

    if (!('IntersectionObserver' in window) || prefersReduced) {
      container.classList.add('in');
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          container.classList.add('in');
          io.unobserve(container);
        }
      });
    }, { threshold: 0.4 });

    io.observe(container);
  }

  // ------- 3. Hero cursor parallax -------

  function setupHeroParallax() {
    var vis = document.getElementById('heroVisual');
    if (!vis || prefersReduced || !hasFinePointer) return;

    var hero = vis.closest('.hero');
    if (!hero) return;

    var rect = null;
    var raf = 0;
    var tx = 0, ty = 0;

    function measure() { rect = hero.getBoundingClientRect(); }
    measure();
    window.addEventListener('resize', measure, { passive: true });

    hero.addEventListener('mousemove', function (e) {
      if (!rect) return;
      var nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      var ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      tx = Math.max(-1, Math.min(1, nx));
      ty = Math.max(-1, Math.min(1, ny));

      if (!raf) {
        raf = requestAnimationFrame(apply);
      }
    });

    hero.addEventListener('mouseleave', function () {
      tx = 0; ty = 0;
      if (!raf) raf = requestAnimationFrame(apply);
    });

    function apply() {
      hero.style.setProperty('--mx', tx.toFixed(3));
      hero.style.setProperty('--my', ty.toFixed(3));
      raf = 0;
    }
  }

  // ------- 4. Story background subtle scroll parallax -------

  function setupStoryParallax() {
    var bg = document.getElementById('storyBg');
    if (!bg || prefersReduced) return;

    var story = bg.closest('.story');
    if (!story) return;

    var raf = 0;

    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        var rect = story.getBoundingClientRect();
        var vh = window.innerHeight;
        // only run when in view
        if (rect.bottom < 0 || rect.top > vh) { raf = 0; return; }
        var progress = (vh - rect.top) / (vh + rect.height);
        var y = (progress - 0.5) * 40; // -20 .. 20
        bg.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px, 0)';
        raf = 0;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ------- 5. Count-up numbers -------

  function setupCountUp() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length) return;

    if (!('IntersectionObserver' in window) || prefersReduced) {
      els.forEach(function (el) {
        var target = Number(el.getAttribute('data-count')) || 0;
        var span = el.querySelector('span');
        if (span) span.textContent = target;
      });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        io.unobserve(el);
        animateCount(el);
      });
    }, { threshold: 0.5 });

    els.forEach(function (el) { io.observe(el); });
  }

  function animateCount(el) {
    var target = Number(el.getAttribute('data-count')) || 0;
    var span = el.querySelector('span');
    if (!span) return;

    var duration = 1400;
    var start = performance.now();

    function step(now) {
      var t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      var eased = 1 - Math.pow(1 - t, 3);
      var value = Math.round(eased * target);
      span.textContent = value.toLocaleString();
      if (t < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  // ------- 6. Nav scroll border state -------

  function setupNavScroll() {
    var nav = document.getElementById('nav');
    if (!nav) return;
    function on() {
      if (window.scrollY > 8) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    }
    window.addEventListener('scroll', on, { passive: true });
    on();
  }

  // ------- 7. Mobile drawer -------

  function setupMobileNav() {
    var toggle = document.getElementById('openMobileNav');
    var drawer = document.getElementById('mobileDrawer');
    if (!toggle || !drawer) return;

    function open() {
      drawer.hidden = false;
      requestAnimationFrame(function () { drawer.classList.add('open'); });
      document.body.classList.add('scroll-lock');
      toggle.setAttribute('aria-expanded', 'true');
    }
    function close() {
      drawer.classList.remove('open');
      document.body.classList.remove('scroll-lock');
      toggle.setAttribute('aria-expanded', 'false');
      setTimeout(function () { drawer.hidden = true; }, 400);
    }

    toggle.addEventListener('click', open);
    drawer.querySelectorAll('[data-close]').forEach(function (el) {
      el.addEventListener('click', close);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('open')) close();
    });
  }

  // ------- 8. Wishlist (localStorage) + drawer -------

  var WISH_KEY = 'durible:wishlist:v1';

  function readWish() {
    try {
      var raw = localStorage.getItem(WISH_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function writeWish(list) {
    try { localStorage.setItem(WISH_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function setupWishlist() {
    var badge = document.getElementById('wishBadge');
    var drawer = document.getElementById('wishDrawer');
    var body = document.getElementById('wishBody');
    var openBtn = document.getElementById('openWishlist');
    if (!badge || !drawer || !body || !openBtn) return;

    function updateBadge(bounce) {
      var list = readWish();
      badge.textContent = list.length;
      if (list.length > 0) {
        badge.classList.add('show');
        if (bounce) {
          badge.classList.remove('bounce');
          // reflow to restart animation
          void badge.offsetWidth;
          badge.classList.add('bounce');
        }
      } else {
        badge.classList.remove('show');
      }
    }

    function render() {
      var list = readWish();
      if (!list.length) {
        body.innerHTML =
          '<div class="wish-empty">' +
            '<h3>Nothing saved yet</h3>' +
            '<p>Tap the heart on any product to keep it here for later.</p>' +
            '<a href="#shop" class="btn btn-primary btn-icon-r" data-close>Browse the shop</a>' +
          '</div>';
        // Wire close on the shop button
        body.querySelectorAll('[data-close]').forEach(function (el) {
          el.addEventListener('click', close);
        });
        return;
      }
      body.innerHTML = list.map(function (it) {
        return '' +
          '<div class="wish-item" data-id="' + escapeAttr(it.id) + '">' +
            '<div class="wish-item-img"><img src="' + escapeAttr(it.image) + '" alt=""></div>' +
            '<div>' +
              '<div class="wish-item-title"><a href="' + escapeAttr(it.url) + '">' + escapeHtml(it.name) + '</a></div>' +
              '<div class="wish-item-price">RM ' + Number(it.price).toFixed(2) + '</div>' +
            '</div>' +
            '<button type="button" class="wish-item-remove" data-remove="' + escapeAttr(it.id) + '" aria-label="Remove">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>' +
            '</button>' +
          '</div>';
      }).join('');

      body.querySelectorAll('[data-remove]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-remove');
          var list = readWish().filter(function (it) { return it.id !== id; });
          writeWish(list);
          render();
          updateBadge();
          syncHearts();
        });
      });
    }

    function syncHearts() {
      var ids = readWish().map(function (it) { return it.id; });
      document.querySelectorAll('.product-card').forEach(function (card) {
        var id = card.getAttribute('data-product-id');
        var btn = card.querySelector('[data-wish]');
        if (!btn) return;
        btn.setAttribute('aria-pressed', ids.indexOf(id) >= 0 ? 'true' : 'false');
      });
    }

    function open() {
      render();
      drawer.hidden = false;
      requestAnimationFrame(function () { drawer.classList.add('open'); });
      document.body.classList.add('scroll-lock');
      openBtn.setAttribute('aria-expanded', 'true');
    }
    function close() {
      drawer.classList.remove('open');
      document.body.classList.remove('scroll-lock');
      openBtn.setAttribute('aria-expanded', 'false');
      setTimeout(function () { drawer.hidden = true; }, 400);
    }

    openBtn.addEventListener('click', open);
    drawer.querySelectorAll('[data-close]').forEach(function (el) {
      el.addEventListener('click', close);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('open')) close();
    });

    // Wire heart buttons on product cards
    document.querySelectorAll('.product-card').forEach(function (card) {
      var btn = card.querySelector('[data-wish]');
      if (!btn) return;
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var id = card.getAttribute('data-product-id');
        var list = readWish();
        var idx = -1;
        for (var i = 0; i < list.length; i++) { if (list[i].id === id) { idx = i; break; } }
        if (idx >= 0) {
          list.splice(idx, 1);
          btn.setAttribute('aria-pressed', 'false');
        } else {
          list.push({
            id: id,
            name: card.getAttribute('data-product-name') || '',
            price: Number(card.getAttribute('data-product-price')) || 0,
            image: card.getAttribute('data-product-image') || '',
            url: card.getAttribute('data-product-url') || '#'
          });
          btn.setAttribute('aria-pressed', 'true');
        }
        writeWish(list);
        updateBadge(true);
      });
    });

    updateBadge();
    syncHearts();
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c];
    });
  }
  function escapeAttr(s) { return escapeHtml(s); }

  // ------- 9. Product filter chips (pillar + type, OR-within, AND-across) -------

  function setupProductFilter() {
    var grid = document.getElementById('productGrid');
    if (!grid) return;

    var pillarChips = document.querySelectorAll('.catalog-filters [data-filter-pillar]');
    var typeChips = document.querySelectorAll('.catalog-filters [data-filter-type]');
    var clearBtn = document.getElementById('clearFilters');
    var emptyEl = document.getElementById('shopEmpty');
    if (!pillarChips.length && !typeChips.length) return;

    function activeSet(chips, attr) {
      var out = [];
      chips.forEach(function (c) {
        if (c.getAttribute('aria-pressed') === 'true') out.push(c.getAttribute(attr));
      });
      return out;
    }

    function apply() {
      var pillars = activeSet(pillarChips, 'data-filter-pillar');
      var types = activeSet(typeChips, 'data-filter-type');

      var anyActive = pillars.length > 0 || types.length > 0;
      if (clearBtn) clearBtn.hidden = !anyActive;

      var totalVisible = 0;
      var cards = grid.querySelectorAll('.product-card');
      cards.forEach(function (card) {
        var pillar = card.getAttribute('data-pillar') || '';
        var cat = card.getAttribute('data-category') || '';
        var pillarOk = pillars.length === 0 || pillars.indexOf(pillar) >= 0;
        var typeOk = types.length === 0 || types.indexOf(cat) >= 0;
        // Placeholder cards (no data-category) only match when no type filter is active.
        if (!cat && types.length > 0) typeOk = false;
        var show = pillarOk && typeOk;
        card.style.display = show ? '' : 'none';
        if (show) totalVisible++;
      });

      // Hide pillar-block wrappers with no visible cards inside
      grid.querySelectorAll('.pillar-block').forEach(function (block) {
        var hasVisible = false;
        block.querySelectorAll('.product-card').forEach(function (c) {
          if (c.style.display !== 'none') hasVisible = true;
        });
        block.hidden = !hasVisible;
      });

      if (emptyEl) emptyEl.hidden = totalVisible > 0;
    }

    function toggleChip(chip) {
      var pressed = chip.getAttribute('aria-pressed') === 'true';
      chip.setAttribute('aria-pressed', pressed ? 'false' : 'true');
      apply();
    }

    pillarChips.forEach(function (chip) {
      chip.addEventListener('click', function () { toggleChip(chip); });
    });
    typeChips.forEach(function (chip) {
      chip.addEventListener('click', function () { toggleChip(chip); });
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        pillarChips.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
        typeChips.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
        apply();
      });
    }

    apply();
  }

  // ------- 10. Image-loaded (stop shimmer) -------

  function setupImageLoaded() {
    document.querySelectorAll('.product-card-media').forEach(function (wrap) {
      var img = wrap.querySelector('img');
      if (!img) return;
      if (img.complete && img.naturalHeight > 0) {
        wrap.classList.add('loaded');
      } else {
        img.addEventListener('load', function () { wrap.classList.add('loaded'); });
        img.addEventListener('error', function () { wrap.classList.add('loaded'); });
      }
    });
  }

  // ------- 11. Accordions (PDP) -------

  function setupAccordions() {
    document.querySelectorAll('.accordion-item').forEach(function (item) {
      var summary = item.querySelector('.accordion-summary');
      if (!summary) return;
      summary.addEventListener('click', function () {
        var open = item.getAttribute('data-open') === 'true';
        // allow multiple open? yes — single toggle behaviour
        item.setAttribute('data-open', open ? 'false' : 'true');
        summary.setAttribute('aria-expanded', open ? 'false' : 'true');
      });
    });
  }

  // ------- 12. Sticky CTA bar (PDP) -------

  function setupStickyCta() {
    var bar = document.getElementById('stickyBar');
    var anchor = document.getElementById('stickyAnchor');
    if (!bar || !anchor) return;

    if (!('IntersectionObserver' in window)) { return; }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) bar.classList.remove('show');
        else bar.classList.add('show');
      });
    }, { rootMargin: '0px 0px -80% 0px' });
    io.observe(anchor);
  }

  // ------- 13. Active nav highlight on scroll -------

  function setupActiveNav() {
    var links = document.querySelectorAll('.nav-links a[href^="#"]');
    if (!links.length) return;
    var sections = [];
    links.forEach(function (l) {
      var id = l.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if (el) sections.push({ link: l, el: el });
    });

    function onScroll() {
      var y = window.scrollY + 120;
      var active = null;
      sections.forEach(function (s) {
        if (s.el.offsetTop <= y) active = s;
      });
      links.forEach(function (l) { l.classList.remove('active'); });
      if (active) active.link.classList.add('active');
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ------- INIT -------

  function init() {
    setupReveal();
    setupStoryWords();
    setupHeroParallax();
    setupStoryParallax();
    setupCountUp();
    setupNavScroll();
    setupMobileNav();
    setupWishlist();
    setupProductFilter();
    setupImageLoaded();
    setupAccordions();
    setupStickyCta();
    setupActiveNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
