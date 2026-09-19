// Seed faculty admin (run once; prints generated password — change immediately)
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import path from 'node:path';
const db = new DatabaseSync(path.resolve('data', 'medical_app.db'));
const user = process.argv[2] || 'dean';
const pass = crypto.randomBytes(12).toString('base64url');
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.scryptSync(pass, salt, 64).toString('hex');
db.prepare(`INSERT OR REPLACE INTO Faculty_Users (username, pass_hash, salt, role) VALUES (?,?,?,?)`).run(user, hash, salt, 'admin');
console.log(JSON.stringify({ username: user, password: pass, note: 'store securely, change after first login' }));
