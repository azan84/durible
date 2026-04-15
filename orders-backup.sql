PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE orders (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id         TEXT NOT NULL UNIQUE,       -- e.g. DUR-240415-A7K9
  product_type     TEXT NOT NULL,              -- 'keychain' | 'bizcard' | 'cablewinder' | 'bagtag'
  product_name     TEXT NOT NULL,              -- human-readable product name
  full_name        TEXT NOT NULL,              -- buyer's name
  email            TEXT,                       -- buyer's email (nullable for simple products)
  contact_number   TEXT NOT NULL,              -- buyer's phone
  quantity         INTEGER NOT NULL,
  shipping_method  TEXT NOT NULL,              -- 'collect' | 'standard'
  mailing_address  TEXT,
  notes            TEXT,
  payment_slip_key TEXT NOT NULL,              -- R2 object key
  logo_key         TEXT,                       -- R2 key for cable-winder logo upload
  unit_price       REAL NOT NULL,
  shipping_cost    REAL NOT NULL,
  total_amount     REAL NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending',  -- pending | confirmed | shipped | cancelled
  details_json     TEXT,                       -- JSON blob for product-specific fields (bizcard/bagtag/etc.)
  created_at       TEXT NOT NULL
);
INSERT INTO "orders" ("id","order_id","product_type","product_name","full_name","email","contact_number","quantity","shipping_method","mailing_address","notes","payment_slip_key","logo_key","unit_price","shipping_cost","total_amount","status","details_json","created_at") VALUES(1,'DUR-260414-QWRP','bagtag','Personalised Bag Tag','Test User','azan@iium.edu.my','0123456789',1,'standard','A5-3-2, IIUM Staff Housing, International Islamic University Malaysia','','payments/DUR-260414-QWRP.jpg',NULL,20,5,25,'pending','{}','2026-04-14T17:58:05.995Z');
CREATE TABLE order_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id         TEXT NOT NULL,              -- FK → orders.order_id
  item_index       INTEGER NOT NULL,           -- 0..quantity-1
  department       TEXT NOT NULL,
  engraving_value  TEXT NOT NULL,              -- batch number or matric number, free-text
  avatar_choice    TEXT NOT NULL,              -- 'male' | 'female' | 'custom'
  avatar_key       TEXT,                       -- R2 object key if custom, else NULL
  FOREIGN KEY (order_id) REFERENCES orders(order_id)
);
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('orders',1);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_status     ON orders(status);
CREATE INDEX idx_orders_email      ON orders(email);
CREATE INDEX idx_orders_product    ON orders(product_type);
CREATE INDEX idx_items_order       ON order_items(order_id);
