// Pro3: faculty dashboard + exam import UI
(function () {
  const nav = document.querySelector('.nav');
  const b = document.createElement('button'); b.textContent = 'Faculty';
  b.onclick = () => { document.querySelectorAll('.nav button').forEach(x => x.classList.remove('active')); b.classList.add('active'); ['dashboard', 'quiz', 'companion', 'vault', 'atlas', 'review'].forEach(s => { const el = document.getElementById('screen-' + s); if (el) el.hidden = true; }); document.getElementById('screen-faculty').hidden = false; loadFaculty(); };
  nav.appendChild(b);
  const sec = document.createElement('section'); sec.id = 'screen-faculty'; sec.hidden = true;
  sec.innerHTML = `<div class="card"><h2>🎓 Faculty Dashboard</h2>
    <div class="row"><input id="facUser" placeholder="username"/><input id="facPass" type="password" placeholder="password"/><button class="primary" id="facLogin">Login</button><span class="badge" id="facRole">guest</span></div>
    <div id="facBox" class="grid cols2"></div>
    <h3>Import past exam (.txt per docs/exam-import.md)</h3>
    <div class="row"><input id="impFile" placeholder="filename.txt"/><input id="impSrc" placeholder="Sanaa 2023"/><button class="primary" id="impBtn">Parse & import</button></div>
    <textarea id="impText" rows="4" placeholder="Q: ... | A) .. B) .. C) .. D) ..&#10;Answer: B | Explain: ..."></textarea>
    <div id="impOut" class="small muted"></div></div>`;
  document.querySelector('main').appendChild(sec);
  async function loadFaculty() {
    const j = await (await fetch('/api/faculty-overview')).json();
    document.getElementById('facBox').innerHTML =
      `<div class="card"><b>Learners:</b> ${j.users} • <b>Attempts:</b> ${j.attempts} • <b>Avg ease:</b> ${j.avg_ease}</div>
       <div class="card"><b>Review coverage:</b> ${j.review_pct}%</div>
       <div class="card"><b>Weak topics:</b><ul>${j.weak_topics.map(w => `<li>${w.topic}: ×${w.n}</li>`).join('') || '<li>—</li>'}</ul></div>
       <div class="card"><b>Hardest Qs:</b><ul>${j.hardest.map(h => `<li>#${h.question_id} d=${(+h.difficulty).toFixed(2)} (n=${h.attempts})</li>`).join('')}</ul></div>`;
  }
  document.getElementById('facLogin').onclick = async () => {
    const r = await fetch('/api/faculty-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: document.getElementById('facUser').value, password: document.getElementById('facPass').value }) });
    const j = await r.json();
    if (j.token) { localStorage.setItem('fac_token', j.token); document.getElementById('facRole').textContent = j.role; loadFaculty(); }
    else alert('Login failed');
  };
  const authH = () => { const t = localStorage.getItem('fac_token'); return t ? { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t } : { 'Content-Type': 'application/json' }; };
  document.getElementById('impBtn').onclick = async () => {
    const r = await fetch('/api/import-exam', { method: 'POST', headers: authH(), body: JSON.stringify({ filename: document.getElementById('impFile').value || 'upload.txt', source: document.getElementById('impSrc').value || 'Manual', raw_text: document.getElementById('impText').value }) });
    const j = await r.json();
    document.getElementById('impOut').textContent = r.status === 403 ? 'Login as reviewer required' : `Blocks: ${j.blocks} • Inserted: ${j.inserted} (pending review)`;
  };
  // print / export / backup
  const row = document.createElement('div'); row.className = 'row';
  row.innerHTML = `<button class="primary" id="printBtn">🖨️ Print</button><button class="primary" id="expBtn">⬇️ Export JSON</button><button class="danger" id="bakBtn">💾 Backup (admin)</button>`;
  sec.querySelector('.card').appendChild(row);
  document.getElementById('printBtn').onclick = () => window.print();
  document.getElementById('expBtn').onclick = async () => {
    const q = await (await fetch('/api/questions?per=50')).json();
    const blob = new Blob([JSON.stringify(q, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ai-tour-export.json'; a.click();
  };
  document.getElementById('bakBtn').onclick = async () => {
    const r = await fetch('/api/backup', { method: 'POST', headers: authH() });
    alert(r.status === 403 ? 'Admin login required' : 'Backup done: ' + (await r.json()).ts);
  };
})();
