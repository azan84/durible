# ordo.earth — Site Overview

A detailed reference for the Durible3D storefront at **https://ordo.earth/** (alias: `durible.biomechemical.com`, 301-redirected).

---

## 1. The business

**Durible3D** is a 3D-printing studio operated  at **International Islamic University Malaysia (IIUM)**, based on the Gombak campus. 

**Product focus**: custom, made-to-order lifestyle objects printed in recyclable PLA filament:

| Product | Price | Shipping | Customer personalisation |
|---|---|---|---|
| **Personalised KOE Alumni Keychain** | RM 20 / unit | RM 5 (West MY) | Per-keychain department + batch/matric engraving + avatar (male/female preset or custom upload) |
| **3D Printed Smart Business Card** | RM 40 / unit | RM 5 (West MY) | Embedded NFC + printed QR code → hosted virtual vCard |
| **Custom Cable Winder** | RM 20 / unit | RM 5 (West MY) | Your logo printed on the face (multi-colour FDM) |
| **Personalised Bag Tag** | RM 20 / unit | RM 5 (West MY) | Name + phone number embedded in the print |

All orders are printed to order on campus in 3–7 working days.

---

## 2. Architecture at a glance

```
           ┌──────────────────────────────────────────────────────────┐
           │                    Cloudflare global edge                │
           │  ┌─────────────────────────────────────────────────────┐ │
Browser ───┼─►│         ordo.earth  +  www.ordo.earth              │ │
           │  │         (durible.biomechemical.com → 301)          │ │
           │  └─────────────────────────────────────────────────────┘ │
           │                          │                               │
           │               ┌──────────┴──────────┐                    │
           │               │                     │                    │
           │         Static assets          Pages Functions           │
           │      (HTML/CSS/JS/images)          (Workers)             │
           │               │                     │                    │
           │               │                     ├─► D1 database      │
           │               │                     │   (durible-orders) │
           │               │                     │                    │
           │               │                     ├─► R2 bucket        │
           │               │                     │   (durible-uploads)│
           │               │                     │                    │
           │               │                     └─► CallMeBot        │
           │               │                         (WhatsApp API)   │
           │               │                                          │
           └───────────────┼──────────────────────────────────────────┘
                           │
                           └─► Google Fonts (preconnected, lazy-loaded)
```

### Hosting stack

| Layer | Service | Purpose |
|---|---|---|
| Static site + Functions | **Cloudflare Pages**, project `durible` (on `azan.sapardi@gmail.com`) | Serves every page and API route from the global edge |
| SQL database | **Cloudflare D1**, `durible-orders` | `orders` + `order_items` tables — every submission stored here |
| File storage | **Cloudflare R2**, `durible-uploads` | Payment slips, custom avatars, customer logos |
| DNS zone | **Cloudflare DNS** (`azan.sapardi@gmail.com`) | `ordo.earth` and `www.ordo.earth` routed to the Pages project |
| Legacy DNS | `biomechemical.com` on `Azanthinkstation@gmail.com` | `durible.biomechemical.com` 301-redirects to `ordo.earth` via Cloudflare Redirect Rule |
| Registrar | GoDaddy | Domain ownership; nameservers delegate to Cloudflare |

### Deploy surface

- **Production branch**: `main` on `github.com/azan84/durible`
- **Deploy command**: `wrangler pages deploy . --project-name=durible --branch=main --commit-dirty=true`
- **Build marker** on every HTML page: `<meta name="build" content="redesign-v2">` — grep for this on the live site to confirm a deploy landed

---

## 3. Public pages

### `/` — Landing

The editorial homepage. Five distinct sections:

1. **Sticky navigation** — frosted-glass backdrop (16px blur + 180% saturation) over warm off-white. Durible wordmark left, nav links centred (Home / Shop / Our story / Contact), wishlist heart with an animated count badge that bounces on add.
2. **Hero** — a Fraunces serif headline (*"Objects made to last."* with the italic emphasis word in oxblood), cursor-reactive parallax on the product image and three floating decorative SVG shapes (circle, diamond, square) at three different depths. A 4-column meta bar under the hero listing Material / Printed / Shipping / Lead time. All motion is disabled under `prefers-reduced-motion` and on coarse-pointer devices.
3. **Proof band** — four IntersectionObserver-triggered count-up numbers on a sunk background (objects printed, on-time %, product families, recyclable PLA %). Gold accent rules, JetBrains Mono digits. *Note: current values are editorial placeholders flagged* `TODO(azan):` *in source — swap when real figures exist.*
4. **Product grid** — 4 cards at desktop / 2 at tablet / 1 at mobile. Each card: skeleton shimmer during image load, hover zoom (scale 1.035), quick-add slide-up CTA, wishlist heart (`localStorage`-backed). Category filter chips above the grid (All / Keychains / Cards / Cable winders / Bag tags).
5. **Story section** — full-bleed dark block with subtle scroll-linked background parallax. Headline is Fraunces, italic emphasis in warm gold, revealed one word at a time with staggered 60ms delays as the block enters the viewport.
6. **Footer** — 4-column grid (brand + socials, Shop, Studio, Support). Instagram, Facebook, WhatsApp icons in Lucide line style; WhatsApp link opens `wa.me/60107924208` with a pre-filled *"Hello, I am interested with Durible 3D product"* message.

### `/keychain.html` · `/bizcard.html` · `/cablewinder.html` · `/bagtag.html` — Product detail pages

Consistent PDP template across the four:

- **Sticky gallery** on the left (desktop), **scrolling info** on the right. Hero image uses `fetchpriority="high"` for LCP.
- Fraunces serif **title** with italic accent on the key word
- **Monospace price** in JetBrains Mono, subline showing per-unit + shipping
- Rich **description** with inline `<strong>` for keyword emphasis
- **Feature list** with gold bullet markers (4–5 feature points per product)
- Primary **CTA button** ("Customise yours" / "Design my card" / "Upload my logo" / "Personalise mine")
- **Accessible accordion** for Materials / Shipping / Care content (smooth max-height animation, rotating chevron, `aria-expanded` state)
- **Sticky bottom CTA bar** that slides up from the viewport edge when the above-the-fold CTA scrolls out of view
- **Order form** section — product-specific fields (see section 4), dynamic total calculation, QR payment block, payment slip upload
- **"You may also like"** strip — the other three products as mini-cards
- **Related footer** — same as homepage

### `/admin` — Order dashboard (HTTP Basic Auth)

Password-gated operator view:

- Topbar with order count, filtered revenue, status breakdown badges
- Filter chips: status (pending / confirmed / shipped / cancelled) × product type
- Orders table: Order ID + timestamp, Product, Buyer, Contact, Qty, Shipping, Total, **auto-save status dropdown**, expandable Details row (shows per-keychain data for keychain orders, company address for bizcard, logo key for cablewinder, plus the payment slip link), and a **🧾 RECEIPT** button that opens a print-ready receipt in a new tab
- **📥 Export CSV** button — downloads a UTF-8 BOM CSV of all filtered orders
- **🖨 Print / Save as PDF** button — expands every row's Details and opens the browser print dialog, with `@media print` rules styling for A4 landscape
- **📱 Test WhatsApp** button — fires a test CallMeBot message

### `/admin/receipt?id=DUR-XXX` — Per-order receipt

Editorial-looking printable receipt with Durible3D branding, bill-to block, delivery block, line-itemised products (one row per keychain in the keychain case), subtotal / shipping / total box, notes, and the payment slip reference. Print-optimised for A4.

### `/admin/export` — CSV download

Streams all filtered orders as CSV with columns for order ID, date, product, buyer, phone, email, quantity, shipping, mailing address, prices, status, notes, a flattened details column (keychain items pipe-separated, bizcard company address, cablewinder logo key), and R2 keys for the slip and logo.

### `/admin/slip?key=payments/DUR-XXX.jpg`

Authenticated R2 file viewer — streams the payment slip (or custom avatar, or logo) for an order. Only keys under `payments/`, `avatars/`, `logos/` are allowed; `..` paths blocked.

### `/admin/whatsapp-test`

Sends a test CallMeBot message and reports whether the secrets are wired up. Useful for verifying setup after changing the phone or API key.

### `/admin/status` (POST)

Handles the auto-saving status dropdown updates from the dashboard. Validates the status enum, updates the D1 row, redirects back with a flash parameter.

---

## 4. Order flow (end to end)

### Buyer's side

1. Lands on any product page (say `/keychain`)
2. Fills the form — buyer details + per-product fields (see below)
3. Form shows a **"Step 2 · Make payment"** block with the DuitNow QR code and the exact RM total in a monospace black pill that updates live as quantity and shipping change
4. After transferring, uploads a screenshot of the receipt
5. Clicks **Submit order** → JS (`form.js`) validates, builds a multipart `FormData`, POSTs to `/api/orders`
6. Sees a green success banner: *"Order received! Reference: DUR-260419-XXXX"*

### Pages Function side (`functions/api/orders.js`)

1. Parses multipart body, validates product type (`keychain` | `bizcard` | `cablewinder` | `bagtag`)
2. Validates buyer fields + product-specific fields (see table below)
3. Generates an `order_id` in the format `DUR-YYMMDD-XXXX`
4. Uploads files to R2:
   - Payment slip → `payments/{order_id}.{ext}`
   - Cable-winder logo → `logos/{order_id}.{ext}`
   - Per-keychain custom avatars → `avatars/{order_id}_item{N}.{ext}`
5. Inserts one row into `orders` + N rows into `order_items` (for keychain orders) atomically via `env.DB.batch([...])`
6. Returns `{ ok: true, order_id, total_amount }` to the browser
7. **Fires a WhatsApp notification** via CallMeBot in the background (`ctx.waitUntil` when available). Failures are swallowed — a down Telegram/WhatsApp must never break a successful order

### Product-specific form fields

| Product | Collected |
|---|---|
| Keychain | full_name, email, contact_number, qty (1–10). Then for each keychain: department (ECE/MEC/MCT/BTE/MME/CIVE/Do not include), engraving_value (batch/matric text), avatar_choice (male/female/custom), optional custom avatar image |
| Bizcard | full_name, contact_number, email, company_address, qty |
| Cablewinder | full_name, contact_number, email (opt), **logo_file** (image upload), qty |
| Bagtag | full_name (name on tag), contact_number (phone on tag), email (opt), qty |

Common fields across all four: `shipping_method` (`collect` | `standard`), conditional `mailing_address` (required when standard), `notes`, `payment_slip` (required, image or PDF, max 10 MB).

### WhatsApp notification

A plain-text message (no markdown) sent to `+60 10-792 4208` via CallMeBot with:

- Order ID, product name, quantity
- Total with breakdown `(qty × unit + shipping)`
- Buyer name, phone, email
- Delivery method + full address if shipping
- Product-specific detail:
  - Keychain: numbered list of each keychain's dept / engraving / avatar choice
  - Bizcard: company address
  - Cablewinder: logo file R2 key
- Notes (if any)
- Payment slip R2 key
- Tappable URLs to `/admin/receipt?id=...` and `/admin`

---

## 5. Database schema

Two tables in the `durible-orders` D1 database:

### `orders` (one row per transaction)

| Column | Type | Purpose |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | |
| `order_id` | TEXT UNIQUE | `DUR-YYMMDD-XXXX` |
| `product_type` | TEXT | `keychain` \| `bizcard` \| `cablewinder` \| `bagtag` |
| `product_name` | TEXT | Human-readable product name |
| `full_name` | TEXT | Buyer |
| `email` | TEXT | Buyer (nullable for simple products) |
| `contact_number` | TEXT | Buyer phone |
| `quantity` | INTEGER | |
| `shipping_method` | TEXT | `collect` \| `standard` |
| `mailing_address` | TEXT | Nullable |
| `notes` | TEXT | Nullable |
| `payment_slip_key` | TEXT | R2 object key |
| `logo_key` | TEXT | R2 key (cable winder only) |
| `unit_price` | REAL | |
| `shipping_cost` | REAL | |
| `total_amount` | REAL | |
| `status` | TEXT | `pending` \| `confirmed` \| `shipped` \| `cancelled` |
| `details_json` | TEXT | Product-specific extras (company_address for bizcard) |
| `created_at` | TEXT | ISO 8601 |

Indexes on `created_at`, `status`, `email`, `product_type`.

### `order_items` (one row per keychain within a keychain order)

| Column | Type | Purpose |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | |
| `order_id` | TEXT | FK → `orders.order_id` |
| `item_index` | INTEGER | 0..quantity-1 |
| `department` | TEXT | ECE / MEC / MCT / BTE / MME / CIVE / Do not include |
| `engraving_value` | TEXT | Free-text, either batch or matric |
| `avatar_choice` | TEXT | `male` \| `female` \| `custom` |
| `avatar_key` | TEXT | R2 key if custom |

Populated only for `product_type = 'keychain'`.

---

## 6. Design system

### Palette

Oxblood-warm-off-white-gold. Deliberate editorial restraint, no SaaS gradients.

| Token | Value | Role |
|---|---|---|
| `--bg` | `#faf8f4` | Warm off-white page background |
| `--bg-elev` | `#ffffff` | Cards, elevated surfaces |
| `--bg-sunk` | `#f3ede0` | Sunk backgrounds (proof band, total box) |
| `--ink` | `#1a1a1a` | Primary text |
| `--ink-muted` | `#5a5248` | Secondary text |
| `--line` | `#e8e1d3` | Hairline borders |
| `--primary` | `#8b3a2f` | Oxblood — headline accents, CTAs, price hovers |
| `--gold` | `#c99a5b` | Focus rings, bullet markers, sold badges |
| `--forest` | `#2d4a3a` | Reserved secondary accent |

### Typography

| Role | Family | Weight | Spacing |
|---|---|---|---|
| Display / headlines / product names | **Fraunces** (variable) | 400 with optical-size axis animation | Tight, -0.025em |
| Body / nav | **Inter** | 400 / 500 | -0.01em |
| Prices, numbers, SKUs, code | **JetBrains Mono** | 500 | Mono, -0.01em |

Type scale uses the 1.25 ratio from 12 → 96 px. Line-height 1.6 for body, 1.05 for display.

### Motion tokens

- Standard easing: `cubic-bezier(0.16, 1, 0.3, 1)` (the out-expo that feels premium)
- Durations: 120 ms (tap feedback) / 240 ms (standard transition) / 400 ms (cards, hero) / 700 ms (scroll reveals)
- **Every animation is gated by `@media (prefers-reduced-motion: no-preference)`** — the site is usable (and graceful) with all motion disabled
- Cursor-reactive parallax only activates under `(hover: hover) and (pointer: fine)` — never on touch

---

## 7. SEO surface

### Per-page metadata (on every HTML file)

- `<title>` — keyword-rich, ≤ 60 chars, always ends in *"| Durible3D"*
- `<meta name="description">` — 150-160 char sales-oriented summary
- `<meta name="keywords">` — curated query list per page
- `<meta name="robots">` — `index, follow, max-image-preview:large, max-snippet:-1`
- `<meta name="googlebot">`, `<meta name="bingbot">`
- `<meta name="author">`, `<meta name="publisher">`
- **Geo tags** — `geo.region=MY-10`, `geo.placename=Kuala Lumpur, Malaysia`, `geo.position`, `ICBM`
- **Open Graph** — `og:site_name`, `og:locale=en_MY`, `og:type`, `og:url`, `og:title`, `og:description`, `og:image` (1200×630), `og:image:alt`
- **Twitter** — `twitter:card=summary_large_image`, title/description/image
- **Product-specific OG** — `product:price:amount`, `product:price:currency=MYR` on PDPs
- `<link rel="canonical">` — self-referential to the ordo.earth URL

### JSON-LD structured data

- **Homepage** — graph with `Organization` + `LocalBusiness` + `WebSite` entities (all linked via `@id`). Includes contact point, address, geo coordinates, price range.
- **Each PDP** — `Product` entity (with sku, material, brand, offers block including `priceCurrency=MYR`, `price`, `availability=MadeToOrder`, `itemCondition=NewCondition`, `areaServed=Malaysia`) + `BreadcrumbList` (Home → Shop → Product).

### `sitemap.xml`

5 URLs with per-page `<image:image>` entries (title + caption) so Google indexes the product photography too. Submitted to Google Search Console.

### `robots.txt`

- Allows `/*` except `/admin`, `/admin/`, `/api/`, `/functions/`
- Declares sitemap location
- Crawl-delay: 1

### Verification

- `google9162f2d923d81f1d.html` at site root (Google Search Console HTML-file method). Because both domains serve the same files, one verification authenticates the site for both `ordo.earth` and `durible.biomechemical.com` Search Console properties.

### Cross-domain consolidation

- `durible.biomechemical.com/*` → `ordo.earth/*` via a Cloudflare Redirect Rule using status `301 Permanent Redirect` and `Preserve query string=on`, `Dynamic expression: concat("https://ordo.earth", http.request.uri.path)`
- Google Search Console "Change of Address" submitted from the old property → the new, so Google actively consolidates ranking signals

---

## 8. Accessibility

- Every interactive element has an `aria-label` or visible text label
- Every image has descriptive `alt` (empty `alt=""` only on purely decorative SVG shapes)
- Drawers use `role="dialog"` + `aria-modal="true"` + `aria-label`, and close on ESC
- Focus-visible outlines use the warm gold token (`--gold`) — never the default browser blue
- Colour contrast is WCAG AA everywhere (off-white background → ink text passes, oxblood CTAs pass on white and off-white)
- `prefers-reduced-motion` disables every transition, transform-linked reveal, and parallax
- Forms use semantic `<label for>` pairing, `autocomplete` attributes (name, email, tel), `inputmode` where appropriate
- Nav is fully keyboard-navigable; wishlist drawer traps focus, ESC to close
- Status updates and form messages use `aria-live="polite"`

---

## 9. Performance

- Google Fonts preconnect + lazy-loaded with `display=swap`
- `fetchpriority="high"` on above-the-fold hero / PDP gallery images
- All below-the-fold images use `loading="lazy" decoding="async"`
- Product card images use skeleton shimmer while loading (no CLS)
- CSS is hand-written, zero frameworks, single stylesheet
- JS is vanilla, zero dependencies, served with `defer` so parse happens before `DOMContentLoaded` but executes in order
- Cache-busting query strings on style.css / form.js / interactions.js (current: `?v=redesignv2-qr`) — bumped on every change to force browser + CDN cache invalidation
- Cloudflare edge caches everything globally — TTFB under 100 ms for most of APAC

---

## 10. Integrations

| Service | Used for | Secrets |
|---|---|---|
| **Cloudflare D1** | Order & item storage | Binding `DB` in Pages project |
| **Cloudflare R2** | Payment slip / avatar / logo storage | Binding `BUCKET` in Pages project |
| **CallMeBot** (free) | WhatsApp order notifications to `+60 10-792 4208` | `WHATSAPP_PHONE`, `CALLMEBOT_API_KEY` |
| **Google Fonts** | Fraunces / Inter / JetBrains Mono | — |
| **Google Search Console** | SEO visibility tracking | — |
| **GitHub** | Source control | — |
| **Cloudflare Pages** | Hosting + CDN + Functions runtime | — |

Admin access is HTTP Basic Auth using the `ADMIN_PASSWORD` Pages secret — any username, that password.

---

## 11. Repository structure

```
durible/
├── index.html                    # landing
├── keychain.html                 # KOE alumni keychain PDP
├── bizcard.html                  # NFC smart business card PDP
├── cablewinder.html              # custom cable winder PDP
├── bagtag.html                   # personalised bag tag PDP
├── style.css                     # all styles (tokens → primitives → components)
├── interactions.js               # scroll reveals, parallax, count-up, drawers
├── form.js                       # per-PDP order form handler (shared)
├── sitemap.xml                   # 5 URLs with image entries
├── robots.txt                    # crawl rules
├── google...html                 # Google Search Console verification
├── Durible_logo.png              # header & OG logo
├── keychain.png · Biz_card.jpeg · Cable_winder.jpeg · Bag_tag.jpeg
├── QR_pay.jpeg                   # DuitNow payment QR
├── functions/
│   ├── api/orders.js             # POST /api/orders → D1 + R2 + WhatsApp
│   ├── _lib/whatsapp.js          # CallMeBot helper + message builder
│   └── admin/
│       ├── _middleware.js        # HTTP Basic Auth for /admin/*
│       ├── index.js              # dashboard HTML
│       ├── receipt.js            # printable per-order receipt
│       ├── export.js             # CSV export
│       ├── slip.js               # R2 file viewer
│       ├── status.js             # status update handler
│       └── whatsapp-test.js      # test the CallMeBot integration
├── schema.sql                    # D1 schema (orders + order_items)
├── wrangler.toml                 # Pages / D1 / R2 binding declarations
├── DESIGN_PLAN.md                # design-direction + redesign scope
├── CHANGELOG.md                  # per-version release notes
├── DEPLOY_NOTES.md               # deployment runbook, secrets, rollback
└── SITE_OVERVIEW.md              # this file
```

---

## 12. Known `TODO(azan):` items

Grep `TODO(azan):` across the repo for each. Current outstanding items:

- Proof-band counters on the homepage are editorial placeholders — swap for real figures when you have honest numbers to publish
- Story-section copy on the homepage is a placeholder founder narrative — replace with your real origin story when ready
- Footer secondary pages (Care guide / Shipping / Returns / FAQs / Trade & wholesale) are linked as `#` placeholders — these pages don't exist yet
- Social media URLs (Instagram, Facebook) in the footer are `#` placeholders
- Hosted `vCard` route (`/v/{slug}`) referenced in the bizcard copy is not yet built — the bizcard promises "hosted contact card" but currently only prints the NFC-programmed URL manually after the order is confirmed

---

## 13. Ops cheatsheet

```bash
# Deploy
wrangler pages deploy . --project-name=durible --branch=main --commit-dirty=true

# Verify the new build is live
curl -s https://ordo.earth/ | grep 'name="build"'
# Expected: <meta name="build" content="redesign-v2">

# Query recent orders
wrangler d1 execute durible-orders --remote \
  --command="SELECT order_id, product_type, full_name, total_amount, status FROM orders ORDER BY id DESC LIMIT 20;"

# List payment slips
wrangler r2 object list durible-uploads --prefix payments/

# Rotate admin password
wrangler pages secret put ADMIN_PASSWORD --project-name=durible

# Test WhatsApp notification
curl -u any:YOUR_ADMIN_PASSWORD https://ordo.earth/admin/whatsapp-test
```

---

_Last updated: April 2026_
