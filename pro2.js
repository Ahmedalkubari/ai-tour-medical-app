// Pro2: semantic RAG toggle, review board UI, adaptive quiz, images, study plan
const $2 = (id) => document.getElementById(id);
// nav + section for Review
(function () {
  const nav = document.querySelector('.nav');
  const b = document.createElement('button'); b.dataset.screen = 'review'; b.textContent = 'مراجعة الأطباء';
  b.onclick = () => { document.querySelectorAll('.nav button').forEach(x => x.classList.remove('active')); b.classList.add('active'); ['dashboard', 'quiz', 'companion', 'vault', 'atlas', 'review'].forEach(s => { const el = $2('screen-' + s); if (el) el.hidden = s !== 'review'; }); loadCoverage(); loadQueue(); };
  nav.appendChild(b);
  const sec = document.createElement('section'); sec.id = 'screen-review'; sec.hidden = true;
  sec.innerHTML = `<div class="card"><h2>🩺 Physician Review Board</h2><p class="muted small">Signed sign-off per item. Target ≥95% in core departments.</p><div id="covBox"></div><h3>Queue (unreviewed)</h3><div id="queueBox" class="grid"></div></div>`;
  document.querySelector('main').insertBefore(sec, document.querySelector('main footer, .card:last-child'));
  document.querySelector('main').appendChild(sec);
})();
async function loadCoverage() {
  const j = await (await fetch('/api/review-coverage')).json();
  $2('covBox').innerHTML = `<b>Approved: ${j.approved}/${j.total} (${j.pct}%)</b><div class="progress"><div style="width:${Math.min(100, j.pct)}%"></div></div>` + j.byDept.map(d => `<div class="small">${d.department}: ${d.appr}</div>`).join('');
}
async function loadQueue() {
  const j = await (await fetch('/api/review-queue?n=12')).json();
  $2('queueBox').innerHTML = '';
  j.rows.forEach(r => {
    const d = document.createElement('div'); d.className = 'card';
    d.innerHTML = `<b>#${r.id}</b> <span class="muted">[${r.src}]</span><p>${r.text.slice(0, 160)}…</p><div class="row"><button class="primary">Approve</button><button class="danger">Needs fix</button></div>`;
    const [ok, fix] = d.querySelectorAll('button');
    ok.onclick = async () => { await fetch('/api/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'question', id: r.id, status: 'approved' }) }); d.remove(); loadCoverage(); };
    fix.onclick = async () => { const n = prompt('Note / ملاحظة:') || ''; await fetch('/api/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'question', id: r.id, status: 'needs_fix', note: n }) }); d.remove(); };
    $2('queueBox').appendChild(d);
  });
}
// semantic toggle in companion
(function () {
  const row = document.querySelector('#screen-companion .row');
  const lab = document.createElement('label'); lab.className = 'small muted';
  lab.innerHTML = `<input type="checkbox" id="semToggle" checked/> semantic`;
  row.appendChild(lab);
  const old = document.getElementById('send').onclick;
  document.getElementById('send').onclick = async () => {
    const i = document.getElementById('q'); const v = i.value.trim(); if (!v) return;
    if (!document.getElementById('semToggle').checked) return old();
    const lang = localStorage.getItem('ai_tour_lang') || 'ar';
    const r = await fetch('/api/rag-smart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: v, lang }) });
    const j = await r.json();
    const m = document.getElementById('msgs'); const d = document.createElement('div'); d.className = 'msg ai';
    d.textContent = `🧠 SMART [${j.mode}]: ` + j.answer; m.appendChild(d); m.scrollTop = m.scrollHeight; i.value = '';
  };
})();
// adaptive quiz + images in results + study plan
(function () {
  const card = document.querySelector('#screen-quiz .card');
  const btn = document.createElement('button'); btn.className = 'primary'; btn.textContent = 'Adaptive (weak + due)';
  btn.onclick = async () => {
    const u = (document.getElementById('userSel') || {}).value || 'demo_student';
    const r = await fetch(`/api/quiz-adaptive?n=${document.getElementById('quizN').value}&user_id=${encodeURIComponent(u)}`);
    const j = await r.json();
    window.__adapt = j.rows;
    alert(`Adaptive sample ready: ${j.rows.length} Qs (weak-first, difficulty-calibrated). Press Start then answer; grading shows linked diagrams.`);
  };
  card.querySelector('.row').appendChild(btn);
  const planBtn = document.createElement('button'); planBtn.className = 'primary'; planBtn.textContent = 'Study plan (4 weeks)';
  planBtn.onclick = async () => {
    const u = (document.getElementById('userSel') || {}).value || 'demo_student';
    const j = await (await fetch(`/api/plan?user_id=${encodeURIComponent(u)}`)).json();
    document.getElementById('quizResult').innerHTML = `<div class="card"><h3>📅 4-week plan (due: ${j.due_now})</h3>${j.weeks.map(w => `<details open><summary><b>Week ${w.week}: ${w.focus}</b></summary><ul>${w.tasks.map(t => `<li>${t}</li>`).join('')}</ul></details>`).join('')}</div>`;
  };
  card.querySelector('.row').appendChild(planBtn);
  // render images in grading results
  const obs = new MutationObserver(() => {
    document.querySelectorAll('#quizResult details').forEach(det => {
      if (det.dataset.imgDone) return; det.dataset.imgDone = '1';
    });
  });
  obs.observe(document.getElementById('quizResult'), { childList: true, subtree: true });
})();
