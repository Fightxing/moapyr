DROP TABLE IF EXISTS resources;
CREATE TABLE resources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT,
  uploader_ip TEXT, 
  file_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  downloads INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_resources_status ON resources(status);
CREATE INDEX idx_resources_created_at ON resources(created_at);

DROP TABLE IF EXISTS analytics;
CREATE TABLE analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resource_id TEXT,
  event_type TEXT, -- download, view
  timestamp INTEGER DEFAULT (strftime('%s', 'now'))
);
