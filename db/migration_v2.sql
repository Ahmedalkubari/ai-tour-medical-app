-- Migration v2: OSCE + Images + Textbook chapters (additive, backward-compatible)
CREATE TABLE IF NOT EXISTS OSCE_Stations (
  station_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  department   TEXT NOT NULL,
  title        TEXT NOT NULL,
  task         TEXT NOT NULL,
  checklist_json TEXT NOT NULL,
  model_answer TEXT NOT NULL,
  time_minutes INTEGER NOT NULL DEFAULT 7
);
CREATE TABLE IF NOT EXISTS Medical_Images (
  image_id    INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id    INTEGER,
  title       TEXT NOT NULL,
  svg_path    TEXT NOT NULL,
  caption     TEXT NOT NULL,
  FOREIGN KEY (topic_id) REFERENCES Modules_Topics(topic_id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS Textbook_Chapters (
  chapter_id  INTEGER PRIMARY KEY AUTOINCREMENT,
  book_title  TEXT NOT NULL,
  chapter_no  TEXT NOT NULL,
  chapter_title TEXT NOT NULL,
  topic_id    INTEGER,
  objectives  TEXT NOT NULL,
  FOREIGN KEY (topic_id) REFERENCES Modules_Topics(topic_id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_osce_dept ON OSCE_Stations(department);
CREATE INDEX IF NOT EXISTS idx_img_topic ON Medical_Images(topic_id);
CREATE INDEX IF NOT EXISTS idx_ch_book ON Textbook_Chapters(book_title);
