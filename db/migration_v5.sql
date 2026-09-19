-- Migration v5: neural vector store + FSRS fields + exam import log (additive)
CREATE TABLE IF NOT EXISTS Question_Embeddings (
  question_id INTEGER PRIMARY KEY,
  model       TEXT NOT NULL,
  dim         INTEGER NOT NULL,
  vec_json    TEXT NOT NULL,
  FOREIGN KEY (question_id) REFERENCES Question_Bank(question_id) ON DELETE CASCADE
);
ALTER TABLE SRS_Schedule ADD COLUMN stability REAL DEFAULT 0;
ALTER TABLE SRS_Schedule ADD COLUMN diff_fsrs REAL DEFAULT 0;
ALTER TABLE SRS_Schedule ADD COLUMN state TEXT DEFAULT 'new';
CREATE TABLE IF NOT EXISTS Exam_Imports (
  import_id  INTEGER PRIMARY KEY AUTOINCREMENT,
  filename   TEXT NOT NULL,
  source     TEXT NOT NULL,
  total      INTEGER NOT NULL DEFAULT 0,
  inserted   INTEGER NOT NULL DEFAULT 0,
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
