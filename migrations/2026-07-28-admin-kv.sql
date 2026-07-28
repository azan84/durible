-- Ordo Admin (business tool) — key/value store for the /admin/manage
-- orders/finance/inventory/pricing app. Backs what used to be the Claude
-- artifact window.storage API when this tool ran as a Claude artifact.
-- Apply against the remote D1 database:
--   wrangler d1 execute durible-orders --file=./migrations/2026-07-28-admin-kv.sql --remote
-- Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS admin_kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
