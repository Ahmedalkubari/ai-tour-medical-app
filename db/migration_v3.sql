-- Migration v3: FTS5 live search + SRS schedule + peer-review flags (additive)
CREATE VIRTUAL TABLE IF NOT EXISTS FTS_Questions USING fts5(question_text, explanation, exam_source, tokenize='porter');
CREATE VIRTUAL TABLE IF NOT EXISTS FTS_Topics USING fts5(topic_title, detailed_content, tokenize='porter');
CREATE VIRTUAL TABLE IF NOT EXISTS FTS_Cases USING fts5(chief_complaint, history_present_illness, differential_dx, management_plan, tokenize='porter');

CREATE TABLE IF NOT EXISTS SRS_Schedule (
  user_id      TEXT NOT NULL,
  question_id  INTEGER NOT NULL,
  ease         REAL NOT NULL DEFAULT 2.5,
  interval_d   INTEGER NOT NULL DEFAULT 0,
  reps         INTEGER NOT NULL DEFAULT 0,
  lapses       INTEGER NOT NULL DEFAULT 0,
  due_at       TEXT NOT NULL DEFAULT (datetime('now')),
  last_grade   INTEGER,
  PRIMARY KEY (user_id, question_id),
  FOREIGN KEY (question_id) REFERENCES Question_Bank(question_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Review_Flags (
  flag_id     INTEGER PRIMARY KEY AUTOINCREMENT,
  target_kind TEXT NOT NULL CHECK (target_kind IN ('question','case','topic','osce')),
  target_id   INTEGER NOT NULL,
  reviewer    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','needs_fix')),
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_srs_due ON SRS_Schedule(user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_flags_status ON Review_Flags(status);
