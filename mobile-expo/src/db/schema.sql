-- v1 schema for mobile app SQLite
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS kv(
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS sites(
  site_id INTEGER PRIMARY KEY,
  name TEXT,
  city TEXT,
  state TEXT,
  tz TEXT
);

CREATE TABLE IF NOT EXISTS alerts(
  alert_id TEXT PRIMARY KEY,
  site_id INTEGER,
  raised_at TEXT,
  code TEXT,
  level TEXT,
  asset_id INTEGER,
  asset_type TEXT,
  zone_label TEXT,
  ticket_id INTEGER
);

CREATE TABLE IF NOT EXISTS tickets(
  ticket_id INTEGER PRIMARY KEY,
  ticket_no TEXT,
  status TEXT,
  substatus_code TEXT,
  severity INTEGER,
  category_id INTEGER,
  summary TEXT,
  description TEXT,
  site_id INTEGER,
  assignee_user_id INTEGER,
  team_id INTEGER,
  vendor_id INTEGER,
  due_at TEXT,
  sla_plan_id INTEGER,
  created_at TEXT,
  updated_at TEXT,
  rowversion_base64 TEXT
);

CREATE TABLE IF NOT EXISTS comments(
  comment_id INTEGER PRIMARY KEY,
  ticket_id INTEGER,
  body TEXT,
  visibility TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS attachments(
  attachment_id INTEGER PRIMARY KEY,
  ticket_id INTEGER,
  uri TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  content_sha256 TEXT
);

CREATE TABLE IF NOT EXISTS queue(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT,
  payload TEXT,
  created_at TEXT,
  try_count INTEGER DEFAULT 0
);
