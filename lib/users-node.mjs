/**
 * 账号存储（Node 侧）：data/users.json
 * Workers 侧用 KV（env.USERS）或内存，见 functions/[[path]].js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(path.resolve(__dirname, '..'), 'data');
const FILE = path.join(DATA, 'users.json');

function ensure() {
  fs.mkdirSync(DATA, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '{}', 'utf8');
}

export function loadUsers() {
  ensure();
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; }
}

export function saveUsers(users) {
  ensure();
  fs.writeFileSync(FILE, JSON.stringify(users, null, 1), 'utf8');
}

export function getUser(phone) {
  return loadUsers()[phone] || null;
}

export function putUser(phone, rec) {
  const u = loadUsers();
  u[phone] = rec;
  saveUsers(u);
  return rec;
}
