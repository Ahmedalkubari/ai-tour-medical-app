const I18N = {
ar: {brand:'AI Tour Medical',nav_dash:'الخارطة / Dashboard',nav_ai:'المساعد الذكي',nav_vault:'المكتبة Vault',dash_title:'خارطة الرحلة الأكاديمية',dash_sub:'السنوات 1–6 + الامتياز — المقرر الحالي وتقدم الوحدات الأسبوعية. يعمل أوفلاين بالكامل.',cur_course:'المقرر الحالي',week_prog:'تقدم الأسبوع',quiz_avg:'متوسط الاختبارات',ai_title:'المساعد الذكي — تفكير سريري',ai_sub:'واجهة نظيفة للأسئلة الطبية والحالات السريرية (قواعد أوفلاين + شروحات). للحالات الطارئة اتصل بالإسعاف.',ai_ph:'اسأل: أسباب ألم الصدر؟ DKA؟ croup؟',ai_note:'يعتمد على بنك الأسئلة والحالات المحلية في medical_app.db (نسخة JSON مضمّنة).',vault_title:'المكتبة المعرفية — تصفح هرمي أوفلاين',vault_sub:'وحدات → محاضرات → مراجع PDF. البيانات من قاعدة medical_app.db.',vault_ph:'ابحث: تشريح، باطنة، TB…',search:'بحث',refs:'المراجع المعتمدة'},
en: {brand:'AI Tour Medical',nav_dash:'Tour Map / Dashboard',nav_ai:'AI Companion',nav_vault:'Knowledge Vault',dash_title:'Academic Tour Map',dash_sub:'Years 1–6 + Internship — current course and weekly module progress. Fully offline.',cur_course:'Current course',week_prog:'Weekly progress',quiz_avg:'Quiz average',ai_title:'AI Companion — clinical reasoning',ai_sub:'Clean interface for medical Q&A and case reasoning (offline rules + explanations). For emergencies call local emergency.',ai_ph:'Ask: chest pain causes? DKA? croup?',ai_note:'Powered by local Question_Bank + Clinical_Cases in medical_app.db (embedded JSON mirror).',vault_title:'Knowledge Vault — offline tree browser',vault_sub:'Modules → lectures → reference PDFs. Data from medical_app.db.',vault_ph:'Search: anatomy, medicine, TB…',search:'Search',refs:'Standard references'}
};
let lang = localStorage.getItem('ai_tour_lang') || 'ar';
const LEVELS = [
 {n:{ar:'السنة الأولى',en:'Year 1'},c:['Anatomy I','Physiology I','Biochemistry I'],p:100,s:'done'},
 {n:{ar:'السنة الثانية',en:'Year 2'},c:['Anatomy II','Physiology II','Community I'],p:100,s:'done'},
 {n:{ar:'السنة الثالثة',en:'Year 3'},c:['Pathology','Pharmacology','Microbiology'],p:72,s:'done'},
 {n:{ar:'السنة الرابعة',en:'Year 4'},c:['Medicine I','Surgery I','Pediatrics I'],p:48,s:'current'},
 {n:{ar:'السنة الخامسة',en:'Year 5'},c:['Medicine II','Surgery II','OB/GYN I'],p:12,s:'next'},
 {n:{ar:'السنة السادسة',en:'Year 6'},c:['OB/GYN II','Pediatrics II','Emergency'],p:0,s:'next'},
 {n:{ar:'الامتياز',en:'Internship'},c:['Medicine','Surgery','Peds & OBGYN'],p:0,s:'next'},
];
const VAULT = [
 {t:{ar:'التشريح',en:'Anatomy'},kids:['Upper & Lower Limbs','Thorax & Abdomen','Head & Neck / Cranial nerves']},
 {t:{ar:'وظائف الأعضاء',en:'Physiology'},kids:['Cardiac cycle & ECG','GFR & tubular function','O2 dissociation & Bohr']},
 {t:{ar:'الباطنة',en:'Internal Medicine'},kids:['Heart failure & STEMI','Diabetes & thyroid','TB (2HRZE/4HR) & hepatitis']},
 {t:{ar:'الجراحة',en:'Surgery'},kids:['Appendicitis & acute abdomen','Trauma / ATLS & burns (Parkland)','Thyroid & breast lumps']},
 {t:{ar:'الأطفال',en:'Pediatrics'},kids:['Croup vs epiglottitis','IMCI + EPI Yemen','Dehydration Plans A/B/C + zinc']},
 {t:{ar:'النسائية والتوليد',en:'OB/GYN'},kids:['Preeclampsia & MgSO4','Labor stages & PPH (atony)','PCOS & incomplete abortion']},
];
const REFS = [["Gray's Anatomy",'Standring, 42e'],['Guyton & Hall Physiology','Hall, 14e'],["Harrison's Internal Medicine",'Loscalzo, 21e'],["Davidson's Medicine",'Ralston, 24e'],['Nelson Pediatrics','Kliegman, 22e']];
const KB = [
 {k:['chest pain','ألم الصدر','stemi','mi'],a:{ar:'ألم صدري ضاغط + تعرق + انتشار للذراع/الفك + ST elevation ← فكر STEMI: أسبرين + PCI عاجل (<120د) أو thrombolysis، مع hs-troponin. فرّق عن: تسلخ أورطي (ألم مهاجر للظهر)، pericarditis (يتحسن بالانحناء)، GERD.',en:'Crushing chest pain + sweating + ST elevation → STEMI: aspirin + urgent PCI (<120m) or lysis; check hs-troponin. Rule out: dissection, pericarditis, GERD.'}},
 {k:['dka','keto','حموض','كيتو'],a:{ar:'DKA: سكري مرتفع + كيتون + حموضة (pH<7.3). العلاج: سوائل isotonic + أنسولين infusion + تصحيح K+ + البحث عن المحفز (عدوى). راقب ABG/شوارد كل ساعة.',en:'DKA: high glucose + ketones + acidosis. Fluids + insulin infusion + K+ + trigger search; hourly ABG/electrolytes.'}},
 {k:['croup','خانوق','stridor','صرير'],a:{ar:'Croup فيروسي (parainfluenza): سعال نباحي + صرير + بحة. العلاج: dexamethasone ± أدرينالين مرذذ. احذر epiglottitis (سيلان لعاب + تسمم) فهي طارئة.',en:'Viral croup: barky cough + stridor. Dexamethasone ± nebulized adrenaline. Beware epiglottitis (drooling/toxic) = emergency.'}},
 {k:['tb','السل','rifamp'],a:{ar:'السل الحساس: 2HRZE ثم 4HR حسب WHO/برنامج اليمن مع دعم الالتزام. Caseating granuloma مميز. الوقاية: BCG عند الولادة، تتبع المخالطين.',en:'Drug-susceptible TB: 2HRZE/4HR per WHO/Yemen NTP with adherence support. Caseating granulomas typical.'}},
 {k:['preeclampsia','تسمم','eclampsia'],a:{ar:'Preeclampsia ≥20 أسبوع: HTN + بروتينية/علامات عضوية. الشديدة ← MgSO4 + ضبط الضغط + توليد عاجل. Eclampsia = اختلاجات.',en:'Preeclampsia ≥20w: HTN + proteinuria/end-organ signs. Severe → MgSO4 + BP control + delivery.'}},
 {k:['dehydration','جفاف','ors','إسهال'],a:{ar:'جفاف شديد (Plan C): Ringer lactate وريدي 100مل/كغ + ORS + زنك. بعض/لا جفاف: Plans B/A. واصل الرضاعة والتغذية.',en:'Severe dehydration (Plan C): IV Ringer 100mL/kg + ORS + zinc. Continue feeding.'}},
 {k:['anatomy','تشريح','radial','foramen'],a:{ar:'نقاط سريعة: كسر منتصف العضد ← radial nerve (wrist drop). Foramen ovale ← V3. Long thoracic ← winged scapula. McBurney ← appendix.',en:'Quick: mid-humerus → radial nerve; foramen ovale → V3; long thoracic → winged scapula; McBurney → appendix.'}},
 {k:['append','زائدة'],a:{ar:'التهاب الزائدة: ألم مهاجر للـRLQ + anorexia + rebound + Alvarado مرتفع ← استئصال (منظار) بعد إنعاش + مضاد (ceftriaxone+metro).',en:'Appendicitis: migratory RLQ pain + Alvarado high → appendectomy after fluids + antibiotics.'}},
];
function t(ar,en){return lang==='ar'?ar:en}
function applyLang(){
 document.documentElement.lang=lang; document.documentElement.dir=lang==='ar'?'rtl':'ltr';
 document.querySelectorAll('[data-i18n]').forEach(el=>{const k=el.dataset.i18n; if(I18N[lang][k]) el.textContent=I18N[lang][k];});
 document.querySelectorAll('[data-i18n-ph]').forEach(el=>{const k=el.dataset.i18nPh; if(I18N[lang][k]) el.placeholder=I18N[lang][k];});
 document.getElementById('langBtn').textContent=lang==='ar'?'EN':'عربي';
 localStorage.setItem('ai_tour_lang',lang); renderTimeline(); renderVault(''); pushSys();
}
function renderTimeline(){
 const el=document.getElementById('timeline'); el.innerHTML='';
 LEVELS.forEach((L,i)=>{
  const d=document.createElement('div'); d.className='level'+(L.s==='current'?' current':'');
  d.innerHTML=`<b>${i+1}. ${t(L.n.ar,L.n.en)}</b> <span class="badge ${L.s==='current'?'ok':L.s==='done'?'ok':'warn'}">${L.s}</span><div class="muted small">${L.c.join(' • ')}</div><div class="progress"><div style="width:${L.p}%"></div></div><div class="small">${L.p}%</div>`;
  el.appendChild(d);
 });
}
function renderVault(q){
 const el=document.getElementById('vaultTree'); el.innerHTML='';
 const qq=(q||'').trim().toLowerCase();
 VAULT.filter(v=>!qq||v.t.ar.includes(q||'')||v.t.en.toLowerCase().includes(qq)||v.kids.join(' ').toLowerCase().includes(qq)).forEach(v=>{
  const det=document.createElement('details'); det.open=true;
  det.innerHTML=`<summary><b>${t(v.t.ar,v.t.en)}</b></summary><ul>${v.kids.map(k=>`<li>📄 ${k}</li>`).join('')}</ul>`;
  el.appendChild(det);
 });
 const r=document.getElementById('refs'); r.innerHTML='';
 REFS.forEach(([b,a])=>{const d=document.createElement('div');d.className='card';d.innerHTML=`<b>${b}</b><div class="muted small">${a} • offline ref</div>`;r.appendChild(d);});
}
function bubble(who,text){const m=document.getElementById('msgs');const d=document.createElement('div');d.className='msg '+(who==='me'?'me':'ai');d.textContent=text;m.appendChild(d);m.scrollTop=m.scrollHeight;}
function answer(q){
 const s=q.toLowerCase();
 for(const e of KB){ if(e.k.some(k=>s.includes(k))) return t(e.a.ar,e.a.en); }
 return t('سؤال جيد. أوفلاين: حدد القسم (باطنة/جراحة/أطفال/نسائية) والعرض الرئيسي + العلامات الحيوية وسأعطيك تفريقاً وخطة (DDx + investigations + management) من بنك الأسئلة المحلي. مثال: "طفل 2 سنة سعال نباحي وصرير".',
 'Good question. Offline: specify department + chief complaint + vitals and I will give DDx + investigations + management from the local bank. Example: "2yo barky cough + stridor".');
}
let sysPushed=false;
function pushSys(){ if(sysPushed) return; sysPushed=true; bubble('ai',t('أهلاً! أنا مساعدك الأوفلاين. اسأل عن أي موضوع طبي أو حالة سريرية وسأشرح بالتفريق والخطة.','Hello! I am your offline companion. Ask any medical topic or case and I will explain with DDx + plan.')); }
document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>{
 document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('active')); b.classList.add('active');
 ['dashboard','companion','vault'].forEach(s=>document.getElementById('screen-'+s).hidden=s!==b.dataset.screen);
});
document.getElementById('langBtn').onclick=()=>{lang=lang==='ar'?'en':'ar';applyLang();};
document.getElementById('send').onclick=()=>{const i=document.getElementById('q');if(!i.value.trim())return;bubble('me',i.value);bubble('ai',answer(i.value));i.value='';};
document.getElementById('q').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('send').click();});
document.getElementById('vaultBtn').onclick=()=>renderVault(document.getElementById('vaultSearch').value);
document.getElementById('vaultSearch').addEventListener('input',e=>renderVault(e.target.value));
fetch('data/audit.json').then(r=>r.json()).then(a=>{document.getElementById('auditLine').textContent=`levels ${a.academic_levels} • courses ${a.courses} • topics ${a.modules_topics} • Q ${a.questions} • cases ${a.clinical_cases}`;}).catch(()=>{document.getElementById('auditLine').textContent='offline demo data (run npm run build:db)';});
applyLang();
if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{});}
