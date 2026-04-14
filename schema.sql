-- Durible3D — D1 schema for order collection
-- Run once against your D1 database:
--   wrangler d1 execute durible-orders --file=./schema.sql --remote

DROP TABLE IF EXISTS orders;

CREATE TABLE orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id        TEXT NOT NULL UNIQUE,      -- e.g. DUR-240415-A7K9
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  contact_number  TEXT NOT NULL,
  departments     TEXT NOT NULL,             -- comma-separated
  batches         TEXT NOT NULL,             -- comma-separated
  avatar_choice   TEXT NOT NULL,             -- 'male' | 'female' | 'custom'
  avatar_key      TEXT,                      -- R2 object key, nullable
  quantity        INTEGER NOT NULL,
  shipping_method TEXT NOT NULL,             -- 'collect' | 'standard'
  mailing_address TEXT,
  notes           TEXT,
  payment_slip_key TEXT NOT NULL,            -- R2 object key
  unit_price      REAL NOT NULL,
  shipping_cost   REAL NOT NULL,
  total_amount    REAL NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending | confirmed | shipped | cancelled
  created_at      TEXT NOT NULL
);

CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_status     ON orders(status);
CREATE INDEX idx_orders_email      ON orders(email);
