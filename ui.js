// UI Pro: analytics dashboard, toasts, shortcuts, skeletons (additive; never breaks core)
(function () {
  const $ = (id) => document.getElementById(id);
  // toasts
  const tc = document.createElement('div'); tc.id = 'toasts'; document.body.appendChild(tc);
  window.toast = (m) => { const d = document.createElement('div'); d.className = 'toast'; d.textContent = m; tc.appendChild(d); setTimeout(() => d.remove(), 3200); };
  // dashboard stats block
  const dash = document.querySelector('#screen-dashboard .card');
  const stats = document.createElement('div'); stats.innerHTML = `
    <div class="stats">
      <div class="stat"><b id="stQ">…</b><span>Questions بنك الأسئلة</span></div>
      <div class="stat"><b id="stC">…</b><span>Cases الحالات</span></div>
      <div class="stat"><b id="stDue">…</b><span>Due للمراجعة</span></div>
      <div class="stat"><b id="stCov">…</b><span>Review معتمد %</span></div>
    </div>
    <div class="card"><b>Weak areas / نقاط الضعف</b><div id="weakBars" style="display:grid;gap:8px;margin-top:8px"><div class="sk">loading…</div></div></div>
    <div class="searchhint">Tip: press <span class="kbd">/</span> to jump to vault search • <span class="kbd">Enter</span> sends chat</div>`;
  dash.appendChild(stats);
  async function load() {
    try {
      const audit = await (await fetch('data/audit.json')).json();
      $('stQ').textContent = audit.questions?.toLocaleString?.() || audit.questions;
      $('stC').textContent = audit.clinical_cases;
    } catch { $('stQ').textContent = '3.3k+'; $('stC').textContent = '128+'; }
    try {
      const u = ($('userSel') || {}).value || 'demo_student';
      const [due, cov, plan] = await Promise.all([
        fetch(`/api/srs-due?user_id=${encodeURIComponent(u)}`).then(r => r.json()).catch(() => ({ rows: [] })),
        fetch('/api/review-coverage').then(r => r.json()).catch(() => null),
        fetch(`/api/plan?user_id=${encodeURIComponent(u)}`).then(r => r.json()).catch(() => null),
      ]);
      $('stDue').textContent = due.rows?.length ?? '—';
      $('stCov').textContent = cov ? cov.pct + '%' : '—';
      const weak = plan && plan.weeks ? [] : [];
      const wj = await fetch(`/api/faculty-overview`).then(r => r.json()).catch(() => null);
      const list = (wj?.weak_topics || []).slice(0, 5);
      $('weakBars').innerHTML = list.length ? list.map(w => {
        const mx = list[0].n || 1;
        return `<div><div class="small">${w.topic} <span class="muted">×${w.n}</span></div><div class="bar"><div style="width:${Math.round(100 * w.n / mx)}%"></div></div></div>`;
      }).join('') : '<div class="muted small">No weak data yet — take a quiz to populate analytics.</div>';
    } catch { $('weakBars').innerHTML = '<div class="muted small">API offline.</div>'; }
  }
  // shortcut "/" focuses vault search
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName)) {
      e.preventDefault();
      document.querySelector('[data-screen="vault"]')?.click();
      setTimeout(() => $('vaultSearch')?.focus(), 60);
    }
  });
  // toast on quiz grade
  const obs = new MutationObserver(() => {
    const h = document.querySelector('#quizResult h3');
    if (h && !h.dataset.t) { h.dataset.t = '1'; window.toast(h.textContent); }
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
  load();
  setInterval(load, 60000);
})();
