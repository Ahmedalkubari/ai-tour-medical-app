// Structured JSON extractor: unstructured text / raw PDF text -> normalized curriculum/QA JSON
export function extractQuestions(raw) {
  // Expects lines like: Q: ... | A) ... B) ... C) ... D) ... | Answer: X | Explain: ... | Source: ...
  const out = [];
  const blocks = String(raw).split(/\n{2,}/);
  for (const b of blocks) {
    const q = /Q:\s*(.+)/i.exec(b)?.[1]?.trim();
    if (!q) continue;
    const opts = {};
    for (const L of ['A', 'B', 'C', 'D']) {
      const m = new RegExp(L + '\\)\\s*([^|\\n]+)').exec(b);
      if (m) opts[L] = m[1].trim();
    }
    const ans = /Answer:\s*([A-D]|[^|\n]+)/i.exec(b)?.[1]?.trim();
    const exp = /Explain:\s*([^|]+)/i.exec(b)?.[1]?.trim() || '';
    const src = /Source:\s*([^\n]+)/i.exec(b)?.[1]?.trim() || 'Pipeline-Extract';
    if (q && Object.keys(opts).length >= 2 && ans) out.push({ question_text: q, options: opts, correct_answer: ans, explanation: exp, exam_source: src });
  }
  return out;
}
export function mapTopicId(department, fallback = 1) {
  const m = { anatomy: 1, physiology: 2, pathology: 3, pharmacology: 4, medicine: 5, surgery: 6, pediatrics: 7, obgyn: 8 };
  return m[String(department || '').toLowerCase()] || fallback;
}
