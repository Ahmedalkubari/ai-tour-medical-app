// AI Tour Pro layer: live API, timed quiz, SM-2 client, RAG w/ citations, atlas, accounts, reminders
const API = '';
const $ = (id) => document.getElementById(id);
const store = {
  get users() { try { return JSON.parse(localStorage.getItem('at_users') || '["demo_student"]'); } catch { return ['demo_student']; } },
  set users(v) { localStorage.setItem('at_users', JSON.stringify(v)); },
  get user() { return localStorage.getItem('at_user') || 'demo_student'; },
  set user(v) { localStorage.setItem('at_user', v); },
};
// accounts + sync export/import
function initUsers() {
  const sel = $('userSel'); const render = () => { sel.innerHTML = ''; store.users.forEach(u => { const o = document.createElement('option'); o.value = o.textContent = u; sel.appendChild(o); }); sel.value = store.user; };
  render();
  sel.onchange = () => { store.user = sel.value; refreshDue(); };
  sel.ondblclick = () => { const n = prompt('New user / اسم مستخدم جديد:'); if (n && !store.users.includes(n)) { store.users = [...store.users, n]; store.user = n; render(); } };
}
async function apiStatus() {
  try { const r = await fetch(API + '/api/health'); $('apiStatus').textContent = 'API: live ✓'; return true; }
  catch { $('apiStatus').textContent = 'API: offline (embedded demo)'; return false; }
}
// extend nav + i18n labels
document.querySelectorAll('.nav button').forEach(b => b.onclick = () => {
  document.querySelectorAll('.nav button').forEach(x => x.classList.remove('active')); b.classList.add('active');
  ['dashboard', 'quiz', 'companion', 'vault', 'atlas'].forEach(s => { const el = $('screen-' + s); if (el) el.hidden = s !== b.dataset.screen; });
});
// ---- Live search override for vault ----
async function liveSearch(q) {
  try {
    const r = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}&per=12`);
    const j = await r.json();
    const el = $('vaultTree'); el.innerHTML = '';
    const sec = (t, rows, fmt) => { const d = document.createElement('details'); d.open = true; d.innerHTML = `<summary><b>${t} (${rows.length})</b> — live DB</summary><ul>${rows.map(fmt).join('')}</ul>`; el.appendChild(d); };
    sec('Questions', j.questions, x => `<li>Q#${x.question_id}: ${x.question_text.slice(0, 110)}… <span class="muted">[${x.exam_source}]</span></li>`);
    sec('Topics', j.topics, x => `<li>T#${x.topic_id}: ${x.topic_title}</li>`);
    sec('Cases', j.cases, x => `<li>C#${x.case_id}: ${x.chief_complaint}</li>`);
    return true;
  } catch { return false; }
}
$('vaultBtn').onclick = async () => { const q = $('vaultSearch').value; if (!(await liveSearch(q))) $('vaultTree').innerHTML = '<p class="muted">API offline — showing embedded demo tree.</p>'; };
$('vaultSearch').addEventListener('input', e => { clearTimeout(window.__vt); window.__vt = setTimeout(() => liveSearch(e.target.value), 400); });
// ---- Timed quiz ----
let QUIZ = { rows: [], t0: 0, timer: null, secs: 0 };
async function startQuiz() {
  const n = +$('quizN').value;
  const r = await fetch(`${API}/api/quiz-sample?n=${n}&minutes=${n}`);
  const j = await r.json(); QUIZ.rows = j.rows; QUIZ.secs = j.time_sec;
  const box = $('quizBox'); box.innerHTML = ''; $('quizResult').innerHTML = '';
  QUIZ.rows.forEach((row, i) => {
    const opts = JSON.parse(row.options_json);
    const d = document.createElement('div'); d.className = 'card';
    d.innerHTML = `<b>Q${i + 1} (#${row.question_id})</b><p>${row.question_text}</p>` + Object.entries(opts).map(([k, v]) => `<label style="display:block"><input type="radio" name="qq${row.question_id}" value="${String(v).replace(/"/g, '&quot;')}"/> <b>${k}.</b> ${v}</label>`).join('');
    box.appendChild(d);
  });
  clearInterval(QUIZ.timer);
  const t0 = Date.now();
  QUIZ.timer = setInterval(() => {
    const left = QUIZ.secs - Math.floor((Date.now() - t0) / 1000);
    $('quizTimer').textContent = left <= 0 ? '00:00' : `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
    if (left <= 0) { clearInterval(QUIZ.timer); gradeQuiz(); }
  }, 500);
}
async function gradeQuiz() {
  clearInterval(QUIZ.timer);
  const answers = {};
  QUIZ.rows.forEach(r => { const c = document.querySelector(`input[name="qq${r.question_id}"]:checked`); if (c) answers[r.question_id] = c.value; });
  const res = await fetch(API + '/api/quiz-grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers, user_id: store.user }) });
  const j = await res.json();
  $('quizResult').innerHTML = `<div class="card"><h3>Score: ${j.score}% (${j.correct}/${j.total})</h3><div class="muted">Due for review: ${j.due_now} • Weak: ${j.weak_areas.map(w => w.topic_title + '×' + w.n).join('، ') || '—'}</div>` +
    j.detail.map(d => `<details><summary>${d.ok ? '✅' : '❌'} Q#${d.qid} — ${d.correct_answer}</summary><p>${d.explanation} <span class="muted">[${d.source}]</span></p>${d.explanation_ar ? `<p class="muted">🇾🇪 ${d.explanation_ar}</p>` : ''}${(d.images || []).map(im => `<figure><img src="${im.svg_path}" alt="${im.title}" style="max-width:100%;border:1px solid var(--border);border-radius:10px"/><figcaption class="muted small">${im.title} — ${im.caption}</figcaption></figure>`).join('')}</details>`).join('') + `</div>`;
  try { Notification.requestPermission?.(); if (j.due_now) new Notification?.('AI Tour: review due', { body: `${j.due_now} cards due (SM-2)` }); } catch {}
  refreshDue();
}
async function refreshDue() {
  try { const r = await fetch(`${API}/api/srs-due?user_id=${encodeURIComponent(store.user)}`); const j = await r.json(); $('dueN').textContent = j.rows.length; } catch {}
}
$('quizStart').onclick = startQuiz; $('quizSubmit').onclick = gradeQuiz;
$('srsBtn').onclick = async () => {
  const r = await fetch(`${API}/api/srs-due?user_id=${encodeURIComponent(store.user)}`); const j = await r.json();
  $('quizResult').innerHTML = `<div class="card"><h3>Due now: ${j.rows.length}</h3><ul>${j.rows.map(x => `<li>#${x.question_id}: ${x.question_text.slice(0, 120)}…</li>`).join('')}</ul></div>`;
};
// ---- RAG upgrade for companion ----
async function ragAsk(q) {
  try {
    const lang = (localStorage.getItem('ai_tour_lang') || 'ar');
    const r = await fetch(API + '/api/rag', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q, lang }) });
    const j = await r.json();
    return j.answer + `\n[Citations: ${j.citations.map(c => 'Q#' + c.qid + '/' + c.source).join(', ')}]`;
  } catch { return null; }
}
const oldSend = $('send').onclick;
$('send').onclick = async () => {
  const i = $('q'); const v = i.value.trim(); if (!v) return;
  const ans = await ragAsk(v);
  if (ans) { const m = $('msgs'); const d = document.createElement('div'); d.className = 'msg ai'; d.textContent = '📚 RAG-live: ' + ans; m.appendChild(d); m.scrollTop = m.scrollHeight; i.value = ''; }
};
// ---- Atlas ----
$('uniBtn').onclick = async () => {
  const [u, g] = await Promise.all([(await fetch(API + '/api/university-map')).json(), (await fetch(API + '/api/guidelines')).json()]);
  const uni = $('uniSel').value;
  const yrs = u.universities[uni]?.years || {};
  $('uniBox').innerHTML = Object.entries(yrs).map(([y, cs]) => `<details open><summary><b>${y}</b></summary><div class="muted">${Array.isArray(cs) ? cs.join(' • ') : JSON.stringify(cs)}</div></details>`).join('');
  $('guideBox').innerHTML = g.guidelines.map(x => `<div class="card"><b>${x.title}</b><div class="muted small">${x.source} • ${x.id}</div></div>`).join('');
};
// ---- Error monitoring ----
window.addEventListener('error', (e) => { fetch(API + '/api/error', { method: 'POST', body: JSON.stringify({ msg: String(e.message).slice(0, 300) }) }).catch(() => {}); });
initUsers(); apiStatus(); refreshDue();
if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
