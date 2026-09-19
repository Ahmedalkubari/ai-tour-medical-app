// AI Tour Pro API + static server (live SQLite, FTS5, quiz, SRS, RAG, sync)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const ROOT = process.cwd();
const DB_PATH = path.join(ROOT, 'data', 'medical_app.db');
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys=ON');
try { db.exec(fs.readFileSync(path.join(ROOT, 'db', 'migration_v3.sql'), 'utf8')); } catch {}
try { db.exec(fs.readFileSync(path.join(ROOT, 'db', 'migration_v4.sql'), 'utf8')); } catch {}
// auto-link: each question -> one diagram sharing its topic (deterministic)
try {
  db.exec(`INSERT OR IGNORE INTO Question_Images (question_id, image_id)
    SELECT q.question_id, (SELECT image_id FROM Medical_Images m WHERE m.topic_id=q.topic_id ORDER BY image_id LIMIT 1)
    FROM Question_Bank q WHERE (SELECT image_id FROM Medical_Images m WHERE m.topic_id=q.topic_id ORDER BY image_id LIMIT 1) IS NOT NULL`);
} catch {}

function rebuildFTS() {
  db.exec('DELETE FROM FTS_Questions; DELETE FROM FTS_Topics; DELETE FROM FTS_Cases;');
  const q = db.prepare('SELECT question_id, question_text, explanation, exam_source FROM Question_Bank').all();
  const iq = db.prepare('INSERT INTO FTS_Questions (rowid, question_text, explanation, exam_source) VALUES (?,?,?,?)');
  db.exec('BEGIN'); for (const r of q) iq.run(r.question_id, r.question_text, r.explanation, r.exam_source); db.exec('COMMIT');
  const t = db.prepare('SELECT topic_id, topic_title, detailed_content FROM Modules_Topics').all();
  const it = db.prepare('INSERT INTO FTS_Topics (rowid, topic_title, detailed_content) VALUES (?,?,?)');
  db.exec('BEGIN'); for (const r of t) it.run(r.topic_id, r.topic_title, r.detailed_content || ''); db.exec('COMMIT');
  const c = db.prepare('SELECT case_id, chief_complaint, history_present_illness, differential_dx, management_plan FROM Clinical_Cases').all();
  const ic = db.prepare('INSERT INTO FTS_Cases (rowid, chief_complaint, history_present_illness, differential_dx, management_plan) VALUES (?,?,?,?,?)');
  db.exec('BEGIN'); for (const r of c) ic.run(r.case_id, r.chief_complaint, r.history_present_illness, r.differential_dx, r.management_plan); db.exec('COMMIT');
}
try { if (!db.prepare('SELECT COUNT(*) c FROM FTS_Questions').get().c) rebuildFTS(); } catch { rebuildFTS(); }

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.db': 'application/octet-stream' };
const send = (res, code, obj, type = 'application/json') => { res.writeHead(code, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*' }); res.end(typeof obj === 'string' ? obj : JSON.stringify(obj)); };
const parseQ = (url) => Object.fromEntries(new URL(url, 'http://x').searchParams.entries());

// --- SM-2 (server mirror; client is source of truth offline) ---
function sm2(prev, grade) {
  let { ease = 2.5, interval_d = 0, reps = 0 } = prev || {};
  if (grade >= 3) {
    reps += 1;
    if (reps === 1) interval_d = 1; else if (reps === 2) interval_d = 6; else interval_d = Math.round(interval_d * ease);
    ease = Math.max(1.3, ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));
  } else { reps = 0; interval_d = 1; }
  return { ease, interval_d, reps };
}

// --- Local RAG: keyword retrieval + cited synthesis + guardrails ---
const EMERGENCY = ['chest pain', 'ألم الصدر', 'anaphylaxis', 'stridor at rest', 'seizure', 'suicide', 'انتحار', 'bleeding', 'نزيف', 'soba', 'stroke', 'سكتة'];
function rag(query, lang = 'ar') {
  const flags = EMERGENCY.filter(k => query.toLowerCase().includes(k));
  let hits = [];
  try {
    hits = db.prepare(`SELECT question_id, question_text, explanation, exam_source FROM FTS_Questions WHERE FTS_Questions MATCH ? ORDER BY rank LIMIT 5`).all(query.replace(/["*]/g, ' ').split(/\s+/).filter(w => w.length > 2).slice(0, 6).join(' OR ') || 'pain');
  } catch { hits = db.prepare('SELECT question_id, question_text, explanation, exam_source FROM Question_Bank ORDER BY question_id LIMIT 5').all(); }
  const cases = db.prepare('SELECT case_id, chief_complaint, management_plan FROM Clinical_Cases ORDER BY case_id LIMIT 3').all();
  const warn = flags.length ? (lang === 'ar' ? `تنبيه عاجل (${flags.join('،')}): هذه حالة طارئة محتملة — اطلب الإسعاف/إشراف طبي فوراً ولا تعتمد على التطبيق وحده.` : `URGENT (${flags.join(', ')}): possible emergency — call emergency services / senior supervision immediately.`) : '';
  const body = hits.map((h, i) => `[${i + 1}] ${h.question_text}\n    → ${h.explanation} (${h.exam_source}, Q#${h.question_id})`).join('\n');
  const answer = `${warn}\n${lang === 'ar' ? 'خلاصة مبنية على بنك الأسئلة المحلي مع الاستشهاد:' : 'Local-bank grounded summary with citations:'}\n${body}\n${lang === 'ar' ? `حالات مرتبطة: ${cases.map(c => `#${c.case_id} ${c.chief_complaint}`).join('؛ ')}` : `Linked cases: ${cases.map(c => `#${c.case_id} ${c.chief_complaint}`).join('; ')}`}\n— ${lang === 'ar' ? 'تعليمي فقط، ليس استشارة طبية. تحقق من المرجع الأصلي.' : 'Educational only, not medical advice. Verify against primary reference.'}`;
  return { answer, citations: hits.map(h => ({ qid: h.question_id, source: h.exam_source })), emergency: flags };
}

// --- Semantic-lite retrieval: TF-IDF cosine over question corpus (no deps, offline) ---
const tok = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
let TF = null;
function buildTF() {
  const docs = db.prepare('SELECT question_id, question_text, explanation FROM Question_Bank').all();
  const df = {}, vecs = [];
  for (const d of docs) {
    const tf = {};
    for (const w of tok(d.question_text + ' ' + d.explanation)) tf[w] = (tf[w] || 0) + 1;
    for (const w of Object.keys(tf)) df[w] = (df[w] || 0) + 1;
    vecs.push({ id: d.question_id, tf });
  }
  TF = { vecs, df, N: docs.length };
}
function cosSim(qvec, dvec, df, N) {
  let dot = 0, qn = 0, dn = 0;
  for (const [w, qtf] of Object.entries(qvec)) {
    const idf = Math.log(1 + N / ((df[w] || 0) + 1));
    const qw = qtf * idf; qn += qw * qw;
    const dw = (dvec[w] || 0) * idf; dn += dw * dw; dot += qw * dw;
  }
  return qn && dn ? dot / (Math.sqrt(qn) * Math.sqrt(dn)) : 0;
}
function semSearch(query, k = 5) {
  if (!TF) buildTF();
  const qtf = {}; for (const w of tok(query)) qtf[w] = (qtf[w] || 0) + 1;
  const scored = TF.vecs.map(v => ({ id: v.id, s: cosSim(qtf, v.tf, TF.df, TF.N) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, k);
  const g = db.prepare('SELECT question_id, question_text, explanation, exam_source FROM Question_Bank WHERE question_id=?');
  return scored.map(x => ({ ...g.get(x.id), score: +x.s.toFixed(3) }));
}
function ragSem(query, lang = 'ar') {
  const base = rag(query, lang);
  const sem = semSearch(query, 5);
  const extra = sem.map((h, i) => `[S${i + 1}|cos=${h.score}] Q#${h.question_id}: ${h.question_text}\n    → ${h.explanation} (${h.exam_source})`).join('\n');
  return { ...base, semantic: sem.map(h => ({ qid: h.question_id, source: h.exam_source, score: h.score })), answer: `${base.answer}\n${lang === 'ar' ? 'أدلة دلالية (TF-IDF cosine):' : 'Semantic evidence (TF-IDF cosine:'}\n${extra}\n— ${lang === 'ar' ? 'وضع LLM الخارجي: ' + (JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'llm.json'), 'utf8')).provider) + ' (استخلاصي محلي افتراضياً؛ فعّل Ollama/WebLLM اختيارياً).' : 'External LLM mode: extractive-local by default; enable Ollama/WebLLM optionally.'}` };
}
const SYN = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'synonyms.json'), 'utf8'));
const arNorm = (s) => String(s || '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();
const tok2 = (s) => { const t = arNorm(s).replace(/[^a-z0-9\u0600-\u06ff\s]/g, ' ').split(/\s+/).filter(w => w.length > 2); const bi = []; for (let i = 0; i + 1 < t.length; i++) bi.push(t[i] + '_' + t[i + 1]); return [...t, ...bi]; };
function expandQ(query) {
  const base = tok2(query); const out = new Set(base);
  const low = arNorm(query);
  for (const [k, syns] of Object.entries(SYN)) {
    if (low.includes(k) || syns.some(s => low.includes(arNorm(s)))) { syns.forEach(s => tok2(s).forEach(w => out.add(w))); tok2(k).forEach(w => out.add(w)); }
  }
  return [...out];
}
let BM = null;
function buildBM() {
  const docs = db.prepare('SELECT question_id, question_text, explanation FROM Question_Bank').all();
  const df = {}, Lens = [], vecs = [];
  for (const d of docs) {
    const tf = {}; const toks = tok2(d.question_text + ' ' + d.explanation);
    for (const w of toks) tf[w] = (tf[w] || 0) + 1;
    for (const w of Object.keys(tf)) df[w] = (df[w] || 0) + 1;
    Lens.push(toks.length); vecs.push({ id: d.question_id, tf, len: toks.length });
  }
  BM = { vecs, df, N: docs.length, avgL: Lens.reduce((a, b) => a + b, 0) / Math.max(1, Lens.length) };
}
function bm25(query, k = 5) {
  if (!BM) buildBM();
  const qtf = {}; for (const w of expandQ(query)) qtf[w] = (qtf[w] || 0) + 1;
  const K1 = 1.5, B = 0.75;
  const scored = BM.vecs.map(v => {
    let s = 0;
    for (const w of Object.keys(qtf)) {
      const f = v.tf[w] || 0; if (!f) continue;
      const idf = Math.log(1 + (BM.N - (BM.df[w] || 0) + 0.5) / ((BM.df[w] || 0) + 0.5));
      s += idf * (f * (K1 + 1)) / (f + K1 * (1 - B + B * (v.len / BM.avgL)));
    }
    return { id: v.id, s };
  }).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, k);
  const g = db.prepare('SELECT question_id, question_text, explanation, exam_source FROM Question_Bank WHERE question_id=?');
  return scored.map(x => ({ ...g.get(x.id), score: +x.s.toFixed(3) }));
}
async function ollamaGen(prompt) {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'llm.json'), 'utf8'));
  if (!cfg.ollama?.enabled) return null;
  try {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 20000);
    const r = await fetch((cfg.ollama.url || 'http://localhost:11434') + '/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal, body: JSON.stringify({ model: cfg.ollama.model || 'meditron:7b', prompt: prompt.slice(0, 3000), stream: false }) });
    clearTimeout(t);
    const j = await r.json();
    return j.response ? String(j.response).slice(0, 2000) : null;
  } catch { return null; }
}
async function ragSmart(query, lang = 'ar') {
  const base = rag(query, lang);
  const sem = bm25(query, 5);
  const extra = sem.map((h, i) => `[B${i + 1}|bm25=${h.score}] Q#${h.question_id}: ${h.question_text}\n    → ${h.explanation} (${h.exam_source})`).join('\n');
  const ctx = `Question: ${query}\nEvidence:\n${extra}\nAnswer concisely with citations [B1..B5], flag emergencies, end with: educational only.`;
  const llm = await ollamaGen(ctx);
  return { ...base, semantic: sem.map(h => ({ qid: h.question_id, source: h.exam_source, score: h.score })), mode: llm ? 'ollama' : 'extractive-bm25',
    answer: `${base.answer}\n${lang === 'ar' ? 'أدلة BM25 (عربي/إنجليزي + مرادفات):' : 'BM25 evidence (AR/EN + synonyms):'}\n${extra}${llm ? `\n🤖 Ollama draft:\n${llm}` : `\n(Ollama معطّل — عزز في data/llm.json. الوضع الحالي: استخلاصي محلي.)`}` };
}
const qImages = (qid) => db.prepare('SELECT m.image_id, m.title, m.svg_path, m.caption FROM Question_Images qi JOIN Medical_Images m ON m.image_id=qi.image_id WHERE qi.question_id=?').all(qid);

const server = http.createServer((req, res) => {
  const [_, ...parts] = req.url.split('?')[0].split('/');
  const q = parseQ(req.url);
  try {
    // API
    if (parts[0] === 'api') {
      if (parts[1] === 'health') return send(res, 200, { ok: true, ts: new Date().toISOString() });
      if (parts[1] === 'rebuild-fts' && req.method === 'POST') { rebuildFTS(); return send(res, 200, { ok: true }); }
      if (parts[1] === 'search') {
        const s = (q.q || '').slice(0, 120); const page = Math.max(1, +q.page || 1); const per = Math.min(50, +q.per || 12); const off = (page - 1) * per;
        let out = { questions: [], topics: [], cases: [] };
        if (s.length > 1) {
          try {
            const m = s.replace(/["*]/g, ' ').split(/\s+/).filter(w => w.length > 1).map(w => `"${w}"`).join(' OR ');
            out.questions = db.prepare(`SELECT q.question_id, q.question_text, q.exam_source FROM FTS_Questions f JOIN Question_Bank q ON q.question_id=f.rowid WHERE FTS_Questions MATCH ? ORDER BY rank LIMIT ? OFFSET ?`).all(m, per, off);
            out.topics = db.prepare(`SELECT t.topic_id, t.topic_title FROM FTS_Topics f JOIN Modules_Topics t ON t.topic_id=f.rowid WHERE FTS_Topics MATCH ? ORDER BY rank LIMIT ?`).all(m, per);
            out.cases = db.prepare(`SELECT c.case_id, c.chief_complaint FROM FTS_Cases f JOIN Clinical_Cases c ON c.case_id=f.rowid WHERE FTS_Cases MATCH ? ORDER BY rank LIMIT ?`).all(m, 8);
          } catch {}
        }
        return send(res, 200, { ...out, page, per });
      }
      if (parts[1] === 'questions') {
        const page = Math.max(1, +q.page || 1); const per = Math.min(50, +q.per || 10); const off = (page - 1) * per;
        const subj = q.subject ? `WHERE exam_source LIKE '%${q.subject.replace(/'/g, '')}%'` : '';
        const total = db.prepare(`SELECT COUNT(*) c FROM Question_Bank ${subj}`).get().c;
        const rows = db.prepare(`SELECT question_id, question_type, question_text, options_json, correct_answer, explanation, exam_source FROM Question_Bank ${subj} ORDER BY question_id LIMIT ? OFFSET ?`).all(per, off);
        return send(res, 200, { total, page, per, rows });
      }
      if (parts[1] === 'quiz-sample') {
        const n = Math.min(50, +q.n || 10);
        const rows = db.prepare(`SELECT question_id, question_text, options_json FROM Question_Bank ORDER BY RANDOM() LIMIT ?`).all(n);
        return send(res, 200, { rows, time_sec: (+q.minutes || 10) * 60 });
      }
      if (parts[1] === 'quiz-grade' && req.method === 'POST') {
        let body = ''; req.on('data', c => body += c); return req.on('end', () => {
          const { answers = {}, user_id = 'demo_student' } = JSON.parse(body || '{}');
          const ids = Object.keys(answers).map(Number).filter(Boolean);
          let correct = 0; const detail = [];
          const g = db.prepare('SELECT question_id, correct_answer, explanation, exam_source, topic_id FROM Question_Bank WHERE question_id=?');
          const up = db.prepare(`INSERT INTO SRS_Schedule (user_id, question_id, ease, interval_d, reps, due_at, last_grade) VALUES (?,?,?,?,?,datetime('now', '+' || ? || ' days'),?)
            ON CONFLICT(user_id, question_id) DO UPDATE SET ease=excluded.ease, interval_d=excluded.interval_d, reps=excluded.reps, due_at=excluded.due_at, last_grade=excluded.last_grade`);
          for (const id of ids) {
            const row = g.get(id); if (!row) continue;
            const ok = String(answers[id]).trim() === String(row.correct_answer).trim();
            if (ok) correct++;
            const prev = db.prepare('SELECT ease, interval_d, reps FROM SRS_Schedule WHERE user_id=? AND question_id=?').get(user_id, id);
            const s = sm2(prev || {}, ok ? 4 : 1);
            up.run(user_id, id, s.ease, s.interval_d, s.reps, s.interval_d, ok ? 4 : 1);
            db.prepare(`INSERT INTO Question_Stats (question_id, attempts, correct, difficulty, updated_at) VALUES (?,?,?,datetime('now'))
              ON CONFLICT(question_id) DO UPDATE SET attempts=attempts+1, correct=correct+?, difficulty=1.0* (correct+?)*1.0/(attempts+1), updated_at=datetime('now')`).run(id, 1, ok ? 1 : 0, ok ? 1 : 0, ok ? 1 : 0);
            detail.push({ qid: id, ok, correct_answer: row.correct_answer, explanation: row.explanation, source: row.exam_source, topic_id: row.topic_id, images: qImages(id) });
          }
          // weak areas
          const weak = db.prepare(`SELECT t.topic_title, COUNT(*) n FROM SRS_Schedule s JOIN Question_Bank qb ON qb.question_id=s.question_id JOIN Modules_Topics t ON t.topic_id=qb.topic_id WHERE s.user_id=? AND s.last_grade<3 GROUP BY t.topic_id ORDER BY n DESC LIMIT 5`).all(user_id);
          const due = db.prepare(`SELECT COUNT(*) c FROM SRS_Schedule WHERE user_id=? AND due_at<=datetime('now')`).get(user_id).c;
          send(res, 200, { score: ids.length ? Math.round(100 * correct / ids.length) : 0, correct, total: ids.length, detail, weak_areas: weak, due_now: due });
        });
      }
      if (parts[1] === 'srs-due') {
        const rows = db.prepare(`SELECT s.question_id, q.question_text FROM SRS_Schedule s JOIN Question_Bank q ON q.question_id=s.question_id WHERE s.user_id=? AND s.due_at<=datetime('now') ORDER BY s.due_at LIMIT 50`).all(q.user_id || 'demo_student');
        return send(res, 200, { rows });
      }
      if (parts[1] === 'rag' && req.method === 'POST') {
        let body = ''; req.on('data', c => body += c); return req.on('end', () => {
          const { query = '', lang = 'ar' } = JSON.parse(body || '{}');
          if (!query.trim()) return send(res, 400, { error: 'empty query' });
          send(res, 200, rag(query.slice(0, 500), lang));
        });
      }
      if (parts[1] === 'rag-sem' && req.method === 'POST') {
        let body = ''; req.on('data', c => body += c); return req.on('end', () => {
          const { query = '', lang = 'ar' } = JSON.parse(body || '{}');
          if (!query.trim()) return send(res, 400, { error: 'empty query' });
          send(res, 200, ragSem(query.slice(0, 500), lang));
        });
      }
      if (parts[1] === 'rag-smart' && req.method === 'POST') {
        let body = ''; req.on('data', c => body += c); return req.on('end', async () => {
          const { query = '', lang = 'ar' } = JSON.parse(body || '{}');
          if (!query.trim()) return send(res, 400, { error: 'empty query' });
          send(res, 200, await ragSmart(query.slice(0, 500), lang));
        });
      }
      if (parts[1] === 'review-queue') {
        const rows = db.prepare(`SELECT q.question_id id, q.question_text text, q.exam_source src, 'question' kind FROM Question_Bank q LEFT JOIN Review_Flags f ON f.target_kind='question' AND f.target_id=q.question_id AND f.status='approved' WHERE f.flag_id IS NULL ORDER BY q.question_id LIMIT ?`).all(Math.min(50, +q.n || 20));
        return send(res, 200, { rows });
      }
      if (parts[1] === 'review' && req.method === 'POST') {
        let body = ''; req.on('data', c => body += c); return req.on('end', () => {
          const { kind = 'question', id, reviewer = 'editorial-board', status = 'approved', note = '' } = JSON.parse(body || '{}');
          db.prepare(`INSERT INTO Review_Flags (target_kind, target_id, reviewer, status, note) VALUES (?,?,?,?,?)`).run(kind, id, reviewer, status, note.slice(0, 500));
          send(res, 200, { ok: true });
        });
      }
      if (parts[1] === 'review-coverage') {
        const total = db.prepare('SELECT COUNT(*) c FROM Question_Bank').get().c;
        const appr = db.prepare("SELECT COUNT(DISTINCT target_id) c FROM Review_Flags WHERE target_kind='question' AND status='approved'").get().c;
        const byDept = db.prepare(`SELECT c.department, COUNT(DISTINCT f.target_id) appr FROM Courses c JOIN Modules_Topics t ON t.course_id=c.course_id JOIN Question_Bank qb ON qb.topic_id=t.topic_id LEFT JOIN Review_Flags f ON f.target_kind='question' AND f.target_id=qb.question_id AND f.status='approved' GROUP BY c.department`).all();
        return send(res, 200, { total, approved: appr, pct: +(100 * appr / Math.max(1, total)).toFixed(1), byDept });
      }
      if (parts[1] === 'quiz-adaptive') {
        const n = Math.min(50, +q.n || 10); const uid = q.user_id || 'demo_student';
        const rows = db.prepare(`SELECT qb.question_id, qb.question_text, qb.options_json, COALESCE(st.difficulty, 0.5) d,
          CASE WHEN s.last_grade<3 THEN 0 ELSE 1 END weak
          FROM Question_Bank qb LEFT JOIN Question_Stats st ON st.question_id=qb.question_id
          LEFT JOIN SRS_Schedule s ON s.question_id=qb.question_id AND s.user_id=?
          ORDER BY weak ASC, ABS(COALESCE(st.difficulty,0.5)-0.5) ASC, RANDOM() LIMIT ?`).all(uid, n);
        return send(res, 200, { rows, time_sec: n * 60, mode: 'adaptive' });
      }
      if (parts[1] === 'plan') {
        const uid = q.user_id || 'demo_student';
        const weak = db.prepare(`SELECT t.topic_title, COUNT(*) n FROM SRS_Schedule s JOIN Question_Bank qb ON qb.question_id=s.question_id JOIN Modules_Topics t ON t.topic_id=qb.topic_id WHERE s.user_id=? AND s.last_grade<3 GROUP BY t.topic_id ORDER BY n DESC LIMIT 6`).all(uid);
        const due = db.prepare(`SELECT COUNT(*) c FROM SRS_Schedule WHERE user_id=? AND due_at<=datetime('now')`).get(uid).c;
        const weeks = weak.length ? weak.map((w, i) => ({ week: i % 4 + 1, focus: w.topic_title, tasks: [`20 adaptive Qs on ${w.topic_title}`, 'Review due SRS cards', 'Read linked chapter map + 1 OSCE station'] })) : [{ week: 1, focus: 'High-yield mixed review', tasks: ['20 adaptive Qs', 'Anatomy + Physiology core', '1 OSCE station'] }];
        return send(res, 200, { due_now: due, weeks });
      }
      if (parts[1] === 'error' && req.method === 'POST') {
        let body = ''; req.on('data', c => body += c); return req.on('end', () => {
          fs.appendFileSync(path.join(ROOT, 'data', 'client-errors.log'), `${new Date().toISOString()} ${body.slice(0, 500)}\n`);
          send(res, 200, { ok: true });
        });
      }
      if (parts[1] === 'university-map') {
        const f = path.join(ROOT, 'data', 'university-maps.json');
        return send(res, 200, JSON.parse(fs.readFileSync(f, 'utf8')));
      }
      if (parts[1] === 'guidelines') {
        const f = path.join(ROOT, 'data', 'guidelines.json');
        return send(res, 200, JSON.parse(fs.readFileSync(f, 'utf8')));
      }
      return send(res, 404, { error: 'unknown api' });
    }
    // static
    let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return send(res, 404, '404', 'text/plain');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  } catch (e) { send(res, 500, { error: String(e).slice(0, 300) }); }
});
server.listen(8080, () => console.log('AI Tour Pro API on http://localhost:8080'));
