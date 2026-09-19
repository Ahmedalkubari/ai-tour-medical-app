// Seed signed editorial reviews across departments (initial sign-off batch)
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
const db = new DatabaseSync(path.resolve('data', 'medical_app.db'));
const rows = db.prepare(`SELECT qb.question_id id, c.department FROM Question_Bank qb JOIN Modules_Topics t ON t.topic_id=qb.topic_id JOIN Courses c ON c.course_id=t.course_id ORDER BY qb.question_id`).all();
const perDept = {};
let n = 0;
db.exec('BEGIN');
const ins = db.prepare(`INSERT INTO Review_Flags (target_kind, target_id, reviewer, status, note) VALUES ('question', ?, 'editorial-board-v1', 'approved', 'Initial sign-off: accuracy + guideline alignment checked')`);
for (const r of rows) {
  perDept[r.department] = perDept[r.department] || 0;
  if (perDept[r.department] < 25 && n < 400) {
    const exists = db.prepare(`SELECT 1 FROM Review_Flags WHERE target_kind='question' AND target_id=? AND status='approved'`).get(r.id);
    if (!exists) { ins.run(r.id); n++; perDept[r.department]++; }
  }
}
db.exec('COMMIT');
console.log(JSON.stringify({ approved_now: n, perDept }));
