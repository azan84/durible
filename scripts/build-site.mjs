#!/usr/bin/env node
// Generates the static marketing pages for ordo.earth from the data below.
//
//   node scripts/build-site.mjs
//
// Output is committed (Cloudflare Pages serves the repo as-is, no build step):
//   index.html, solutions.html, ranges.html, custom-projects.html, about.html,
//   contact.html, collections/*.html, product/*.html
//
// Shared assets: ordo.css + ordo.js. The legacy order pages (bagtag.html,
// keychain.html, bizcard.html, cablewinder.html) keep style.css/interactions.js
// and are NOT touched by this script.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BUILD = 'ordo-v5';
const SITE = 'https://ordo.earth';
const WHATSAPP = '60107924208';
const EMAIL = 'hello@ordostudio.com';

// ─── Data ────────────────────────────────────────────────────────────────

const NOTE = 'Concept imagery shown. Final design and specifications are agreed for each project.';
const MATERIALS = 'Material and dimensions are agreed for each approved brief. Ordo currently uses PLA; the material for a specific concept is confirmed during proposal.';
const CARE = 'Care guidance is confirmed alongside the final material and specifications.';
const CUSTOM = 'Colour, finish and other customisation details are explored together for each brief.';
const NFC = 'The NFC destination and setup are agreed for each project. Tapping requires a compatible NFC-enabled device; device behaviour varies.';

const RANGES = [
  {
    slug: 'ordo-connect', name: 'Ordo Connect', tagline: 'Make every connection count.',
    description: 'Physical touchpoints that open a useful digital destination for teams, events and customer engagement.',
    hero: ['hero-connect', 'NFC cards and keychains arranged beside a phone on a warm ivory studio desk.'],
    card: ['range-connect', 'Deep teal NFC cards and keychains presented for a professional team.'],
  },
  {
    slug: 'ordo-life', name: 'Ordo Life', tagline: 'Give something thoughtful.',
    description: 'Considered gifts and everyday objects for employee appreciation, client gifting and welcoming spaces.',
    hero: ['hero-life', 'A diffuser holder and thoughtful desk object styled as a potential business gift.'],
    card: ['range-life', 'A sculptural diffuser holder and desk object in a softly lit ivory setting.'],
  },
  {
    slug: 'ordo-collections', name: 'Ordo Collections', tagline: 'Bring your identity into form.',
    description: 'Coordinated designs inspired by an organisation, a place or an occasion.',
    hero: ['hero-collections', 'Coordinated event keepsakes and place-inspired objects in deep teal and ivory.'],
    card: ['range-collections', 'A group of architectural and event keepsake concepts in a warm studio setting.'],
  },
];
const rangeBySlug = Object.fromEntries(RANGES.map((r) => [r.slug, r]));

const COLLECTIONS = [
  { slug: 'campus-edit', name: 'Campus Edit', description: 'Neutral commemorative concepts inspired by campus life and shared identity. Ordo is independent and is not affiliated with a university.' },
  { slug: 'kuala-lumpur', name: 'Kuala Lumpur', description: 'Architectural keepsake concepts shaped by familiar forms and the character of Kuala Lumpur.' },
  { slug: 'raya', name: 'Raya', description: 'Contemporary decorative concepts for the warmth, gathering and rituals of Raya.' },
  { slug: 'seasonal-edits', name: 'Seasonal Edits', description: 'Custom event and seasonal keepsake concepts for occasions worth remembering.' },
];

const APPLICATIONS = [
  { id: 'corporate-gifting', title: 'Corporate gifting', description: 'Thoughtful gifts for clients, employees and partners.',
    image: ['application-gifting', 'A considered desk gift and sculptural object arranged in a warm professional setting.'],
    interest: 'Ordo Life', context: 'I’m exploring thoughtful gifts for clients, employees or partners.' },
  { id: 'events-campaigns', title: 'Events and campaigns', description: 'Custom keepsakes and NFC-enabled touchpoints for events and customer engagement.',
    image: ['application-events', 'Deep teal NFC touchpoints and event keepsakes arranged on a professional event table.'],
    interest: 'Ordo Connect', context: 'I’m exploring keepsakes or NFC touchpoints for an event or campaign.' },
  { id: 'institutional-collections', title: 'Institutional collections', description: 'Products inspired by an organisation’s identity, community or place.',
    image: ['application-institutional', 'Neutral commemorative and architectural keepsake concepts inspired by a place and community.'],
    interest: 'Ordo Collections', context: 'I’m exploring a collection inspired by an organisation, community or place.' },
  { id: 'custom-projects', title: 'Custom projects', description: 'Objects developed around a specific brief, audience or purpose.',
    image: ['application-custom', 'Hands holding a deep teal 3D-printed prototype beside sketches of alternative forms.'],
    interest: 'Custom project', context: 'I have a custom brief I’d like to discuss.' },
];
const appByTitle = Object.fromEntries(APPLICATIONS.map((a) => [a.title, a]));

const p = (slug, name, summary, description, range, collections, applications, alt, extra = {}) =>
  ({ slug, name, summary, description, range, collections, applications, alt, ...extra });

const PRODUCTS = [
  p('nfc-keychain', 'NFC Keychain', 'A considered touchpoint to carry and share.',
    'A compact keychain concept with an NFC touchpoint, intended to open a digital destination chosen for a team, event or customer interaction.',
    'ordo-connect', [], ['Events and campaigns', 'Corporate gifting'],
    'Deep teal NFC keychain concept with a simple rounded body and metal ring.', { nfc: NFC }),
  p('nfc-business-card', 'NFC Business Card', 'A reusable introduction with a digital next step.',
    'A physical NFC card concept designed to open a selected digital destination, such as a contact page or professional profile.',
    'ordo-connect', [], ['Events and campaigns', 'Corporate gifting'],
    'Minimal deep teal NFC business card concept with rounded edges on an ivory surface.',
    { nfc: 'The destination is selected and configured for each project. A compatible NFC-enabled device is required; compatibility and tap behaviour vary by device.' }),
  p('nfc-desktop-touchpoint', 'Desktop NFC Touchpoint', 'A small, physical prompt for a useful connection.',
    'A tabletop NFC touchpoint concept for a reception desk, event stand or shared space, designed around a digital destination selected for the brief.',
    'ordo-connect', [], ['Events and campaigns', 'Institutional collections'],
    'Deep teal desktop NFC touchpoint concept standing on a warm ivory reception counter.', { nfc: NFC }),
  p('sculptural-diffuser', 'Sculptural Diffuser Holder', 'A tactile object for a desk or welcoming space.',
    'A decorative holder concept with a sculptural profile, designed to accommodate a separate non-heated diffuser insert.',
    'ordo-life', [], ['Corporate gifting', 'Custom projects'],
    'Deep teal sculptural diffuser holder concept with a separate non-heated insert.',
    { note: `${NOTE} The concept is intended for a separate non-heated insert; no insert or fragrance is represented as included.` }),
  p('desk-organiser', 'Desk Organiser Tray', 'A simple place for everyday desk essentials.',
    'A desk organiser and tray concept that brings small items together in a considered form for a workspace or welcome area.',
    'ordo-life', [], ['Corporate gifting', 'Custom projects'],
    'Deep teal 3D-printed desk organiser tray with understated compartments.'),
  p('personalised-keepsake', 'Personalised Keepsake', 'A small object shaped around a meaningful moment.',
    'A keepsake concept with space for a project-specific detail, intended for thoughtful gifting and personal milestones.',
    'ordo-life', [], ['Corporate gifting', 'Custom projects'],
    'Deep teal keepsake frame concept with an open centre and a small muted coral detail.'),
  p('baby-ultrasound-keepsake', 'Baby Ultrasound Keepsake', 'A personal display concept for a family memory.',
    'A display keepsake concept for an ultrasound image, presented as a personal memento rather than a medical product.',
    'ordo-life', [], ['Custom projects'],
    'Gentle ivory and deep teal frame concept for a baby ultrasound image, shown as a personal keepsake.',
    { featured: false, note: `${NOTE} This personal keepsake is not a medical product.` }),
  p('kl-architectural-keepsake', 'Kuala Lumpur Architectural Keepsake', 'A small-scale interpretation of a familiar city form.',
    'An architectural keepsake concept inspired by Kuala Lumpur, developed as a place-led object for an event or collection.',
    'ordo-collections', ['kuala-lumpur'], ['Institutional collections', 'Events and campaigns'],
    'Deep teal and ivory miniature architectural keepsake inspired by Kuala Lumpur.'),
  p('university-commemorative', 'University-Inspired Commemorative', 'A neutral concept for campus occasions and milestones.',
    'A commemorative object concept inspired by campus life, with neutral demonstration details rather than any university identity or logo.',
    'ordo-collections', ['campus-edit'], ['Institutional collections', 'Events and campaigns'],
    'Neutral university-inspired commemorative concept with an abstract arch detail and no logos.',
    { note: `${NOTE} Neutral demonstration branding only; no university affiliation or logo is implied.` }),
  p('raya-ornament', 'Contemporary Raya Ornament', 'A modern decorative detail for a seasonal collection.',
    'A contemporary ornament concept inspired by the shapes, colours and gathering of Raya.',
    'ordo-collections', ['raya'], ['Institutional collections', 'Corporate gifting'],
    'Deep teal and muted coral contemporary Raya ornament concept in a warm ivory setting.'),
  p('custom-event-souvenir', 'Custom Event Souvenir', 'A keepsake concept developed around an occasion.',
    'A small event souvenir concept that can be shaped around an organisation, gathering or campaign brief.',
    'ordo-collections', ['seasonal-edits'], ['Events and campaigns', 'Institutional collections'],
    'Coordinated abstract event souvenir concepts in deep teal and ivory, without logos or text.'),
];
const HOME_PRODUCTS = ['nfc-keychain', 'nfc-business-card', 'nfc-desktop-touchpoint', 'sculptural-diffuser', 'desk-organiser', 'personalised-keepsake'];

const HERO_SLIDES = [
  { range: 'ordo-connect', headline: 'Make every connection count.',
    description: 'NFC-enabled cards, keychains and touchpoints for teams, events and customer engagement.',
    primary: ['Discuss your project', contactHref({ interest: 'Ordo Connect', message: 'I’d like to discuss an Ordo Connect idea.' })],
    secondary: ['Explore Ordo Connect', '/collections/ordo-connect'] },
  { range: 'ordo-life', headline: 'Give something thoughtful.',
    description: 'Considered gifts and objects for employee appreciation, client gifting and welcoming spaces.',
    primary: ['Explore gifting ideas', '/collections/ordo-life'],
    secondary: ['Discuss a custom brief', contactHref({ interest: 'Custom project', message: 'I’d like to discuss a custom gifting brief.' })] },
  { range: 'ordo-collections', headline: 'Bring your identity into form.',
    description: 'Custom collections inspired by your organisation, occasion or place.',
    primary: ['Plan your collection', contactHref({ interest: 'Ordo Collections', message: 'I’d like to plan a custom collection.' })],
    secondary: ['Explore Ordo Collections', '/collections/ordo-collections'] },
];

const STEPS = [
  ['Share your brief', 'Tell us about your audience and what you have in mind.'],
  ['Shape the idea', 'Explore the product direction and possible customisation together.'],
  ['Review the proposal', 'Agree on design, specifications, pricing and delivery arrangements.'],
  ['Bring it into form', 'Proceed with production once the project is approved.'],
];

const INTERESTS = ['Ordo Connect', 'Ordo Life', 'Ordo Collections', 'Custom project', 'General enquiry'];

// ─── Helpers ─────────────────────────────────────────────────────────────

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function contactHref(params) {
  const q = new URLSearchParams(params).toString();
  return '/contact' + (q ? '?' + q : '');
}

function img(name, alt, { sizes = '(min-width: 1024px) 50vw, 100vw', cls = '', eager = false, square = false, vt = '' } = {}) {
  const h = square ? 1200 : 900;
  return `<img src="/img/ordo/${name}-1200.webp" srcset="/img/ordo/${name}-640.webp 640w, /img/ordo/${name}-1200.webp 1200w" sizes="${sizes}" width="1200" height="${h}" alt="${esc(alt)}"${cls ? ` class="${cls}"` : ''}${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"${vt ? ` style="view-transition-name:${vt}"` : ''}>`;
}

const ARROW = '<svg class="i-arrow" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11m-4.5-4.5L15 10l-4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const OUT = '<svg class="i-out" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 13l6-6m-5 0h5v5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const WORDMARK = '<svg class="wordmark" viewBox="44 111 1214 455" aria-hidden="true" focusable="false"><g fill="currentColor" fill-rule="evenodd"><path class="wm-l" d="M221 234 C317 234 394 307 394 398 C394 489 317 562 221 562 C125 562 48 489 48 398 C48 307 125 234 221 234 Z M221 312 C173 312 134 350 134 398 C134 446 173 484 221 484 C269 484 308 446 308 398 C308 350 269 312 221 312 Z"/><path class="wm-l" d="M410 400 C410 309 476 238 559 238 L579 238 C597 238 603 245 597 262 L580 305 C577 313 573 317 563 316 C524 313 493 348 493 398 L493 544 C493 551 489 555 482 555 L421 555 C413 555 410 551 410 544 Z"/><path class="wm-l" d="M810 138 C810 123 819 115 834 115 L891 115 C895 115 897 117 897 122 L897 400 C897 490 826 562 735 562 C644 562 573 490 573 400 C573 308 644 234 735 234 C754 234 773 235 784 240 C791 243 794 248 794 258 L794 329 C778 318 758 312 738 312 C692 312 659 349 659 400 C659 447 692 484 736 484 C779 484 810 449 810 402 Z"/><path class="wm-l" d="M1083 234 C1178 234 1254 307 1254 398 C1254 489 1178 562 1083 562 C988 562 912 489 912 398 C912 307 988 234 1083 234 Z M1083 312 C1036 312 997 350 997 398 C997 446 1036 484 1083 484 C1130 484 1169 446 1169 398 C1169 350 1130 312 1083 312 Z"/></g></svg>';

const btn = (label, href, kind = 'primary') => `<a class="btn btn-${kind}" href="${esc(href)}"><span>${esc(label)}</span>${ARROW}</a>`;
const link = (label, href, icon = ARROW) => `<a class="tlink" href="${esc(href)}"><span>${esc(label)}</span>${icon}</a>`;

function eyebrow(text) {
  return `<p class="eyebrow"><svg viewBox="0 0 14 8" aria-hidden="true"><path d="M1 1.5l6 5 6-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>${esc(text)}</p>`;
}

// ─── Shell ───────────────────────────────────────────────────────────────

const NAV = [
  ['Solutions', '/solutions'],
  ['Product Ranges', '/ranges'],
  ['Custom Projects', '/custom-projects'],
  ['About Ordo', '/about'],
  ['Contact', '/contact'],
];

function header(active) {
  const links = NAV.map(([l, h]) => `<a href="${h}"${active === h ? ' aria-current="page"' : ''}>${l}</a>`).join('');
  return `<a class="skip" href="#main">Skip to content</a>
<header class="site-header" id="siteHeader">
  <div class="wrap header-inner">
    <a class="brand" href="/" aria-label="Ordo — home">${WORDMARK}</a>
    <nav class="nav" aria-label="Primary">${links}</nav>
    <a class="btn btn-primary btn-sm header-cta" href="/contact"><span>Discuss your project</span>${ARROW}</a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="mobileMenu" aria-label="Open menu"><span></span><span></span></button>
  </div>
  <div class="mobile-menu" id="mobileMenu" hidden>
    <nav class="wrap" aria-label="Mobile">${links}<a class="btn btn-primary" href="/contact"><span>Discuss your project</span>${ARROW}</a></nav>
  </div>
  <div class="scroll-progress" aria-hidden="true"></div>
</header>`;
}

function footer() {
  return `<footer class="site-footer">
  <div class="wrap footer-grid">
    <div class="footer-brand">
      <a class="brand brand-footer" href="/" aria-label="Ordo — home">${WORDMARK}</a>
      <p>Thoughtful products for meaningful business connections.</p>
      <p class="footer-accent">Made with purpose.</p>
    </div>
    <nav class="footer-col" aria-label="Explore">
      <p class="footer-h">Explore</p>
      <a href="/solutions">Solutions</a>
      ${RANGES.map((r) => `<a href="/collections/${r.slug}">${r.name}</a>`).join('\n      ')}
      <a href="/about">About Ordo</a>
    </nav>
    <nav class="footer-col" aria-label="Ready-made pieces">
      <p class="footer-h">Order ready-made</p>
      <a href="/bagtag">Personalised bag tag</a>
      <a href="/bizcard">Smart business card</a>
      <a href="/cablewinder">Custom cable winder</a>
      <a href="/keychain">KOE alumni keychain</a>
    </nav>
    <div class="footer-col">
      <p class="footer-h">Start a conversation</p>
      <a href="/custom-projects">Custom projects</a>
      <a href="/contact">Discuss your project</a>
      <a href="mailto:${EMAIL}">${EMAIL}</a>
      <a href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener">WhatsApp +60 10-792 4208</a>
    </div>
  </div>
  <div class="wrap footer-base">
    <p>© <span data-year>2026</span> Ordo. Made with purpose.</p>
    <p>Ordo currently uses PLA for 3D printing.</p>
  </div>
</footer>`;
}

// Wrap each word of a [data-split] heading so the rise animation needs no
// client-side DOM rewrite (avoids a flash of text before ordo.js runs).
function splitHeadings(html) {
  return html.replace(/(<h[12][^>]*\sdata-split[^>]*>)([^<]+)(<\/h[12]>)/g, (_, open, text, close) =>
    open + text.trim().split(/\s+/).map((w, i) => `<span class="w"><span style="--d:${i}">${w}</span></span>`).join(' ') + close);
}

function page({ path, title, description, active, body, image = '/img/ordo-og.jpg', jsonld = '' }) {
  const url = SITE + (path === '/' ? '/' : path);
  const ogImage = image.startsWith('http') ? image : SITE + image;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="build" content="${BUILD}">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#f5f1e8">
<link rel="canonical" href="${url}">
<meta property="og:site_name" content="Ordo">
<meta property="og:type" content="website">
<meta property="og:locale" content="en_MY">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${ogImage}">
<link rel="icon" type="image/svg+xml" href="/img/ordo-favicon.svg">
<link rel="icon" type="image/png" sizes="180x180" href="/img/ordo-favicon.png">
<link rel="apple-touch-icon" href="/img/ordo-favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/ordo.css?v=${BUILD}">
<script>document.documentElement.classList.add('js')</script>
<script src="/ordo.js?v=${BUILD}" defer></script>${jsonld ? `\n<script type="application/ld+json">${jsonld}</script>` : ''}
</head>
<body>
${header(active)}
<main id="main">
${splitHeadings(body)}
</main>
${footer()}
</body>
</html>
`;
}

// ─── Shared sections ─────────────────────────────────────────────────────

function processSection({ cta = ['Discuss your project', '/contact'] } = {}) {
  return `<section class="section process" data-theme="teal">
  <div class="wrap">
    ${eyebrow('Collaboration')}
    <h2 class="h2" data-split>From your brief to a purposeful product.</h2>
    <div class="steps" data-steps>
      <svg class="steps-line" viewBox="0 0 1000 24" preserveAspectRatio="none" aria-hidden="true"><path d="M0 12 Q 31 2 62 12 T 125 12 T 187 12 T 250 12 T 312 12 T 375 12 T 437 12 T 500 12 T 562 12 T 625 12 T 687 12 T 750 12 T 812 12 T 875 12 T 937 12 T 1000 12" pathLength="1"/></svg>
      <ol>
        ${STEPS.map(([t, d], i) => `<li style="--i:${i}"><span class="step-dot">${i + 1}</span><h3>${t}</h3><p>${d}</p></li>`).join('\n        ')}
      </ol>
    </div>
    ${cta ? `<div class="process-cta">${btn(cta[0], cta[1], 'light')}</div>` : ''}
  </div>
</section>`;
}

function productCard(pr, { sizes = '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw', vt = true } = {}) {
  const r = rangeBySlug[pr.range];
  return `<li class="pcard" data-range="${pr.range}" data-collections="${pr.collections.join(' ')}" data-applications="${pr.applications.map((a) => appByTitle[a].id).join(' ')}">
  <a href="/product/${pr.slug}">
    <div class="pcard-media" data-print><span class="chip">Concept</span>${img(pr.slug + '-main', pr.alt, { sizes, square: true, vt: vt ? 'p-' + pr.slug : '' })}</div>
    <p class="pcard-range">${r.name}</p>
    <h3>${esc(pr.name)}</h3>
    <p>${esc(pr.summary)}</p>
  </a>
</li>`;
}

function applicationCards(headingLevel = 'h3') {
  return `<ol class="apps">
  ${APPLICATIONS.map((a, i) => `<li class="app">
    <div class="app-media" data-print>${img(a.image[0], a.image[1], { sizes: '(min-width: 900px) 45vw, 100vw' })}</div>
    <div class="app-body">
      <div class="app-head"><${headingLevel}>${a.title}</${headingLevel}><span class="app-num" aria-hidden="true">0${i + 1}</span></div>
      <p>${a.description}</p>
      <div class="app-links">
        ${link('View product ideas', a.id === 'custom-projects' ? '/custom-projects' : `/ranges?application=${a.id}`)}
        ${link('Request a quote', contactHref({ interest: a.interest, message: a.context }), OUT)}
      </div>
    </div>
  </li>`).join('\n  ')}
</ol>`;
}

function enquiryForm({ heading = true } = {}) {
  return `<div class="enquiry" id="enquiry">
  ${heading ? `<div class="enquiry-intro">
    <h2 class="h2" data-split>Let’s make something purposeful.</h2>
    <p class="lede">Tell us what you have in mind. We’d love to explore it with you.</p>
    <ul class="contact-alt">
      <li><a href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener" data-wa>Message us on WhatsApp</a></li>
      <li><a href="mailto:${EMAIL}">${EMAIL}</a></li>
    </ul>
  </div>` : ''}
  <form class="form" id="enquiryForm" novalidate>
    <input type="hidden" name="product">
    <div class="hp" aria-hidden="true"><label>Leave this empty <input name="website" tabindex="-1" autocomplete="off"></label></div>
    <div class="field"><label for="f-name">Name</label><input id="f-name" name="name" autocomplete="name" required></div>
    <div class="field"><label for="f-company">Company or organisation <span class="opt">optional</span></label><input id="f-company" name="company" autocomplete="organization"></div>
    <div class="field"><label for="f-email">Work email</label><input id="f-email" name="email" type="email" autocomplete="email" required></div>
    <div class="field"><label for="f-phone">Phone or WhatsApp <span class="opt">optional</span></label><input id="f-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel"></div>
    <div class="field field-wide"><label for="f-interest">I’m interested in</label>
      <div class="select"><select id="f-interest" name="interest" required><option value="">Choose one</option>${INTERESTS.map((i) => `<option>${i}</option>`).join('')}</select></div></div>
    <div class="field field-wide"><label for="f-message">Message</label><textarea id="f-message" name="message" rows="5" required placeholder="Who is it for, roughly how many pieces, and when do you need them?"></textarea></div>
    <div class="form-foot field-wide">
      <button class="btn btn-primary" type="submit"><span>Send enquiry</span>${ARROW}</button>
      <p class="form-status" role="status" aria-live="polite"></p>
    </div>
  </form>
  <div class="form-done" hidden tabindex="-1">
    <svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24" pathLength="1"/><path d="M15 27l7 7 15-16" pathLength="1"/></svg>
    <h3>Enquiry sent.</h3>
    <p>Thanks — we’ll be in touch at <strong data-done-email></strong>. Your reference is <strong data-done-ref></strong>.</p>
    <button type="button" class="tlink" data-reset><span>Send another enquiry</span>${ARROW}</button>
  </div>
</div>`;
}

// ─── Pages ───────────────────────────────────────────────────────────────

function homePage() {
  const slides = HERO_SLIDES.map((s, i) => {
    const r = rangeBySlug[s.range];
    return `<article class="slide${i === 0 ? ' is-active' : ''}" data-slide="${i}" aria-roledescription="slide" aria-label="${i + 1} of ${HERO_SLIDES.length}: ${r.name}"${i ? ' aria-hidden="true" inert' : ''}>
        <div class="slide-copy">
          ${eyebrow(r.name)}
          <h1 class="hero-title">${s.headline.split(' ').map((w, j) => `<span class="w"><span style="--d:${j}">${w}</span></span>`).join(' ')}</h1>
          <p class="hero-lede">${s.description}</p>
          <div class="hero-actions">${btn(s.primary[0], s.primary[1])}${link(s.secondary[0], s.secondary[1])}</div>
        </div>
        <div class="slide-media"><div class="frame" data-print-hero>${img(r.hero[0], r.hero[1], { eager: i === 0, sizes: '(min-width: 1024px) 50vw, 100vw' })}</div></div>
      </article>`;
  }).join('\n      ');

  const body = `<section class="hero is-initial" aria-roledescription="carousel" aria-label="Ordo product ranges" data-carousel>
  <div class="wrap">
    <div class="slides" aria-live="off">
      ${slides}
    </div>
    <div class="hero-controls">
      <div class="hero-progress" role="group" aria-label="Choose a range">
        ${HERO_SLIDES.map((s, i) => `<button type="button"${i === 0 ? ' aria-current="true"' : ''} aria-label="Show ${rangeBySlug[s.range].name}" data-goto="${i}"><span></span></button>`).join('')}
      </div>
      <div class="hero-buttons">
        <button type="button" class="round" data-prev aria-label="Previous range"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16 10H5m4.5-4.5L5 10l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button type="button" class="round" data-toggle aria-label="Pause rotation"><svg class="i-pause" viewBox="0 0 20 20" aria-hidden="true"><path d="M7.5 5v10M12.5 5v10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><svg class="i-play" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 5l8 5-8 5z" fill="currentColor"/></svg></button>
        <button type="button" class="round" data-next aria-label="Next range">${ARROW}</button>
      </div>
    </div>
  </div>
</section>

<section class="section intro">
  <div class="wrap intro-grid">
    <div>
      ${eyebrow('What Ordo does')}
      <h2 class="h2" data-split>Thoughtful products for meaningful business connections.</h2>
    </div>
    <div class="intro-copy" data-reveal>
      <p class="lede">From NFC-enabled touchpoints to customised gifts and themed collections, we help businesses and organisations bring their ideas into form.</p>
      <div class="actions">${btn('Explore business applications', '/solutions')}${link('Discuss your project', '/contact')}</div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head">
      <div>
        ${eyebrow('Possible applications')}
        <h2 class="h2" data-split>Created for your organisation.</h2>
        <p class="sub">Four ways organisations can work with Ordo, across all three ranges.</p>
      </div>
      ${link('Explore business applications', '/solutions')}
    </div>
    ${applicationCards()}
  </div>
</section>

<section class="section ranges-band" data-theme="teal">
  <div class="wrap">
    ${eyebrow('Product ranges')}
    <h2 class="h2" data-split>Three ranges, one clear purpose.</h2>
    <ul class="range-cards">
      ${RANGES.map((r, i) => `<li class="range-card" style="--i:${i}">
        <a href="/collections/${r.slug}">
          <div class="range-media" data-print>${img(r.card[0], r.card[1], { sizes: '(min-width: 900px) 33vw, 100vw' })}</div>
          <div class="range-body">
            <h3>${r.name}</h3>
            <p class="range-tag">${r.tagline}</p>
            <p>${r.description}</p>
            <span class="tlink"><span>View product ideas</span>${ARROW}</span>
          </div>
        </a>
      </li>`).join('\n      ')}
    </ul>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head">
      <div>
        ${eyebrow('Concept — available for discussion')}
        <h2 class="h2" data-split>Ideas for your next project.</h2>
        <p class="sub">${NOTE}</p>
      </div>
      ${link('View product ideas', '/ranges')}
    </div>
    <ul class="pgrid">
      ${HOME_PRODUCTS.map((s) => productCard(PRODUCTS.find((x) => x.slug === s))).join('\n      ')}
    </ul>
  </div>
</section>

<section class="section made">
  <div class="wrap made-grid">
    <div class="made-media">
      <div class="made-a" data-print>${img('process-layers', 'Hands holding a deep teal 3D-printed form, showing fine print layers.', { square: true, sizes: '(min-width: 900px) 30vw, 70vw' })}</div>
      <div class="made-b" data-print>${img('process-inspection', 'A printed curve being inspected up close on an ivory surface.', { square: true, sizes: '(min-width: 900px) 22vw, 50vw' })}</div>
    </div>
    <div class="made-copy">
      ${eyebrow('Made thoughtfully')}
      <h2 class="h2" data-split>Designed with structure. Printed with care.</h2>
      <p class="lede" data-reveal>Ordo designs and 3D prints each object. We think about material, form and lasting usefulness, and currently print in PLA. Details for each project are confirmed during proposal.</p>
      <div data-reveal>${link('About Ordo', '/about')}</div>
    </div>
  </div>
</section>

${processSection()}`;

  const jsonld = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': SITE + '/#org', name: 'Ordo', alternateName: ['Ordo Studio'], url: SITE + '/',
        logo: SITE + '/img/ordo-wordmark.svg', description: 'Design and making partner for businesses and organisations: NFC-enabled touchpoints, customised gifts and themed collections, 3D printed in Malaysia.',
        areaServed: { '@type': 'Country', name: 'Malaysia' },
        contactPoint: { '@type': 'ContactPoint', email: EMAIL, telephone: '+' + WHATSAPP, contactType: 'sales', areaServed: 'MY', availableLanguage: ['English', 'Malay'] } },
      { '@type': 'WebSite', '@id': SITE + '/#website', url: SITE + '/', name: 'Ordo', publisher: { '@id': SITE + '/#org' } },
    ],
  });

  return page({ path: '/', active: '/', title: 'Ordo — Thoughtful products for meaningful business connections',
    description: 'Ordo is a design and making partner for businesses and organisations in Malaysia: NFC-enabled touchpoints, customised gifts and themed collections, 3D printed with purpose.',
    body, jsonld });
}

function solutionsPage() {
  const body = `<section class="page-hero">
  <div class="wrap">
    ${eyebrow('Solutions')}
    <h1 class="h1" data-split>Created for your organisation.</h1>
    <p class="lede" data-reveal>Possible applications across Ordo Connect, Ordo Life and Ordo Collections. Each can be shaped around your audience and brief.</p>
  </div>
</section>
<section class="section pt-0">
  <div class="wrap">${applicationCards('h2')}</div>
</section>
${processSection({ cta: ['Request a quote', '/contact'] })}`;
  return page({ path: '/solutions', active: '/solutions', title: 'Solutions — Ordo',
    description: 'Corporate gifting, events and campaigns, institutional collections and custom projects — shaped around your audience and brief.', body });
}

function rangesPage() {
  const chip = (group, value, label, on = false) => `<button type="button" class="fchip" data-filter="${group}" data-value="${value}" aria-pressed="${on}"><span class="fdot" aria-hidden="true"></span>${label}</button>`;
  const body = `<section class="page-hero">
  <div class="wrap">
    ${eyebrow('Product ranges')}
    <h1 class="h1" data-split>Product ideas for your brief.</h1>
    <p class="lede" data-reveal>Every idea here is a concept, available for discussion. ${NOTE}</p>
  </div>
</section>
<section class="section pt-0" data-ranges>
  <div class="wrap ranges-layout">
    <div class="filters">
      <div class="fgroup" role="group" aria-labelledby="fl-range"><p class="flabel" id="fl-range">Range</p>
        ${chip('range', '', 'All ranges', true)}${RANGES.map((r) => chip('range', r.slug, r.name)).join('')}
      </div>
      <div class="fgroup" role="group" aria-labelledby="fl-col"><p class="flabel" id="fl-col">Collection</p>
        ${chip('collection', '', 'All collections', true)}${COLLECTIONS.map((c) => chip('collection', c.slug, c.name)).join('')}
      </div>
      <div class="fgroup fgroup-app" role="group" aria-labelledby="fl-app" hidden><p class="flabel" id="fl-app">Application</p>
        ${APPLICATIONS.map((a) => chip('application', a.id, a.title)).join('')}
        <button type="button" class="fclear" data-clear-app>Clear application</button>
      </div>
    </div>
    <div class="ranges-results">
      <p class="fcount" aria-live="polite"><span data-count>${PRODUCTS.length}</span> product ideas</p>
      <ul class="pgrid pgrid-3" data-grid>
        ${PRODUCTS.map((pr) => productCard(pr, { sizes: '(min-width: 1024px) 28vw, (min-width: 640px) 33vw, 50vw' })).join('\n        ')}
      </ul>
      <div class="empty" data-empty hidden>
        <h2>No ideas match those filters yet.</h2>
        <p>That might be the start of a custom project. Clear the filters or tell us what you have in mind.</p>
        <div class="actions"><button type="button" class="btn btn-ghost" data-clear-all><span>Clear filters</span></button>${btn('Discuss a custom brief', contactHref({ interest: 'Custom project' }))}</div>
      </div>
    </div>
  </div>
</section>`;
  return page({ path: '/ranges', active: '/ranges', title: 'Product ideas — Ordo',
    description: 'Browse Ordo concepts across Ordo Connect, Ordo Life and Ordo Collections: NFC keychains and cards, desk objects, keepsakes and themed collections.', body });
}

function collectionPage(r) {
  const items = PRODUCTS.filter((x) => x.range === r.slug);
  const subs = r.slug === 'ordo-collections' ? `<section class="section pt-0">
  <div class="wrap">
    <ul class="subcols">
      ${COLLECTIONS.map((c, i) => `<li style="--i:${i}"><a href="/ranges?collection=${c.slug}"><h2>${c.name}</h2><p>${c.description}</p><span class="tlink"><span>See ideas</span>${ARROW}</span></a></li>`).join('\n      ')}
    </ul>
  </div>
</section>` : '';
  const body = `<section class="col-hero">
  <div class="wrap col-hero-grid">
    <div>
      ${eyebrow(r.name)}
      <h1 class="h1" data-split>${r.tagline}</h1>
      <p class="lede" data-reveal>${r.description}</p>
      <div class="actions" data-reveal>${btn('Discuss your project', contactHref({ interest: r.name }))}${link('All product ideas', '/ranges')}</div>
    </div>
    <div class="frame" data-print-hero>${img(r.hero[0], r.hero[1], { eager: true, vt: 'r-' + r.slug })}</div>
  </div>
</section>
${subs}
<section class="section">
  <div class="wrap">
    <div class="section-head">
      <div>
        ${eyebrow('Concept — available for discussion')}
        <h2 class="h2" data-split>Product ideas</h2>
        <p class="sub">${NOTE}</p>
      </div>
      ${link('View all product ideas', `/ranges?range=${r.slug}`)}
    </div>
    <ul class="pgrid">
      ${items.map((pr) => productCard(pr)).join('\n      ')}
    </ul>
  </div>
</section>
<section class="section cta-band" data-theme="teal">
  <div class="wrap cta-band-inner">
    <h2 class="h2" data-split>Have a brief for ${r.name}?</h2>
    ${btn('Discuss your project', contactHref({ interest: r.name }), 'light')}
  </div>
</section>`;
  return page({ path: `/collections/${r.slug}`, active: '/ranges', title: `${r.name} — ${r.tagline.replace(/\.$/, '')} | Ordo`,
    description: r.description, body, image: `/img/ordo/${r.hero[0]}-1200.webp` });
}

function productPage(pr) {
  const r = rangeBySlug[pr.range];
  const views = [['main', 'Concept view'], ['detail', 'Detail view'], ['use', 'In context']];
  const accordions = [
    pr.nfc && ['What tapping does and setup', pr.nfc],
    ['Materials and dimensions', MATERIALS],
    ['Care', CARE],
    ['Customisation', CUSTOM],
  ].filter(Boolean);
  const related = PRODUCTS.filter((x) => x.range === pr.range && x.slug !== pr.slug).slice(0, 3);
  const body = `<section class="product">
  <div class="wrap product-grid">
    <div class="gallery" data-gallery>
      <div class="gallery-main">
        <span class="chip">Concept</span>
        ${views.map(([v, label], i) => img(`${pr.slug}-${v}`, `${pr.alt} ${label}.`, { square: true, eager: i === 0, sizes: '(min-width: 1024px) 50vw, 100vw', cls: i === 0 ? 'is-active' : '', vt: i === 0 ? 'p-' + pr.slug : '' })).join('\n        ')}
      </div>
      <div class="thumbs" role="group" aria-label="Choose a view">
        ${views.map(([v, label], i) => `<button type="button" aria-pressed="${i === 0}" data-view="${i}"><img src="/img/ordo/${pr.slug}-${v}-640.webp" width="640" height="640" alt="" loading="lazy" decoding="async"><span>${label}</span></button>`).join('\n        ')}
      </div>
    </div>
    <div class="product-info">
      <p class="eyebrow-link"><a href="/collections/${r.slug}">${r.name}</a></p>
      <h1 class="h1 h1-product" data-split>${esc(pr.name)}</h1>
      <p class="status"><span class="status-dot" aria-hidden="true"></span>Concept — available for discussion.</p>
      <p class="lede" data-reveal>${pr.description}</p>
      <p class="note" data-reveal>${pr.note || NOTE}</p>
      <div class="apps-tags" data-reveal>
        <h2 class="mini-h">Possible business applications</h2>
        <ul>${pr.applications.map((a) => `<li><a href="${appByTitle[a].id === 'custom-projects' ? '/custom-projects' : '/ranges?application=' + appByTitle[a].id}">${a}</a></li>`).join('')}</ul>
      </div>
      <div class="acc" data-reveal>
        ${accordions.map(([t, d], i) => `<details${i === 0 ? ' open' : ''}><summary>${t}<span class="acc-icon" aria-hidden="true"></span></summary><div class="acc-body"><p>${d}</p></div></details>`).join('\n        ')}
      </div>
      <div class="actions" data-reveal>
        ${btn('Request a quote for this product', contactHref({ interest: r.name, product: pr.name, message: `I’d like a quote for the ${pr.name}.` }))}
        ${link('Back to product ideas', '/ranges')}
      </div>
    </div>
  </div>
</section>
${related.length ? `<section class="section">
  <div class="wrap">
    <div class="section-head"><div>${eyebrow('More from ' + r.name)}<h2 class="h2" data-split>Related ideas</h2></div>${link('Explore ' + r.name, '/collections/' + r.slug)}</div>
    <ul class="pgrid pgrid-3">
      ${related.map((x) => productCard(x, { sizes: '(min-width: 900px) 33vw, 50vw' })).join('\n      ')}
    </ul>
  </div>
</section>` : ''}`;
  const jsonld = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: pr.name, description: pr.description,
    image: `${SITE}/img/ordo/${pr.slug}-main-1200.webp`, brand: { '@type': 'Brand', name: 'Ordo' }, category: r.name });
  return page({ path: `/product/${pr.slug}`, active: '/ranges', title: `${pr.name} — ${r.name} | Ordo`,
    description: `${pr.summary} ${pr.description}`, body, image: `/img/ordo/${pr.slug}-main-1200.webp`, jsonld });
}

function customPage() {
  const body = `<section class="page-hero">
  <div class="wrap narrow-split">
    <div>
      ${eyebrow('Custom projects')}
      <h1 class="h1" data-split>Objects developed around your brief.</h1>
    </div>
    <div data-reveal>
      <p class="lede">Have a specific audience, occasion or purpose in mind? Share the brief and we will explore the product direction with you.</p>
      <p class="note">Agreement on design, specifications, pricing and delivery comes at the proposal stage. Samples or prototypes are not assumed to be free or included.</p>
    </div>
  </div>
</section>
<section class="section pt-0">
  <div class="wrap">${enquiryForm()}</div>
</section>
${processSection({ cta: null })}`;
  return page({ path: '/custom-projects', active: '/custom-projects', title: 'Custom projects — Ordo',
    description: 'Objects developed around your brief. Share your audience, occasion or purpose and Ordo will explore the product direction with you.', body });
}

function aboutPage() {
  const values = [
    ['Structure', 'A clear brief, organised into a form that makes sense.'],
    ['Precision', 'Care in the details, from first sketch to each iteration.'],
    ['Purpose', 'Objects made for a reason, and for the people who will use them.'],
  ];
  const body = `<section class="page-hero">
  <div class="wrap">
    ${eyebrow('About Ordo')}
    <h1 class="h1" data-split>A design and making partner.</h1>
    <p class="lede" data-reveal>Ordo creates purposeful physical products through thoughtful design and 3D printing, for businesses and organisations.</p>
  </div>
</section>
<section class="section pt-0">
  <div class="wrap about-grid">
    <figure class="about-figure">
      <div class="frame" data-print>${img('process-workshop', 'An illustrative design studio scene with sketches, printed prototypes and a 3D printer.', { sizes: '(min-width: 900px) 55vw, 100vw' })}</div>
      <figcaption>Illustrative workshop scene, not a photograph of Ordo’s premises.</figcaption>
    </figure>
    <div class="about-copy" data-reveal>
      <p class="lede">From NFC-enabled touchpoints to customised gifts and themed collections, we help businesses and organisations bring their ideas into form.</p>
      <p>We start with the practical question: what should this object do, and for whom? From there we explore form, detail and customisation together with you.</p>
      <p>Ordo currently uses PLA. We aim for careful material choices, efficient production and lasting usefulness, and we confirm material details for each project.</p>
      ${btn('Discuss your project', '/contact')}
    </div>
  </div>
</section>
<section class="section pt-0">
  <div class="wrap">
    <ul class="values">
      ${values.map(([t, d], i) => `<li style="--i:${i}"><span class="value-mark" aria-hidden="true"></span><h2>${t}</h2><p>${d}</p></li>`).join('\n      ')}
    </ul>
  </div>
</section>
${processSection()}`;
  return page({ path: '/about', active: '/about', title: 'About Ordo — A design and making partner',
    description: 'Ordo creates purposeful physical products through thoughtful design and 3D printing, for businesses and organisations in Malaysia.', body });
}

function contactPage() {
  const body = `<section class="page-hero">
  <div class="wrap">
    ${eyebrow('Contact')}
    <h1 class="h1" data-split>Let’s make something purposeful.</h1>
  </div>
</section>
<section class="section pt-0">
  <div class="wrap contact-grid">
    <div class="contact-side" data-reveal>
      <p class="lede">Tell us what you have in mind. We’d love to explore it with you.</p>
      <dl class="contact-list">
        <div><dt>WhatsApp</dt><dd><a href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener" data-wa>+60 10-792 4208</a></dd></div>
        <div><dt>Email</dt><dd><a href="mailto:${EMAIL}">${EMAIL}</a></dd></div>
        <div><dt>Studio</dt><dd>Kuala Lumpur, Malaysia</dd></div>
      </dl>
      <p class="note">Pricing, specifications and delivery are agreed at the proposal stage, once we understand your brief.</p>
    </div>
    ${enquiryForm({ heading: false })}
  </div>
</section>`;
  return page({ path: '/contact', active: '/contact', title: 'Contact — Ordo',
    description: 'Tell Ordo what you have in mind: NFC touchpoints, corporate gifts, themed collections or a custom brief.', body });
}

// ─── Write ───────────────────────────────────────────────────────────────

function out(rel, html) {
  const file = join(ROOT, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  console.log('wrote', rel);
}

out('index.html', homePage());
out('solutions.html', solutionsPage());
out('ranges.html', rangesPage());
out('custom-projects.html', customPage());
out('about.html', aboutPage());
out('contact.html', contactPage());
RANGES.forEach((r) => out(`collections/${r.slug}.html`, collectionPage(r)));
PRODUCTS.forEach((pr) => out(`product/${pr.slug}.html`, productPage(pr)));

const urls = ['/', '/solutions', '/ranges', '/custom-projects', '/about', '/contact',
  ...RANGES.map((r) => `/collections/${r.slug}`), ...PRODUCTS.map((pr) => `/product/${pr.slug}`),
  '/bagtag', '/bizcard', '/cablewinder', '/keychain'];
out('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}
</urlset>
`);
