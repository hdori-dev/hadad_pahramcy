-- قاعدة بيانات Cloudflare D1.  التشغيل:  npm run db:local   (محلياً)   |   npm run db:remote   (على Cloudflare)
PRAGMA foreign_keys = ON;

-- أقسام رئيسية (parent_id = NULL) وفرعية (parent_id = id القسم الرئيسي)
CREATE TABLE IF NOT EXISTS categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id  INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
  name_ar    TEXT NOT NULL,
  name_en    TEXT NOT NULL DEFAULT '',
  sort       INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id, sort);

CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
  name_ar     TEXT NOT NULL,
  name_en     TEXT NOT NULL DEFAULT '',
  desc_ar     TEXT NOT NULL DEFAULT '',
  desc_en     TEXT NOT NULL DEFAULT '',
  price       INTEGER NOT NULL DEFAULT 0,      -- بالدينار العراقي (عدد صحيح)
  old_price   INTEGER,                          -- السعر قبل الخصم (اختياري)
  featured    INTEGER NOT NULL DEFAULT 0,       -- علامة «مميز»
  available   INTEGER NOT NULL DEFAULT 1,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_products_cat ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);

CREATE TABLE IF NOT EXISTS images (
  id         TEXT PRIMARY KEY,
  mime       TEXT NOT NULL,
  size       INTEGER NOT NULL,
  data       BLOB,                              -- يبقى NULL إن استُخدم R2
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS product_images (
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_id   TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, image_id)
);
CREATE INDEX IF NOT EXISTS idx_pi_image ON product_images(image_id);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- إحصاءات مجهولة (بلا عنوان IP ولا هوية)
CREATE TABLE IF NOT EXISTS events (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  ts   INTEGER NOT NULL,
  day  TEXT NOT NULL,          -- YYYY-MM-DD بتوقيت بغداد
  type TEXT NOT NULL,
  src  TEXT NOT NULL DEFAULT '',
  ref  TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_events_day ON events(day, type);

-- حماية الدخول
CREATE TABLE IF NOT EXISTS login_attempts (ip_hash TEXT NOT NULL, ts INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_attempts ON login_attempts(ip_hash, ts);
CREATE TABLE IF NOT EXISTS login_nonces (nonce TEXT PRIMARY KEY, exp INTEGER NOT NULL);

-- الطلبات (تُحفظ عند إنشاء الفاتورة؛ الأسعار تُحسب من قاعدة البيانات لا من المتصفح)
CREATE TABLE IF NOT EXISTS orders (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  customer_name TEXT NOT NULL,
  phone         TEXT NOT NULL,
  address       TEXT NOT NULL,
  method        TEXT NOT NULL DEFAULT 'delivery',   -- delivery | pickup
  note          TEXT NOT NULL DEFAULT '',
  channel       TEXT NOT NULL DEFAULT '',           -- whatsapp | instagram | pdf
  total         INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'new'         -- new | preparing | done | cancelled
);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE TABLE IF NOT EXISTS order_items (
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER,
  name       TEXT NOT NULL,
  qty        INTEGER NOT NULL,
  price      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_oi_order ON order_items(order_id);
