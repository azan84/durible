# Durible3D — Cloudflare Deployment Guide

This walks you through deploying the site + order API on Cloudflare Pages with D1 (SQL) and R2 (file storage).

## Architecture

```
Browser (index.html)
    |
    |  POST /api/orders  (multipart)
    v
Cloudflare Pages Function  (functions/api/orders.js)
    |
    +--> D1 database "durible-orders"   (text data)
    +--> R2 bucket   "durible-uploads"  (avatar + payment slip files)
```

Single project, single domain, no CORS setup needed.

---

## Prerequisites

1. A Cloudflare account (free tier is enough to start).
2. Node.js 18+ installed locally.
3. Install wrangler (Cloudflare's CLI):
   ```bash
   npm install -g wrangler
   ```
4. Log in:
   ```bash
   wrangler login
   ```
   This opens a browser window — approve access.

---

## Step 1 — Create the D1 database

From the `Durible/` folder:

```bash
wrangler d1 create durible-orders
```

You will get output like:
```
[[d1_databases]]
binding = "DB"
database_name = "durible-orders"
database_id = "abcd1234-..."
```

Copy the `database_id`, open `wrangler.toml`, and paste it over `REPLACE_WITH_D1_DATABASE_ID`.

Then apply the schema:

```bash
wrangler d1 execute durible-orders --file=./schema.sql --remote
```

Verify the table exists:

```bash
wrangler d1 execute durible-orders --command="SELECT name FROM sqlite_master WHERE type='table';" --remote
```

You should see the `orders` table.

---

## Step 2 — Create the R2 bucket

```bash
wrangler r2 bucket create durible-uploads
```

That is all — the binding is already defined in `wrangler.toml`.

---

## Step 3 — Create the Pages project and push the code

Option A — **Connect GitHub (recommended):**
1. Go to **Cloudflare dashboard > Workers & Pages > Create > Pages > Connect to Git**.
2. Pick the `azan84/durible` repo.
3. Build settings:
   - Framework preset: **None**
   - Build command: *(leave empty)*
   - Build output directory: `/`
4. Click **Save and Deploy**. Cloudflare will deploy on every push to `main`.

Option B — **Direct upload from CLI:**
```bash
wrangler pages deploy . --project-name=durible
```
Follow the prompts. On first run it will create the project.

---

## Step 4 — Attach the bindings to the Pages project

The bindings in `wrangler.toml` cover local dev. For **production**, you also need to attach them in the dashboard:

1. Go to **Workers & Pages > durible > Settings > Functions > Bindings**.
2. **D1 database bindings** > **Add binding**:
   - Variable name: `DB`
   - D1 database: `durible-orders`
3. **R2 bucket bindings** > **Add binding**:
   - Variable name: `BUCKET`
   - R2 bucket: `durible-uploads`
4. Save, then trigger a redeploy (push any change, or hit "Retry deployment").

> You must do this for both the **Production** and **Preview** environments if you use preview branches.

---

## Step 5 — Test it

Open your site at `https://durible.pages.dev` (or your custom domain). Fill in the form and submit. You should see a success message with an order reference.

Check the data:

```bash
# List recent orders
wrangler d1 execute durible-orders --command="SELECT order_id, full_name, quantity, total_amount, status, created_at FROM orders ORDER BY id DESC LIMIT 10;" --remote

# List uploaded files
wrangler r2 object list durible-uploads
```

---

## Local development (optional)

To run the Pages Function locally with live D1 + R2 bindings:

```bash
wrangler pages dev .
```

This serves the static files and executes `functions/api/orders.js` against your **remote** D1 and R2 (or local emulated ones — use `--local` for full offline dev).

---

## Managing orders

- **View an order's payment slip**: the R2 key is stored in `payment_slip_key`. To generate a temporary download URL from the dashboard, go to **R2 > durible-uploads > browse** and click the file.
- **Export all orders to CSV**:
  ```bash
  wrangler d1 execute durible-orders --command="SELECT * FROM orders;" --remote --json > orders.json
  ```
- **Update order status**:
  ```bash
  wrangler d1 execute durible-orders --command="UPDATE orders SET status='confirmed' WHERE order_id='DUR-240415-A7K9';" --remote
  ```

---

## Security notes

- The API has **no rate limiting** out of the box. If you get spammed, enable **Cloudflare Turnstile** (free CAPTCHA) and verify the token inside `onRequestPost`.
- Files uploaded to R2 are **private by default** — only you can read them via the dashboard or wrangler. Do not make the bucket public unless you want the slips to be world-readable.
- The Pages Function validates file size (10 MB cap) and required fields server-side, so it is safe even if someone bypasses the client-side form.

---

## Cost

On Cloudflare's free tier you get:
- **Pages**: unlimited static requests
- **Pages Functions**: 100,000 requests/day
- **D1**: 5 GB storage, 5M reads/day, 100K writes/day
- **R2**: 10 GB storage, 1M Class A ops/month, 10M Class B ops/month, **zero egress fees**

For a class/batch order form, you will not come close to any of these limits.
