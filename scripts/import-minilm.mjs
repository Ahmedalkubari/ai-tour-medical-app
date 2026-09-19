// Import REAL MiniLM vectors: JSONL lines {qid, vec:[...]} from paraphrase-multilingual-MiniLM-L12-v2 (dim 384).
// Produce with Python: sentence-transformers + export per question_id, then: node scripts/import-minilm.mjs vectors.jsonl
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
const f = process.argv[2];
if (!f) { console.error('usage: node scripts/import-minilm.mjs vectors.jsonl'); process.exit(1); }
const db = new DatabaseSync(path.resolve('data', 'medical_app.db'));
const ins = db.prepare('INSERT OR REPLACE INTO Question_Embeddings (question_id, model, dim, vec_json) VALUES (?,?,?,?)');
let n = 0;
db.exec('BEGIN');
for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const { qid, vec } = JSON.parse(line);
  ins.run(qid, 'paraphrase-multilingual-MiniLM-L12-v2', vec.length, JSON.stringify(vec));
  n++;
}
db.exec('COMMIT');
console.log('minilm imported:', n);
