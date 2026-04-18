# Durible3D — Redesign v2 Design Plan

## Audit findings

### Current stack
- **Static site**: plain HTML + CSS + JS (no framework, no build step)
- **Pages**: `index.html` (4-product landing), `keychain.html`, `bizcard.html`, `cablewinder.html`, `bagtag.html`
- **Backend**: Cloudflare Pages Functions at `functions/api/orders.js` and `functions/admin/*.js`
- **Data**: Cloudflare D1 (`durible-orders` → `orders` + `order_items` tables) and R2 (`durible-uploads` bucket for payment slips, avatars, logos)
- **Order model**: per-product native HTML form → POST `/api/orders` → validates, uploads files to R2, inserts into D1. No multi-product cart — each product page submits its own form.
- **Admin**: `/admin` dashboard with HTTP Basic Auth (ADMIN_PASSWORD secret), CSV export, per-order printable receipt

### Deploy surface
- **Host**: Cloudflare Pages, project `durible`
- **Production domain**: `durible.biomechemical.com` (DNS CNAME → `durible.pages.dev`, cross-account: DNS on "Account B" which holds the biomechemical.com zone, Pages on "Account A")
- **Branch that deploys**: `main`
- **Deploy command**: `wrangler pages deploy . --project-name=durible --branch=main --commit-dirty=true`
- **`wrangler.toml`** declares D1 and R2 bindings; production bindings also set in the Pages dashboard

### What stays
- All form submission endpoints and payloads — unchanged
- D1 schema — unchanged
- Admin pages — unchanged except light style refresh
- Product copy, prices (RM 20 × 3 + RM 40 × 1, RM 5 shipping)
- Image assets: `Durible_logo.png`, `keychain.png`, `Biz_card.jpeg`, `Cable_winder.jpeg`, `Bag_tag.jpeg`

### What changes
- Design tokens, palette, typography, layout, interactions — everything user-facing on the marketing pages

---

## Design direction

### Mood
Durable, honest, crafted, warm. The brand name *Durible* keys into longevity, quality, objects you keep. Editorial restraint, not SaaS glitz.

### Color (light-mode only for v2)

| Token | Value | Role |
|---|---|---|
| `--bg` | `#faf8f4` | Warm off-white base |
| `--bg-elev` | `#ffffff` | Cards, elevated surfaces |
| `--ink` | `#1a1a1a` | Primary text |
| `--ink-muted` | `#5a5248` | Secondary text |
| `--line` | `#e8e1d3` | Hairline borders |
| `--primary` | `#8b3a2f` | Oxblood — the Durible brand accent (echoes the PLA filament, the cable winder red) |
| `--primary-hover` | `#6d2b22` | Primary CTA hover state |
| `--gold` | `#c99a5b` | Price tags, sale badges, focus rings |
| `--forest` | `#2d4a3a` | Reserved secondary accent |
| `--success` | `#2d6a4f` | |
| `--danger` | `#9b2226` | |

Chosen oxblood because the existing product photography (cable winder with red PLA, bag tag with Malaysia-flag red stripes) lines up naturally. The warm gold shows up for prices, filter chips, and focus rings. Commit to these — no purple gradients, no stock SaaS blue.

### Typography
- **Display**: **Fraunces** — variable serif with optical size + weight axes. Large hero headlines, product names, section titles.
- **Body**: **Inter** at -0.01em tracking, 400/500 weights.
- **Numbers / prices / SKUs**: **JetBrains Mono** — signals craft.
- Type scale (1.25 ratio): 12, 14, 16, 20, 25, 31, 39, 49, 61, 76, 96px
- Line-height: 1.6 body, 1.1 display, 1.3 medium headings

### Spacing (4px grid)
`--sp-1` 4px, `--sp-2` 8px, `--sp-3` 12px, `--sp-4` 16px, `--sp-6` 24px, `--sp-8` 32px, `--sp-12` 48px, `--sp-16` 64px, `--sp-24` 96px, `--sp-32` 128px

### Motion tokens
- `--ease-out`: `cubic-bezier(0.16, 1, 0.3, 1)` (the hero ease everyone loves)
- `--ease-in-out`: `cubic-bezier(0.65, 0, 0.35, 1)`
- `--dur-1`: 120ms (tap feedback)
- `--dur-2`: 240ms (standard)
- `--dur-3`: 400ms (hero, cards)
- `--dur-4`: 700ms (reveals, parallax)

All motion gated by `@media (prefers-reduced-motion: no-preference)`.

---

## Feature plan — scope adjustments

The original brief assumed a multi-product cart. The Durible architecture is one-form-per-product (buyer enters product-specific details inline — department, batch, avatar, company address, logo, etc. — which can't merge across products). So:

- **Feature #4 "Cart drawer"**: reinterpret as a **Wishlist drawer**. Heart icons on product cards save to `localStorage`. Drawer slides in from the right, lists saved items with links to their order pages. The actual "add to bag" on each product page remains the existing native form → Pages Function → D1 flow.
- **Feature #3 "Variant selector"**: products don't have variants today — we skip the selector but add a **quantity stepper** on the PDPs and keep the dynamic per-keychain card generation that already exists for the keychain.
- **Feature #6 "Count-up social proof"**: counts pulled from real D1 data would need an API call. To keep this offline-fast and avoid misleading copy, we use editorial placeholders flagged as `TODO(azan):` in HTML comments.
- **Feature #8 "Search overlay"**: the catalog only has 4 products — client-side search would be overkill. We scope this to a quick-filter chip strip on the homepage (All / Keychain / Cards / Winders / Bag Tags) and skip the overlay.

Everything else builds as spec'd.

---

## Execution order (per-commit)

1. `feat: design tokens + palette + typography system`
2. `feat: cinematic hero with cursor parallax`
3. `feat: upgraded product grid with reveal, hover crossfade, wishlist heart`
4. `feat: navigation upgrade with blur, mobile drawer, wishlist drawer`
5. `feat: scroll-linked storytelling section`
6. `feat: count-up social proof band`
7. `feat: refined PDP layout with sticky CTA and accordions`
8. `feat: micro-interactions across forms, buttons, cards`
9. `perf: preconnect, font-display swap, JSON-LD, OG tags, build marker`
10. `docs: CHANGELOG + DEPLOY_NOTES`

Merged to `main` at the end, `wrangler pages deploy` to production, curl verify the `<meta name="build">` marker on the live URL.
