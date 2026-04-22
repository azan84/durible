# Deploy Notes — Ordo (was Durible3D)

> ## ⏳ DEPLOY PENDING — ordo-v3 awaits credentials
>
> As of this commit, the **ordo-v3** code is ready on `main` but
> **not yet live** on Cloudflare Pages. You must also run the D1
> migration before deploying (adds the `pilot_leads` table).
>
> **Step 1 — run the D1 migration** (safe / idempotent):
> ```bash
> wrangler d1 execute durible-orders --file=./migrations/2026-04-21-pilot-leads.sql --remote
> ```
>
> **Step 2 — deploy the site**:
> ```bash
> wrangler pages deploy . --project-name=durible --branch=main --commit-dirty=true
> ```
>
> **Step 3 — verify**:
> ```bash
> curl -s https://durible.biomechemical.com/ | grep 'name="build"'
> # expected: <meta name="build" content="ordo-v3">
> ```
>
> **Why it wasn't auto-deployed**: Cloudflare Pages for project
> `durible` is not connected to the GitHub repo — it only deploys
> when `wrangler pages deploy` is run manually. If you want pushes
> to `main` to deploy automatically, go to **Workers & Pages →
> durible → Settings → Builds and deployments → Connect to Git**
> and link `azan84/durible`.

## Production

- **Live URL**: https://durible.biomechemical.com/
- **Fallback URL** (always points at latest production deploy):
  https://durible.pages.dev/
- **Repo**: https://github.com/azan84/durible
- **Production branch**: `main`

## Hosting stack

| Layer | Service | Notes |
|---|---|---|
| Static site + Functions | Cloudflare Pages, project `durible` | Account A |
| SQL database | Cloudflare D1, `durible-orders` (id `f015ed66-4987-4b77-a8fe-f0e73eedbc66`) | Account A |
| File storage | Cloudflare R2, bucket `durible-uploads` | Account A |
| DNS zone for `biomechemical.com` | Cloudflare DNS | **Account B** (cross-account) |
| Domain registration | GoDaddy | Nameservers delegated to Cloudflare DNS |

The `durible` subdomain is a `CNAME` to `durible.pages.dev`, proxied
(orange cloud). DNS record lives on Account B; Pages project lives
on Account A. This cross-account setup works fine — Pages validates
the domain via HTTP, not via DNS-zone ownership.

## Bindings on the Pages project (Account A → durible → Settings → Bindings)

| Variable | Type | Target |
|---|---|---|
| `DB` | D1 database | `durible-orders` |
| `BUCKET` | R2 bucket | `durible-uploads` |
| `ADMIN_PASSWORD` | Environment variable (encrypted secret) | (set via `wrangler pages secret put`) |
| `WHATSAPP_PHONE` | Environment variable (encrypted secret, optional) | Target WhatsApp number, international format no '+' (e.g. `60107924208`) |
| `CALLMEBOT_API_KEY` | Environment variable (encrypted secret, optional) | CallMeBot free API key (see WhatsApp section) |

## Deploying a new version

From the repo root:

```bash
wrangler pages deploy . --project-name=durible --branch=main --commit-dirty=true
```

This uploads the static files and the `functions/` tree to the
Pages production environment. The command prints a new
`<hash>.durible.pages.dev` URL which is the preview for that exact
deploy; `durible.pages.dev` and `durible.biomechemical.com` both
update to the latest deploy automatically.

### Verifying a deploy

```bash
curl -s https://durible.biomechemical.com/ | grep 'name="build"'
```

Should print:

```
<meta name="build" content="ordo-v3">
```

Bump the `build` meta in every page when you ship a new design
revision — it's the quickest way to confirm the live site is
serving fresh bytes.

### If the live CSS or JS is stale

Cloudflare's edge cache has a TTL on static files. The HTML files
reference `style.css?v=ordo-v3` and `interactions.js?v=ordo-v3`
as a cache-buster. **Bump that version string when you change either
file**, otherwise visitors' browsers will keep serving the old
cached copy.

## Managing the database

- **Apply schema** (destructive — rebuilds tables):
  ```bash
  wrangler d1 execute durible-orders --file=./schema.sql --remote
  ```
- **Inspect orders**:
  ```bash
  wrangler d1 execute durible-orders --remote \
    --command="SELECT order_id, product_type, full_name, total_amount, status FROM orders ORDER BY id DESC;"
  ```
- Dashboard console alternative: Cloudflare → D1 → durible-orders →
  Console.

## WhatsApp notifications on every new order

Each successful order submission fires a WhatsApp message to your
personal WhatsApp (Business or regular) via **CallMeBot** — a free
forwarding service designed for self-notifications.

### Trade-offs (read first)

- ✅ Free, no credit card, no Meta Business Manager setup
- ✅ Works with WhatsApp Business numbers
- ✅ Messages arrive as normal chats from the CallMeBot contact
- ⚠️ Third-party service — CallMeBot relays your messages. Don't
  send customer PII you wouldn't email to a Gmail address.
- ⚠️ Rate-limited to reasonable use (a few messages per minute is
  fine; thousands per hour is not).
- ⚠️ Not an official WhatsApp API — if CallMeBot goes offline,
  notifications stop. Orders still flow through to D1 + R2
  independently; nothing customer-facing is affected.

If you outgrow CallMeBot, the cleanest upgrade paths are:
1. **Meta WhatsApp Cloud API** (official, free up to 1,000
   service conversations/month, but requires Meta Business
   Manager + pre-approved message templates for agent-initiated
   sends).
2. **Twilio WhatsApp** (paid, ≈USD 0.005 / message).

Both would just need a new `_lib/whatsapp.js` send function; the
rest of the pipeline is unchanged.

### One-time setup — CallMeBot

1. **In WhatsApp on your phone**, add the contact number
   `+34 644 52 74 88` to your address book. Name it anything
   (e.g. *CallMeBot*).
2. Open a chat with that contact and send the exact message:
   ```
   I allow callmebot to send me messages
   ```
3. Within 2 minutes, CallMeBot DMs you an **API key** — a numeric
   string like `1234567`. Copy it.
4. Set two Pages secrets:
   ```bash
   wrangler pages secret put WHATSAPP_PHONE --project-name=durible
   # when prompted, paste: 60107924208
   # (your phone in international format, NO '+', spaces, or dashes)

   wrangler pages secret put CALLMEBOT_API_KEY --project-name=durible
   # when prompted, paste the API key from CallMeBot
   ```
5. Redeploy so the new secrets are scoped to the new deployment:
   ```bash
   wrangler pages deploy . --project-name=durible --branch=main --commit-dirty=true
   ```
6. Verify by opening
   `https://durible.biomechemical.com/admin/whatsapp-test`
   in your browser (you'll need the admin password). It sends a
   test message and prints the result. You'll also see a new
   **📱 Test WhatsApp** button on the admin dashboard.

### What each order notification contains

- Order ID, product name, quantity
- Total with breakdown (unit × qty + shipping)
- Buyer name, phone, email
- Delivery method + full mailing address (if shipping)
- Product-specific detail:
  - Keychain: dept + batch/matric + avatar for each of the N items
  - Biz card: company address
  - Cable winder: logo file R2 key
- Notes (if any)
- Payment slip R2 key
- Direct URLs to the printable receipt and the admin dashboard

### If it stops working

1. Open `/admin/whatsapp-test` — if secrets are missing or
   CallMeBot rejected the request, it'll tell you which.
2. If you changed your WhatsApp number or reset the CallMeBot
   registration, you need to re-do the activation and run
   `wrangler pages secret put CALLMEBOT_API_KEY ...` again.
3. If CallMeBot ever suspends or the service changes, swap
   `functions/_lib/whatsapp.js` for an alternative provider — the
   rest of the pipeline is unchanged.

## Admin dashboard

- URL: https://durible.biomechemical.com/admin
- Auth: HTTP Basic; username ignored, password is the
  `ADMIN_PASSWORD` secret. To rotate:
  ```bash
  wrangler pages secret put ADMIN_PASSWORD --project-name=durible
  ```
  Then redeploy so the new secret is in scope.

Features on `/admin` (orders):
- Filter chips (status + product)
- Status dropdown per row (auto-saves)
- CSV export at `/admin/export` (respects current filter)
- Print-to-PDF dashboard view
- Per-order printable receipt at `/admin/receipt?id=DUR-XXX`
- Payment slip preview via `/admin/slip?key=...` (private — only
  served when logged in)
- Cross-link to `/admin/pilots` in topnav

Features on `/admin/pilots` (Durible pilot leads):
- Filter chips by status (`new | contacted | piloting | closed`)
- Status dropdown per row (auto-saves via POST `/admin/pilot-status`)
- Notes expander per row
- CSV export at `/admin/pilots-export`
- Cross-link back to `/admin` in topnav

## Things that need your credentials (I can't do these for you)

All credential-gated ops were performed by you while I prepared
code. If someone else picks up this repo, they'll need:

- **Cloudflare account login** for Account A (to deploy, view logs,
  edit bindings)
- **Cloudflare account login** for Account B (to edit DNS records
  for `biomechemical.com`)
- **GitHub push access** to `azan84/durible`
- A fresh `wrangler login` session (OAuth token — expires after
  inactivity)

## TODO list left in code

Grep `TODO(azan):` across the repo to find each one. Current items:

- Proof band numbers are placeholders (`index.html`)
- Story section copy is editorial placeholder (`index.html`)
- Footer "Care guide / Shipping / Returns / FAQs / Trade &
  wholesale" pages don't exist yet — linked as `#` placeholders
- Instagram / Facebook / WhatsApp social links are `#` placeholders
- Hosted vCard route (`/v/{slug}`) referenced in the bizcard copy
  is not built yet

## Rollback

Every `wrangler pages deploy` is immutable and kept by Cloudflare.
To roll back:
- Cloudflare dashboard → Workers & Pages → durible → Deployments →
  pick an older deployment → **⋯ → Rollback to this deployment**

## What I verified at ship time

### redesign-v2 (baseline)
- All 5 HTML pages return 200 over HTTP
- Build marker `redesign-v2` present on every page
- Product grid renders 4 cards; 5 category chips; 4 count-up
  targets; 4 wishlist hearts (parity with spec)
- `interactions.js` is valid JS and evaluates without errors
- `style.css` parses correctly (no broken tokens)
- Live URL curl returns the new `<meta name="build">` marker
- Form flow `keychain.html` → POST `/api/orders` → D1 insert still
  works (no changes to endpoint or payload)

### ordo-v3 (pending deploy)
Verify after deploy + migration:
- `curl -s https://ordo.earth/ | grep 'name="build"'` returns `ordo-v3`
- Homepage shows 4 pillar blocks + dimensional filter chips
- "How it works", portfolio strip, Durible Lab section visible
- Pilot form on homepage submits → `/api/pilot` → D1 `pilot_leads` insert → WhatsApp notification
- `/admin/pilots` accessible; status dropdown auto-saves; CSV export works
- All 4 PDP order forms still submit correctly (no regression)
