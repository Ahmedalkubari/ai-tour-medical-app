// Build honestly-labeled lite vectors (hash-trigram, dim=128) for full neural-path coverage.
// Real MiniLM: use scripts/import-minilm.mjs with JSONL {qid, vec} from paraphrase-multilingual-MiniLM-L12-v2.
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
const db = new DatabaseSync(path.resolve('data', 'medical_app.db'));
try { db.exec(`CREATE TABLE IF NOT EXISTS Question_Embeddings (question_id INTEGER PRIMARY KEY, model TEXT NOT NULL, dim INTEGER NOT NULL, vec_json TEXT NOT NULL)`); } catch {}
const arNorm = (s) => String(s || '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();
const tok = (s) => { const t = arNorm(s).replace(/[^a-z0-9\u0600-\u06ff\s]/g, ' ').split(/\s+/).filter(w => w.length > 2); const bi = []; for (let i = 0; i + 1 < t.length; i++) bi.push(t[i] + '_' + t[i + 1]); return [...t, ...bi]; };
const DIM = 128;
const vec = (text) => { const v = new Array(DIM).fill(0); for (const w of tok(text)) { let h = 0; for (const c of w) h = (h * 31 + c.codePointAt(0)) >>> 0; v[h % DIM] += 1; } const n = Math.sqrt(v.reduce((a, b) => a + b * b, 0)) || 1; return v.map(x => +(x / n).toFixed(5)); };
const rows = db.prepare('SELECT question_id, question_text, explanation FROM Question_Bank').all();
const ins = db.prepare('INSERT OR REPLACE INTO Question_Embeddings (question_id, model, dim, vec_json) VALUES (?,?,?,?)');
db.exec('BEGIN');
for (const r of rows) ins.run(r.question_id, 'hash-trigram-lite', DIM, JSON.stringify(vec(r.question_text + ' ' + r.explanation)));
db.exec('COMMIT');
console.log('vectors built:', rows.length, 'model=hash-trigram-lite (NOT MiniLM — see import-minilm.mjs for real weights)');
