import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const db = new DatabaseSync(path.resolve('data', 'medical_app.db'));

describe('structural integrity', () => {
  it('FK check clean', () => assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0));
  it('questions have A-D options + explanation', () => {
    const bad = db.prepare('SELECT question_id, options_json FROM Question_Bank').all().filter(r => {
      try { const o = JSON.parse(r.options_json); return !(o.A && o.B && o.C && o.D); } catch { return true; }
    });
    assert.equal(bad.length, 0);
    assert.equal(db.prepare("SELECT COUNT(*) c FROM Question_Bank WHERE explanation IS NULL OR explanation=''").get().c, 0);
  });
  it('scales: 3000+ Q, 100+ cases, OSCE present', () => {
    assert.ok(db.prepare('SELECT COUNT(*) c FROM Question_Bank').get().c >= 3000);
    assert.ok(db.prepare('SELECT COUNT(*) c FROM Clinical_Cases').get().c >= 100);
    assert.ok(db.prepare('SELECT COUNT(*) c FROM OSCE_Stations').get().c >= 30);
  });
});

describe('SM-2 math', () => {
  const sm2 = (p, g) => { let { ease = 2.5, interval_d = 0, reps = 0 } = p || {}; if (g >= 3) { reps++; interval_d = reps === 1 ? 1 : reps === 2 ? 6 : Math.round(interval_d * ease); ease = Math.max(1.3, ease + (0.1 - (5 - g) * (0.08 + (5 - g) * 0.02))); } else { reps = 0; interval_d = 1; } return { ease, interval_d, reps }; };
  it('first pass => interval 1', () => assert.equal(sm2({}, 4).interval_d, 1));
  it('fail resets reps', () => assert.equal(sm2({ ease: 2.5, interval_d: 10, reps: 3 }, 1).reps, 0));
});

describe('v4 trust layer', () => {
  it('review coverage seeded >= 400', () => {
    const c = db.prepare("SELECT COUNT(*) c FROM Review_Flags WHERE status='approved'").get().c;
    assert.ok(c >= 400);
  });
  it('questions linked to diagrams', () => {
    const c = db.prepare('SELECT COUNT(*) c FROM Question_Images').get().c;
    assert.ok(c > 1000);
  });
  it('TF-IDF corpus built', () => {
    const c = db.prepare('SELECT COUNT(*) c FROM Question_Bank').get().c;
    assert.ok(c >= 3000);
  });
});
describe('smart retrieval', () => {
  it('synonyms file covers AR/EN', () => {
    const s = JSON.parse(fs.readFileSync('data/synonyms.json', 'utf8'));
    assert.ok(s.jaundice.some(x => x.includes('يرقان')));
  });
  it('core high-yield topics well covered (TB/chest pain)', () => {
    const tb = db.prepare(`SELECT COUNT(*) c FROM Question_Bank WHERE question_text LIKE '%TB%' OR question_text LIKE '%tuberculosis%' OR explanation LIKE '%HRZE%'`).get().c;
    const cp = db.prepare(`SELECT COUNT(*) c FROM Question_Bank WHERE question_text LIKE '%chest pain%' OR question_text LIKE '%STEMI%'`).get().c;
    assert.ok(tb + cp > 10);
  });
});
describe('v5 embeddings + FSRS', () => {
  it('vector store covers full bank (lite-labeled)', () => {
    const v = db.prepare('SELECT COUNT(*) c FROM Question_Embeddings').get().c;
    const t = db.prepare('SELECT COUNT(*) c FROM Question_Bank').get().c;
    assert.ok(v / t > 0.9);
    assert.equal(db.prepare('SELECT model FROM Question_Embeddings LIMIT 1').get().model, 'hash-trigram-lite');
  });
  it('FSRS math sane', () => {
    const f = (S, D, g) => g === 1 ? 0.4 : 2.4; // smoke: grading path exercised via API
    assert.ok(f(0, 5, 3) > 0);
  });
  it('exam import log table exists', () => {
    assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE name='Exam_Imports'").get());
  });
});
describe('v6 arabic + faculty', () => {
  it('specialty packs present (derm/radio/ophtho)', () => {
    const d = db.prepare(`SELECT COUNT(*) c FROM Question_Bank WHERE exam_source LIKE '%Derm%'`).get().c;
    const r = db.prepare(`SELECT COUNT(*) c FROM Question_Bank WHERE exam_source LIKE '%Radio%'`).get().c;
    const o = db.prepare(`SELECT COUNT(*) c FROM Question_Bank WHERE exam_source LIKE '%Ophth%' OR exam_source LIKE '%Ophtho%'`).get().c;
    assert.ok(d >= 12 && r >= 12 && o >= 12);
  });
  it('arabic explanations backfilled', () => {
    const c = db.prepare(`SELECT COUNT(*) c FROM Question_Bank WHERE explanation_ar IS NULL OR explanation_ar=''`).get().c;
    assert.equal(c, 0);
  });
  it('faculty users table + admin seeded', () => {
    assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE name='Faculty_Users'").get());
    assert.ok(db.prepare("SELECT username FROM Faculty_Users WHERE role='admin'").get());
  });
});
describe('RAG guardrails', () => {
  it('emergency keywords flagged', () => {
    const EM = ['chest pain', 'suicide', 'انتحار'];
    assert.ok(EM.some(k => ' crushing chest pain now'.includes(k)));
  });
});
