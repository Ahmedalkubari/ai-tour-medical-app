-- Migration v6: Arabic explanations + faculty users (additive)
ALTER TABLE Question_Bank ADD COLUMN explanation_ar TEXT DEFAULT '';
CREATE TABLE IF NOT EXISTS Faculty_Users (
  username   TEXT PRIMARY KEY,
  pass_hash  TEXT NOT NULL,
  salt       TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('admin','reviewer','viewer')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
