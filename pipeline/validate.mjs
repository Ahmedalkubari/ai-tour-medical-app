// FK + non-null structural validation for medical_app.db
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const DB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'medical_app.db');
const db = new DatabaseSync(DB);
db.exec('PRAGMA foreign_keys=ON');
const fk = db.prepare('PRAGMA foreign_key_check').all();
const nullQ = db.prepare(`SELECT COUNT(*) c FROM Question_Bank WHERE question_text IS NULL OR options_json IS NULL OR correct_answer IS NULL OR explanation IS NULL OR exam_source IS NULL`).get().c;
const badOpt = db.prepare(`SELECT question_id, options_json FROM Question_Bank`).all().filter(r => { try { const o = JSON.parse(r.options_json); return !o.A || !o.B || !o.C || !o.D; } catch { return true; } });
console.log(JSON.stringify({ fk_violations: fk.length, null_critical: nullQ, bad_options_rows: badOpt.length }, null, 2));
if (fk.length || nullQ || badOpt.length) { console.error('VALIDATION FAILED'); process.exit(1); }
console.log('VALIDATION PASSED');
