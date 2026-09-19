const CACHE='aitourmed-v3';
const ASSETS=['./','./index.html','./styles.css','./design.css','./app.js','./pro.js','./pro2.js','./pro3.js','./ui.js','./manifest.json','./data/audit.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS).catch(()=>{})).then(()=>self.skipWaiting()));});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put(e.request,cp)).catch(()=>{});return res;}).catch(()=>caches.match('./index.html'))));});
