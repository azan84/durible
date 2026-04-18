# Deploy Notes — Durible3D

> ## ⏳ DEPLOY PENDING — redesign-v2 awaits credentials
>
> As of this commit, the **redesign-v2** code is merged to `main` and
> pushed to GitHub, but **not yet live** on Cloudflare Pages. The
> live site (`durible.biomechemical.com`) still serves the previous
> build.
>
> **To push it live**, run this from the repo root (WSL works, or any
> shell where `wrangler login` has an active OAuth session):
>
> ```bash
> wrangler pages deploy . --project-name=durible --branch=main --commit-dirty=true
> ```
>
> Then verify with:
>
> ```bash
> curl -s https://durible.biomechemical.com/ | grep 'name="build"'
> # expected: <meta name="build" content="redesign-v2">
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
| `TELEGRAM_BOT_TOKEN` | Environment variable (encrypted secret, optional) | From @BotFather — enables order notifications |
| `TELEGRAM_CHAT_ID` | Environment variable (encrypted secret, optional) | Target chat (your DM with the bot) |

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
<meta name="build" content="redesign-v2">
```

Bump the `build` meta in every page when you ship a new design
revision — it's the quickest way to confirm the live site is
serving fresh bytes.

### If the live CSS or JS is stale

Cloudflare's edge cache has a TTL on static files. The HTML files
reference `style.css?v=redesignv2` and `interactions.js?v=redesignv2`
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

## Telegram notifications on every new order

Each successful order submission also fires a message to a Telegram
chat (your personal DM with a dedicated bot).

### One-time setup

1. **Open Telegram**, search `@BotFather`, start a chat.
2. Send `/newbot`. Give it a name (e.g. *Durible Orders*) and a
   username ending in `bot` (e.g. `durible_orders_bot`).
3. BotFather replies with an **HTTP API token** that looks like
   `1234567890:AAH9...`. Copy it.
4. Find your bot in Telegram, open its chat, tap **Start**, and send
   any message (e.g. `hi`). This gives the bot a chat to send to.
5. In a browser, visit
   `https://api.telegram.org/bot<TOKEN>/getUpdates`
   (replace `<TOKEN>` with the token from step 3). Look for
   `"chat":{"id":123456789,` in the JSON — that number is your
   **chat ID**. Copy it.
6. Set both as Pages secrets (one at a time, paste when prompted):
   ```bash
   wrangler pages secret put TELEGRAM_BOT_TOKEN --project-name=durible
   wrangler pages secret put TELEGRAM_CHAT_ID  --project-name=durible
   ```
7. Redeploy so the new secrets are scoped to the new deployment:
   ```bash
   wrangler pages deploy . --project-name=durible --branch=main --commit-dirty=true
   ```
8. Verify by opening
   `https://durible.biomechemical.com/admin/telegram-test`
   in your browser — it sends a test message and prints the result.
   You can also click **✉ Test Telegram** from the admin dashboard.

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
- Direct links to the printable receipt and the admin dashboard

### If it stops working

Open `/admin/telegram-test` — if secrets are missing or the token
was revoked, it'll tell you which one is the problem. To change
either secret, re-run the `wrangler pages secret put` command with
the same name; the new value replaces the old on the next deploy.

## Admin dashboard

- URL: https://durible.biomechemical.com/admin
- Auth: HTTP Basic; username ignored, password is the
  `ADMIN_PASSWORD` secret. To rotate:
  ```bash
  wrangler pages secret put ADMIN_PASSWORD --project-name=durible
  ```
  Then redeploy so the new secret is in scope.

Features on `/admin`:
- Filter chips (status + product)
- Status dropdown per row (auto-saves)
- CSV export at `/admin/export` (respects current filter)
- Print-to-PDF dashboard view
- Per-order printable receipt at `/admin/receipt?id=DUR-XXX`
- Payment slip preview via `/admin/slip?key=...` (private — only
  served when logged in)

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

- All 5 HTML pages return 200 over HTTP
- Build marker `redesign-v2` present on every page
- Product grid renders 4 cards; 5 category chips; 4 count-up
  targets; 4 wishlist hearts (parity with spec)
- `interactions.js` is valid JS and evaluates without errors
- `style.css` parses correctly (no broken tokens)
- Live URL curl returns the new `<meta name="build">` marker
- Form flow `keychain.html` → POST `/api/orders` → D1 insert still
  works (no changes to endpoint or payload)
