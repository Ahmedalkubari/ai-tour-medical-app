-- Migration v4: semantic-ready stats + image links (additive)
CREATE TABLE IF NOT EXISTS Question_Images (
  question_id INTEGER NOT NULL,
  image_id    INTEGER NOT NULL,
  PRIMARY KEY (question_id, image_id),
  FOREIGN KEY (question_id) REFERENCES Question_Bank(question_id) ON DELETE CASCADE,
  FOREIGN KEY (image_id) REFERENCES Medical_Images(image_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS Question_Stats (
  question_id INTEGER PRIMARY KEY,
  attempts    INTEGER NOT NULL DEFAULT 0,
  correct     INTEGER NOT NULL DEFAULT 0,
  difficulty  REAL NOT NULL DEFAULT 0.5,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (question_id) REFERENCES Question_Bank(question_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_qimg_q ON Question_Images(question_id);
