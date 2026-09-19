-- AI Tour Medical Application | SQLite Schema (Local-First)
-- Engine: SQLite 3.x | Enforces FK constraints
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS Academic_Levels (
  level_id     INTEGER PRIMARY KEY AUTOINCREMENT,
  level_name   TEXT NOT NULL UNIQUE,
  system_type  TEXT NOT NULL CHECK (system_type IN ('basic','preclinical','clinical','internship'))
);

CREATE TABLE IF NOT EXISTS Courses (
  course_id      INTEGER PRIMARY KEY AUTOINCREMENT,
  level_id       INTEGER NOT NULL,
  course_name_ar TEXT NOT NULL,
  course_name_en TEXT NOT NULL,
  department     TEXT NOT NULL,
  credit_hours   INTEGER NOT NULL CHECK (credit_hours > 0),
  FOREIGN KEY (level_id) REFERENCES Academic_Levels(level_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Modules_Topics (
  topic_id        INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id       INTEGER NOT NULL,
  parent_topic_id INTEGER,
  topic_title     TEXT NOT NULL,
  content_type    TEXT NOT NULL CHECK (content_type IN ('module','lecture','pdf','topic','subtopic')),
  detailed_content TEXT,
  FOREIGN KEY (course_id) REFERENCES Courses(course_id) ON DELETE CASCADE,
  FOREIGN KEY (parent_topic_id) REFERENCES Modules_Topics(topic_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS References_Books (
  reference_id      INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id         INTEGER,
  book_title        TEXT NOT NULL,
  author            TEXT NOT NULL,
  edition           TEXT,
  pdf_path_or_link  TEXT,
  FOREIGN KEY (course_id) REFERENCES Courses(course_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS Question_Bank (
  question_id    INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id       INTEGER NOT NULL,
  question_type  TEXT NOT NULL CHECK (question_type IN ('mcq_single','mcq_multi','osce','clinical_vignette')),
  question_text  TEXT NOT NULL,
  options_json   TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation    TEXT NOT NULL,
  exam_source    TEXT NOT NULL,
  FOREIGN KEY (topic_id) REFERENCES Modules_Topics(topic_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Clinical_Cases (
  case_id                INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id          TEXT NOT NULL,
  chief_complaint        TEXT NOT NULL,
  history_present_illness TEXT NOT NULL,
  physical_exam          TEXT NOT NULL,
  investigations         TEXT NOT NULL,
  differential_dx        TEXT NOT NULL,
  management_plan        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Student_Progress (
  progress_id       INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           TEXT NOT NULL,
  topic_id          INTEGER NOT NULL,
  completion_status TEXT NOT NULL CHECK (completion_status IN ('not_started','in_progress','completed')),
  last_reviewed_at  TEXT,
  quiz_score_avg    REAL CHECK (quiz_score_avg IS NULL OR (quiz_score_avg >= 0 AND quiz_score_avg <= 100)),
  FOREIGN KEY (topic_id) REFERENCES Modules_Topics(topic_id) ON DELETE CASCADE,
  UNIQUE(user_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_courses_level ON Courses(level_id);
CREATE INDEX IF NOT EXISTS idx_topics_course ON Modules_Topics(course_id);
CREATE INDEX IF NOT EXISTS idx_topics_parent ON Modules_Topics(parent_topic_id);
CREATE INDEX IF NOT EXISTS idx_qb_topic ON Question_Bank(topic_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON Student_Progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_topic ON Student_Progress(topic_id);
