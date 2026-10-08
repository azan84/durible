# Changelog

## [ordo-v4] — 2026-10-08 · material atelier redesign

Visual redesign of the homepage and shared stylesheet. Made with Claude
Code, with design critiques and code review from Codex CLI and
Antigravity (agy).

### Changed

- **New palette and type** — basalt base, unbleached-PLA ink, husk green
  for interaction, durian-fibre ochre reserved for Durible. Bricolage
  Grotesque (display), Hanken Grotesk (body), JetBrains Mono (specs).
  Light theme retuned for WCAG AA contrast.
- **Signature hero motion** — headline and product video "print"
  themselves in 14 stepped 0.2 mm layers with a nozzle line and live
  layer/Z readout. Runs once; disabled under reduced motion.
- **Ordo Lab moved up** after Pillars, with a four-step husk → fibre →
  filament → object process strip.
- Sentence-case labels, no italic accent words, quieter scroll reveals
  (gated on JS so content never stays hidden).
- Product pages pick up the new fonts and honour the saved theme.

### Fixed

- Shop filter chips did nothing (markup used `data-filter`, JS expected
  `data-filter-pillar`). Now single-select toggle buttons with arrow-key
  navigation, plus an empty state for commission-only families.
- Pillar "Browse" links now open the shop filtered to that family.
- Hero video gets a pause control (WCAG 2.2.2); paused by default
  under reduced motion.
- PDP sticky CTA is now inert and hidden from assistive tech while
  off-screen.

## [ordo-v3] — 2026-04-21 · brand and pillars

User-visible rebrand from "Durible3D" to **Ordo**. "Durible" is retired as
a company name and reintroduced as the name of the in-development
durian-skin + PLA biocomposite filament. Infrastructure identifiers
(Cloudflare Pages project `durible`, D1 `durible-orders`, R2
`durible-uploads`, order ID prefix `DUR-`, wrangler bindings) are
unchanged.

### Added

- **Four-pillar organisation on the homepage** — Ordo-Link, Ordo-Office,
  Ordo-Honor, Ordo-Life. Each existing product is grouped under a pillar
  header. Ordo-Life shows a single "Coming soon · 3D Ultrasound Art"
  placeholder card in muted styling.
- **Dimensional filter chips** — pillar and type dimensions are
  OR-combinable within a dimension, AND-combinable across. Pillar
  sections hide when no cards inside match.
- **"How it works"** section (Consult → Design → Print → Deliver).
- **"Portfolio"** strip — 3 past-work images with editorial captions.
  Uses existing product photography; `TODO(azan):` marker to swap for
  real client shots.
- **"The Ordo Lab — Durible"** section — introduces the filament, a
  clearly labelled *R&D · Pilot phase* pill, and a pilot-partner
  application form posting to the new `/api/pilot` endpoint.
- **Sustainability footer band** — claim-free copy and three
  Lucide-style icons (Recyclable PLA · Printed in KL · Made to order).
  No CO2e or kg-of-plastic numbers until measured data exists.
- **`pilot_leads` D1 table** — distinct from `orders`. ID format
  `PLT-YYMMDD-XXXX`. Status enum: `new | contacted | piloting | closed`.
- **`/api/pilot`** Pages Function — validates, inserts, fires a CallMeBot
  WhatsApp notification via `buildPilotMessage` in `_lib/whatsapp.js`.
- **`/admin/pilots`** dashboard — pilot-lead table, auto-save status
  dropdown, CSV export at `/admin/pilots-export`, notes expander.
- **Cross-link in `/admin` topbar** between Orders and Pilot leads.
- **PDP pillar metadata** — small Fraunces-italic eyebrow above each
  PDP title (e.g. *"Ordo-Link · NFC-enabled connectivity"*).
- **`data-form-type` attribute** on forms — `"order"` for PDPs,
  `"pilot"` for the homepage lab form. `form.js` routes to the correct
  endpoint based on this attribute.

### Changed

- Build marker bumped from `redesign-v2` → `ordo-v3` on every HTML page.
- Cache-bust query on `style.css` / `form.js` / `interactions.js` bumped
  from `?v=redesignv2-qr` → `?v=ordo-v3`.
- All `<title>` tags, meta descriptions, OG / Twitter metadata, JSON-LD
  `Organization.name` / `LocalBusiness.name` / `WebSite.name` updated to
  **Ordo** (or **Ordo3D Studio** as the longer form).
- Footer wordmark: "Durible" → "Ordo". Footer copyright: "Durible3D
  Studio" → "Ordo".
- WhatsApp pre-filled message text:
  *"Hello, I am interested with Durible 3D product"* →
  *"Hello, I'm interested in an Ordo product."*
- Hero subtitle reframed as a 3D printing studio on the IIUM Gombak
  campus.
- Admin dashboard title "DURIBLE3D ADMIN" → "ORDO ADMIN".
- Receipt header "DURIBLE3D STUDIO" → "ORDO3D STUDIO".
- Story section opening "Durible began inside a workshop..." →
  "Ordo began inside a workshop...".

### Kept (unchanged)

- `functions/api/orders.js` validation and persistence flow.
- D1 `orders` + `order_items` schema and all column names.
- R2 bindings and object-key prefixes (`payments/`, `avatars/`,
  `logos/`).
- Order ID format `DUR-YYMMDD-XXXX`.
- DuitNow QR + payment-slip upload payment flow (no Stripe / PayPal).
- Prices (RM 20 × 3 + RM 40 × 1, RM 5 flat shipping).
- `Durible_logo.png` filename (alt text updated to "Ordo logo").
- Wrangler config, Pages project name, D1 database name, R2 bucket
  name.

### Known `TODO(azan):` items (existing and new)

- Proof band counters remain placeholders — swap for real data once
  there's something honest to publish.
- Story section copy remains a placeholder founder narrative.
- Portfolio images are currently product photography — replace with
  real past-work photos when provided.
- Sustainability band will grow measured figures once pilot data
  exists.
- Footer secondary pages (Care guide / Shipping / Returns / FAQs /
  Trade &amp; wholesale) still `#` placeholders.
- Social media URLs (Instagram, Facebook) still `#` placeholders.

### Explicitly not included in this release

- No AI prompt-to-3D customiser.
- No decentralised printer network / "Ordo Grid".
- No Stripe / PayPal / e-commerce checkout — DuitNow QR flow remains.
- No separate pillar landing pages (`/ordo-link.html`, etc.).
- No CO2e / carbon / kg-of-plastic claims anywhere on the site.
- No fictional client testimonials or logos.

---

## [redesign-v2] — 2026-04-18

Full editorial rebrand of the storefront. The backend (Pages Functions,
D1 schema, R2 bucket, admin dashboard) is unchanged — all changes are
to the public marketing pages.

### Added

- **Design token system** (`:root` custom properties) for color,
  spacing, type scale, radii, shadows, motion.
- **Typography upgrade** — Fraunces (variable serif) for display,
  Inter for body, JetBrains Mono for prices & SKUs. Loaded with
  preconnect + `display=swap`.
- **Landing page (`index.html`)** rebuilt from scratch:
  - Editorial hero with italic-accent headline and cursor parallax
    (desktop only, fine-pointer only, reduced-motion gated)
  - 4-up meta bar (material / shipping / lead time / printed)
  - Count-up proof band (placeholder metrics — flagged `TODO(azan)`)
  - 4-col product grid with skeleton shimmer, hover zoom, quick-add
    slide-up, wishlist heart with pop animation
  - Category filter chips
  - Dark story section with per-word staggered reveal and subtle
    scroll parallax background
  - 4-col dark footer with shop / studio / support columns and
    Lucide-style social icons
- **Product pages** (keychain / bizcard / cablewinder / bagtag):
  - Sticky left gallery + right info column on desktop
  - Italic-accent title, monospace price, feature list with gold
    markers
  - Accessible accordion for Materials / Shipping / Care
  - Sticky bottom CTA bar reveals when above-the-fold CTA scrolls
    out of view
  - "You may also like" strip
- **Wishlist drawer** — saves products to localStorage, slides in
  from the right with frosted backdrop, has empty state, per-item
  remove, badge bounce on add
- **Mobile nav drawer** with staggered link reveals
- **Scroll-reveal animation system** via IntersectionObserver +
  `[data-stagger]` attributes
- **Build marker** `<meta name="build" content="redesign-v2">` on
  every page for live-deploy verification
- **Product JSON-LD** schema on each PDP (for Google Shopping)
- **Per-page OG tags** with canonical URLs
- **Accessibility**: all motion honours `prefers-reduced-motion`,
  focus-visible uses gold ring, drawers trap focus via ARIA,
  buttons have `aria-label` / `aria-pressed`, `role="dialog"` +
  `aria-modal`

### Changed

- Product form copy ("Submit order" instead of SCREAMING CAPS,
  placeholder phone format localised to Malaysia)
- `form.js` submit button label changed to sentence case to match
  editorial tone

### Kept (unchanged)

- `functions/api/orders.js` — order API endpoint
- `functions/admin/**` — admin dashboard + CSV export + receipts
- `schema.sql` — D1 tables
- `wrangler.toml` — bindings
- Payment slip upload, D1 insert, R2 upload flow
- Prices (RM 20 / RM 20 / RM 20 / RM 40) and shipping (RM 5)
- Product images

### Known `TODO(azan):` items

- Proof band counters are placeholder values — swap for real data
  once there's something honest to publish
- Story section copy is editorial placeholder — replace with the
  real founder's narrative when ready
- Footer "Care guide", "Shipping", "Returns", "FAQs", "Trade
  & wholesale" pages don't exist yet — linked as `#` placeholders
- Instagram / Facebook / WhatsApp social links in the footer are
  placeholders (`#`) — swap for real URLs
- Future work: hosted vCard page at `/v/{slug}` for the business
  card product (mentioned in bizcard PDP copy)
