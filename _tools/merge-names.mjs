/**
 * 把抓到的完整商品名合并进目录：同 code 取最长的名称
 * 输入：_ref/names.jsonl（真站接口抓的 code/name/price/img）
 * 输出：site/data/catalog.json（name 变长）、_ref/name-merge-report.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const L = path.join(ROOT, '_ref', 'names.jsonl');
if (!fs.existsSync(L)) { console.error('缺 names.jsonl'); process.exit(1); }

const best = new Map();
let lines = 0;
for (const line of fs.readFileSync(L, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  lines++;
  let o;
  try { o = JSON.parse(line); } catch { continue; }
  if (!o.c || !o.n) continue;
  const cur = best.get(o.c);
  if (!cur || String(o.n).length > String(cur.n).length) best.set(o.c, o);
}
console.log('读入', lines, '行，去重后', best.size, '个商品');

const F = path.join(ROOT, 'site/data/catalog.json');
const cat = JSON.parse(fs.readFileSync(F, 'utf8'));

let changed = 0, matched = 0, grew = 0;
const samples = [];
for (const it of cat.items) {
  const hit = best.get(String(it.code));
  if (!hit) continue;
  matched++;
  const oldName = String(it.name || '');
  const newName = String(hit.n || '');
  if (newName.length > oldName.length) {
    it.name = newName;
    changed++;
    grew += newName.length - oldName.length;
    if (samples.length < 8) samples.push({ code: it.code, old: oldName.slice(0, 30), now: newName.slice(0, 40), d: newName.length - oldName.length });
  }
}

fs.writeFileSync(F, JSON.stringify(cat), 'utf8');
fs.writeFileSync(path.join(ROOT, '_ref', 'name-merge-report.json'), JSON.stringify({
  lines, unique: best.size, catalogSize: cat.items.length, matched, changed, grew, samples,
}, null, 1), 'utf8');

console.log('目录商品:', cat.items.length);
console.log('匹配到:', matched);
console.log('名称变更:', changed, ' 平均加长:', changed ? (grew / changed).toFixed(1) : 0, '字');
samples.forEach((s) => console.log(`  ${s.code}  +${s.d}  ${s.old} → ${s.now}`));
