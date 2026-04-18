# Changelog

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
