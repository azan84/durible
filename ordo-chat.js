/* ordo.earth — "Ask Ordo" concierge chat. Talks to the Cloudflare Worker in
   workers/ordo-chat, which answers from the site's published content via Claude,
   shows suggested products as picture cards and turns the conversation into a
   ready-to-send project brief (pre-fills /contact or WhatsApp). */
(function () {
  'use strict';

  var ENDPOINT = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? 'http://localhost:8787/chat' // `npm run dev` in workers/ordo-chat
    : 'https://ordo-site-chat.azan-sapardi.workers.dev/chat';
  var WHATSAPP = '60107924208';
  var STORE_KEY = 'ordo-chat-v1';
  var OPEN_KEY = 'ordo-chat-open';
  var TEASER_KEY = 'ordo-chat-teaser';
  var MAX_HISTORY = 12;
  var MAX_CHARS = 1500;
  var INTERESTS = ['Ordo Connect', 'Ordo Life', 'Ordo Collections', 'Custom project', 'General enquiry'];
  var RANGE_IMG = { 'ordo-connect': 'range-connect', 'ordo-life': 'range-life', 'ordo-collections': 'range-collections' };

  var SUGGESTIONS = [
    'Gift ideas for our clients',
    'NFC business cards for my team',
    'Keepsakes for an upcoming event',
    'How does a custom project work?'
  ];

  var ICON_MARK = '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><rect x="7" y="19" width="18" height="4" rx="2" fill="currentColor" opacity=".55"/><rect x="9" y="13.5" width="14" height="4" rx="2" fill="currentColor" opacity=".8"/><rect x="11" y="8" width="10" height="4" rx="2" fill="currentColor"/><circle cx="24.5" cy="8.5" r="3" fill="#e88973"/></svg>';
  var ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var ICON_RESET = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>';
  var ICON_SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var ICON_WA = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.6 11.6 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.5-.3Z"/></svg>';

  // The stylesheet shares this script's ?v= cache-buster (CHAT in scripts/build-site.mjs).
  var script = document.currentScript;
  var css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = '/ordo-chat.css' + (script ? new URL(script.src).search : '');
  document.head.appendChild(css);

  var root = document.createElement('div');
  root.id = 'ordo-chat';
  root.innerHTML =
    '<div class="oc-teaser" hidden>' +
      '<button type="button" class="oc-teaser-open">Planning gifts, an event or NFC cards? <strong>I can suggest ideas.</strong></button>' +
      '<button type="button" class="oc-teaser-close" aria-label="Dismiss">' + ICON_CLOSE + '</button>' +
    '</div>' +
    '<button type="button" class="oc-launcher" aria-haspopup="dialog" aria-controls="oc-panel" aria-expanded="false">' +
      '<span class="oc-launcher-mark">' + ICON_MARK + '</span><span class="oc-launcher-label">Ask Ordo</span>' +
    '</button>' +
    '<div class="oc-panel" id="oc-panel" role="dialog" aria-modal="false" aria-labelledby="oc-title">' +
      '<div class="oc-head">' +
        '<span class="oc-avatar">' + ICON_MARK + '</span>' +
        '<div class="oc-head-text">' +
          '<p class="oc-title" id="oc-title">Ordo Concierge</p>' +
          '<p class="oc-sub"><span class="oc-dot" aria-hidden="true"></span>Ideas, gifting &amp; custom projects</p>' +
        '</div>' +
        '<a class="oc-icon-btn" href="https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent('Hi Ordo, I’d like to discuss a project.') + '" target="_blank" rel="noopener noreferrer" aria-label="Message Ordo on WhatsApp" title="WhatsApp">' + ICON_WA + '</a>' +
        '<button type="button" class="oc-icon-btn oc-reset" aria-label="Start a new conversation" title="New conversation">' + ICON_RESET + '</button>' +
        '<button type="button" class="oc-icon-btn oc-close" aria-label="Close chat" title="Close">' + ICON_CLOSE + '</button>' +
      '</div>' +
      '<div class="oc-log" aria-live="polite" aria-relevant="additions"></div>' +
      '<form class="oc-form">' +
        '<label class="oc-sr" for="oc-input">Your message</label>' +
        '<textarea class="oc-input" id="oc-input" rows="1" maxlength="' + MAX_CHARS + '" placeholder="Tell us what you have in mind…" autocomplete="off"></textarea>' +
        '<button type="submit" class="oc-send" aria-label="Send" disabled>' + ICON_SEND + '</button>' +
      '</form>' +
      '<p class="oc-foot">AI assistant · details are confirmed in your proposal.</p>' +
    '</div>';
  document.body.appendChild(root);

  var launcher = root.querySelector('.oc-launcher');
  var panel = root.querySelector('.oc-panel');
  var log = root.querySelector('.oc-log');
  var form = root.querySelector('.oc-form');
  var input = root.querySelector('.oc-input');
  var send = root.querySelector('.oc-send');
  var resetBtn = root.querySelector('.oc-reset');
  var teaser = root.querySelector('.oc-teaser');
  var mobile = window.matchMedia('(max-width: 560px)');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var history = load();
  var busy = false;

  function load() {
    try {
      var data = JSON.parse(sessionStorage.getItem(STORE_KEY) || '[]');
      if (!Array.isArray(data)) return [];
      data = data.filter(function (m) {
        return m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string';
      });
      // Only complete exchanges are stored, but guard against an older/corrupt entry.
      while (data.length && data[data.length - 1].role !== 'assistant') data.pop();
      return data;
    } catch (e) { return []; }
  }
  function save() {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(history.slice(-MAX_HISTORY * 2))); } catch (e) { /* storage unavailable */ }
  }
  function remember(key, value) {
    try { sessionStorage.setItem(key, value); } catch (e) { /* storage unavailable */ }
  }
  function recall(key) {
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
  }

  // --- Minimal, safe Markdown: escape everything, then allow links, bold, italics, lists.
  function esc(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function safeHref(raw) {
    var href = raw.trim();
    if (/^(javascript|data|vbscript):/i.test(href)) return null;
    try {
      var url = new URL(href, location.origin);
      if (url.protocol !== 'https:' && url.protocol !== 'http:' && url.protocol !== 'mailto:' && url.protocol !== 'tel:') return null;
      return url;
    } catch (e) { return null; }
  }
  // noLinks: inside a link label, so don't nest another <a>.
  function inline(text, noLinks) {
    var out = '';
    var re = /\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*([^*\n]+)\*\*|(https?:\/\/[^\s<)]+[^\s<).,;:!?'"])|(?:^|(?<=[\s(]))[*_]([^*_\s][^*_\n]*?)[*_](?=[\s).,;:!?]|$)/g;
    var last = 0, m;
    while ((m = re.exec(text))) {
      out += esc(text.slice(last, m.index));
      if (m[1]) {
        var url = noLinks ? null : safeHref(m[2]);
        out += url ? link(url, inline(m[1], true)) : inline(m[1], noLinks);
      } else if (m[3]) {
        out += '<strong>' + inline(m[3], noLinks) + '</strong>';
      } else if (m[5]) {
        out += '<em>' + inline(m[5], noLinks) + '</em>';
      } else {
        var bare = noLinks ? null : safeHref(m[4]);
        out += bare ? link(bare, esc(m[4])) : esc(m[4]);
      }
      last = re.lastIndex;
    }
    return out + esc(text.slice(last));
  }
  function link(url, label) {
    var newTab = url.origin !== location.origin && url.protocol !== 'mailto:' && url.protocol !== 'tel:';
    return '<a href="' + esc(url.href) + '"' + (newTab ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + label + '</a>';
  }
  function render(md) {
    var html = '', list = null, para = [];
    function flush() {
      if (para.length) { html += '<p>' + para.map(function (l) { return inline(l); }).join('<br>') + '</p>'; para = []; }
    }
    function closeList() { if (list) { html += '</' + list + '>'; list = null; } }
    md.split('\n').forEach(function (line) {
      var item = line.match(/^\s*([-*•]|\d+[.)])\s+(.*)$/);
      if (item) {
        flush();
        var type = /\d/.test(item[1]) ? 'ol' : 'ul';
        if (list !== type) { closeList(); html += '<' + type + '>'; list = type; }
        html += '<li>' + inline(item[2]) + '</li>';
      } else {
        closeList();
        if (line.trim()) para.push(line.replace(/^#+\s*/, '').trim()); else flush();
      }
    });
    flush();
    closeList();
    return html;
  }

  // --- Replies: text, then picture cards for linked products, then the brief card.
  var BRIEF_RE = /\[\[brief(?:\s+interest="([^"]*)")?\s*\]\]([\s\S]*?)(?:\[\[\/brief\]\]|$)/;

  function splitReply(text) {
    var m = text.match(BRIEF_RE);
    if (!m) return { body: text.replace(/\[\[?b?r?i?e?f?$/, ''), brief: null };
    var interest = INTERESTS.indexOf(m[1]) >= 0 ? m[1] : 'General enquiry';
    var done = /\[\[\/brief\]\]/.test(text);
    return {
      body: (text.slice(0, m.index) + (done ? text.slice(m.index + m[0].length) : '')).trim(),
      brief: { interest: interest, text: m[2].trim(), done: done }
    };
  }

  function productCards(md) {
    var seen = {}, cards = [];
    var re = /\[([^\]\n]+)\]\((\/(?:product\/([a-z0-9-]+)|collections\/(ordo-(?:connect|life|collections))))\)/g, m;
    while ((m = re.exec(md)) && cards.length < 6) {
      var key = m[2];
      if (seen[key]) continue;
      seen[key] = true;
      var img = m[3] ? m[3] + '-main' : RANGE_IMG[m[4]];
      cards.push('<a class="oc-card" href="' + esc(key) + '">' +
        '<span class="oc-card-img"><img src="/img/ordo/' + esc(img) + '-640.webp" alt="" loading="lazy" decoding="async" onerror="this.parentNode.classList.add(\'oc-noimg\');this.remove()"></span>' +
        '<span class="oc-card-name">' + esc(m[1].replace(/\*\*/g, '')) + '</span>' +
        '<span class="oc-card-cta">' + (m[3] ? 'View idea' : 'Explore range') + ' →</span>' +
      '</a>');
    }
    return cards.length ? '<div class="oc-cards" role="list">' + cards.join('') + '</div>' : '';
  }

  function briefCard(brief) {
    if (!brief.done) {
      return '<div class="oc-brief oc-brief-pending"><span class="oc-brief-label">Preparing your brief…</span></div>';
    }
    return '<div class="oc-brief">' +
      '<div class="oc-brief-top"><span class="oc-brief-label">Your project brief</span><span class="oc-tag">' + esc(brief.interest) + '</span></div>' +
      '<textarea class="oc-brief-text" rows="5" maxlength="3500" aria-label="Your project brief — edit before sending" data-interest="' + esc(brief.interest) + '">' + esc(brief.text) + '</textarea>' +
      '<div class="oc-brief-actions">' +
        '<button type="button" class="oc-btn oc-btn-primary" data-send="form">Send as enquiry</button>' +
        '<button type="button" class="oc-btn oc-btn-ghost" data-send="wa">' + ICON_WA + 'WhatsApp</button>' +
      '</div>' +
      '<p class="oc-brief-note">You can edit it first. The enquiry form opens pre-filled — just add your name and email.</p>' +
    '</div>';
  }

  function renderReply(text, final) {
    var parts = splitReply(text);
    var html = render(parts.body);
    if (final) html += productCards(parts.body);
    if (parts.brief) html += briefCard(parts.brief);
    return html;
  }

  // --- View
  function addMessage(role, content) {
    var el = document.createElement('div');
    el.className = 'oc-msg ' + (role === 'user' ? 'oc-msg-user' : 'oc-msg-bot');
    if (role === 'user') el.innerHTML = '<span class="oc-sr">You said: </span>' + esc(content);
    else setBotContent(el, renderReply(content, true));
    log.appendChild(el);
    scrollDown(true);
    return el;
  }
  function setBotContent(el, html) {
    el.innerHTML = '<span class="oc-sr">Ordo Concierge: </span>' + html;
    // Show the whole brief without an inner scrollbar.
    [].forEach.call(el.querySelectorAll('.oc-brief-text'), function (box) {
      requestAnimationFrame(function () { box.style.height = Math.min(box.scrollHeight + 2, 260) + 'px'; });
    });
  }
  // Follow the stream only if the visitor hasn't scrolled up to read.
  function scrollDown(force) {
    if (force || log.scrollHeight - log.scrollTop - log.clientHeight < 80) log.scrollTop = log.scrollHeight;
  }

  function renderAll() {
    log.innerHTML = '';
    if (!history.length) {
      var hello = document.createElement('div');
      hello.className = 'oc-hello';
      hello.innerHTML =
        '<p class="oc-hello-title">Let’s make something purposeful.</p>' +
        '<p class="oc-intro">Tell me who it’s for and what it should do. I’ll suggest ideas from our ranges and put together a brief for the Ordo team.</p>';
      var chips = document.createElement('div');
      chips.className = 'oc-chips';
      SUGGESTIONS.forEach(function (q) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'oc-chip';
        b.textContent = q;
        b.addEventListener('click', function () { input.focus(); ask(q); });
        chips.appendChild(b);
      });
      log.appendChild(hello);
      log.appendChild(chips);
      return;
    }
    history.forEach(function (m) { addMessage(m.role, m.content); });
  }

  function setOpen(open, restoring) {
    root.classList.toggle('oc-open', open);
    launcher.setAttribute('aria-expanded', String(open));
    panel.setAttribute('aria-modal', String(open && mobile.matches));
    remember(OPEN_KEY, open ? '1' : '0');
    if (open) {
      hideTeaser(true);
      if (!log.childElementCount) renderAll();
      scrollDown(true);
      // Don't grab focus (or pop the mobile keyboard) when reopening after navigation.
      if (!restoring) setTimeout(function () { input.focus(); }, 60);
    } else if (!restoring) {
      launcher.focus();
    }
  }

  function syncControls() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    send.disabled = busy || !input.value.trim();
    resetBtn.disabled = busy;
  }

  // --- Network
  async function ask(question) {
    question = question.trim().slice(0, MAX_CHARS);
    if (!question || busy) return;
    busy = true;
    input.value = '';
    syncControls();
    if (!history.length) log.innerHTML = '';

    var turn = history.concat({ role: 'user', content: question });
    addMessage('user', question);

    var bubble = addMessage('assistant', '');
    bubble.innerHTML = '<span class="oc-typing" role="status"><span class="oc-sr">Ordo Concierge is typing…</span><span></span><span></span><span></span></span>';
    // Screen readers announce the finished reply once, not every streamed chunk.
    log.setAttribute('aria-busy', 'true');
    var answer = '';
    var streamError = null;

    try {
      var res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: turn.slice(-MAX_HISTORY) })
      });
      if (!res.ok || !res.body) {
        var info = await res.json().catch(function () { return {}; });
        throw new Error(info.error || 'The assistant is unavailable right now. You can reach us on WhatsApp.');
      }
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buffer = '';
      for (;;) {
        var chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        var events = buffer.split('\n\n');
        buffer = events.pop();
        events.forEach(function (evt) {
          var line = evt.trim();
          if (line.indexOf('data: ') !== 0) return;
          var data;
          try { data = JSON.parse(line.slice(6)); } catch (e) { return; }
          if (data.reset) answer = '';
          if (data.t) answer += data.t;
          if (data.error) streamError = data.error;
        });
        if (answer) { setBotContent(bubble, renderReply(answer, false)); scrollDown(); }
      }
      if (streamError) throw new Error(streamError);
      if (!answer) throw new Error('No answer came back. Please try again.');
      setBotContent(bubble, renderReply(answer, true));
      scrollDown();
      // Store only complete exchanges so the history always alternates.
      history = turn.concat({ role: 'assistant', content: answer });
      save();
    } catch (err) {
      var msg = (err && err.message && !/fetch|network/i.test(err.message))
        ? err.message
        : 'Couldn’t reach the assistant. Check your connection, or message us on WhatsApp.';
      if (answer) {
        // Keep what arrived visible, but flag it as cut short and leave it out of history.
        setBotContent(bubble, render(splitReply(answer).body) + '<span class="oc-note">' + esc('The answer was cut short. ' + msg) + '</span>');
      } else {
        bubble.classList.add('oc-error');
        setBotContent(bubble, esc(msg));
      }
    } finally {
      busy = false;
      log.setAttribute('aria-busy', 'false');
      syncControls();
      if (root.classList.contains('oc-open') && !mobile.matches) input.focus();
    }
  }

  // --- Brief: send to the pre-filled enquiry form or WhatsApp.
  log.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-send]');
    if (!btn) return;
    var box = btn.closest('.oc-brief').querySelector('.oc-brief-text');
    var text = box.value.trim();
    if (!text) { box.focus(); return; }
    if (btn.dataset.send === 'wa') {
      window.open('https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
    } else {
      // Close the chat so the visitor lands on the form, not the panel.
      remember(OPEN_KEY, '0');
      location.href = '/contact?' + new URLSearchParams({ interest: box.dataset.interest, message: text }).toString() + '#enquiryForm';
    }
  });

  // --- Teaser: one gentle nudge per visit, desktop and phone, never while open.
  function hideTeaser(forever) {
    teaser.hidden = true;
    root.classList.remove('oc-teasing');
    if (forever) remember(TEASER_KEY, '1');
  }
  if (!recall(TEASER_KEY) && !history.length && recall(OPEN_KEY) !== '1') {
    setTimeout(function () {
      if (root.classList.contains('oc-open') || recall(TEASER_KEY)) return;
      teaser.hidden = false;
      root.classList.add('oc-teasing');
      remember(TEASER_KEY, '1');
      setTimeout(function () { hideTeaser(false); }, 14000);
    }, reduceMotion ? 4000 : 7000);
  }
  root.querySelector('.oc-teaser-open').addEventListener('click', function () { setOpen(true); });
  root.querySelector('.oc-teaser-close').addEventListener('click', function () { hideTeaser(true); });

  // --- Events
  launcher.addEventListener('click', function () { setOpen(true); });
  root.querySelector('.oc-close').addEventListener('click', function () { setOpen(false); });
  resetBtn.addEventListener('click', function () {
    if (busy) return;
    history = [];
    save();
    renderAll();
    input.focus();
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); });
  input.addEventListener('input', syncControls);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(input.value); }
  });
  mobile.addEventListener('change', function () {
    panel.setAttribute('aria-modal', String(root.classList.contains('oc-open') && mobile.matches));
  });
  document.addEventListener('keydown', function (e) {
    if (!root.classList.contains('oc-open')) return;
    if (e.key === 'Escape') { setOpen(false); return; }
    // Full-screen on phones: keep Tab inside the chat.
    if (e.key === 'Tab' && mobile.matches) {
      var items = [].slice.call(panel.querySelectorAll('button:not([disabled]), textarea, a[href]'));
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        e.preventDefault(); first.focus();
      }
    }
  });

  // Reopen after following a link from the chat — on larger screens only, where
  // the panel doesn't cover the page the visitor just opened.
  if (recall(OPEN_KEY) === '1' && !mobile.matches) setOpen(true, true);
})();
