-- Ordo v3 — pilot_leads table for Durible filament pilot programme.
-- Apply against the remote D1 database:
--   wrangler d1 execute durible-orders --file=./migrations/2026-04-21-pilot-leads.sql --remote
-- Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS pilot_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pilot_id TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  use_case TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pilot_leads_created_at ON pilot_leads(created_at);
CREATE INDEX IF NOT EXISTS idx_pilot_leads_status ON pilot_leads(status);
