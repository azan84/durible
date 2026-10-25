# ordo-chat — "Ask Ordo" concierge

The **Ask Ordo** button (bottom-right on every generated page: `ordo-chat.js` + `ordo-chat.css` at the
site root, included by `scripts/build-site.mjs`) talks to this Cloudflare Worker, which holds the Anthropic
API key and answers with Claude (`claude-haiku-5-5`, low effort) using only what the site publishes.

For a potential customer it:

- asks the questions the enquiry form needs (who it's for, how many, when, branding) and suggests fitting
  ideas, linking each one — linked products and ranges appear as picture cards (`img/ordo/<slug>-main-640.webp`);
- never quotes prices, minimum quantities or lead times (the site agrees those at proposal stage);
- turns the conversation into an editable **project brief** (`[[brief interest="…"]]…[[/brief]]` in the
  reply) with **Send as enquiry** (opens `/contact?interest=…&message=…`, pre-filled by `ordo.js`) and
  **WhatsApp** buttons;
- shows a one-time teaser bubble per visit, and replies in English or Bahasa Melayu.

Live endpoint: `https://ordo-site-chat.azan-sapardi.workers.dev/chat`

## After changing the site

`src/knowledge.js` is a snapshot of the generated pages (home, solutions, ranges, custom-projects, about,
contact, `collections/*`, `product/*`; the legacy order pages are left out). After
`node scripts/build-site.mjs`, redeploy so the assistant knows the new content:

```bash
cd workers/ordo-chat
npm install        # first time only
npm run deploy     # rebuilds knowledge.js, then wrangler deploy
```

After editing `ordo-chat.js` / `ordo-chat.css`, bump `CHAT` in `scripts/build-site.mjs`, rebuild the pages
and redeploy the Pages project (see `docs/DEPLOY_NOTES.md`).

## Local testing

```bash
# workers/ordo-chat/.dev.vars (gitignored):
#   ANTHROPIC_API_KEY=sk-ant-...
#   ALLOW_LOCALHOST="true"
npm run dev        # worker on http://localhost:8787
```

Serve the site from `localhost` (with clean URLs, e.g. `npx wrangler pages dev` from the repo root) and
the widget uses the local worker automatically.

## Key, limits and cost

- API key: `npx wrangler secret put ANTHROPIC_API_KEY` (stored encrypted in Cloudflare, never in the repo).
- Only `https://ordo.earth` and `https://www.ordo.earth` may call it (`ALLOWED_ORIGINS`); scripts can fake
  that, so volume is also capped: 8 messages/minute per visitor IP, 40/minute site-wide. Messages are capped
  at 1,500 characters, history at 12 messages, replies at 2,000 tokens.
- The ~19k-token instructions + site snapshot are prompt-cached: well under $0.001 per answer while warm.
  Set a monthly spend limit in the Anthropic Console as a backstop.
- Runs in `aws:us-east-1` (`[placement]`), because some Cloudflare edge locations get
  403 "Request not allowed" from the Anthropic API.
- `npx wrangler tail` (in this folder) shows live requests, including a `usage` line per answer.
