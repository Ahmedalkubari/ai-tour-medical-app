// Versioned backup: data/backups/medical_app-<ts>.db + audit snapshot
import fs from 'node:fs';
import path from 'node:path';
const ROOT = process.cwd();
const dir = path.join(ROOT, 'data', 'backups');
fs.mkdirSync(dir, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
for (const f of ['medical_app.db', 'audit.json']) {
  const s = path.join(ROOT, 'data', f);
  if (fs.existsSync(s)) fs.copyFileSync(s, path.join(dir, `${f.replace('.', `-${ts}.`)}`));
}
const list = fs.readdirSync(dir).sort();
while (list.length > 10) fs.rmSync(path.join(dir, list.shift()));
console.log('backup done:', ts, 'kept:', fs.readdirSync(dir).length);
