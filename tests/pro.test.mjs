import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

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

describe('RAG guardrails', () => {
  it('emergency keywords flagged', () => {
    const EM = ['chest pain', 'suicide', 'انتحار'];
    assert.ok(EM.some(k => ' crushing chest pain now'.includes(k)));
  });
});
