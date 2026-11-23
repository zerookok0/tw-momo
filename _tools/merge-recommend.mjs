/**
 * 合并推荐商品 → site/data/recommend.json（code → [{c,n,p,m,i}]）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, '_ref', 'recommend.jsonl');
const OUT = path.join(ROOT, 'site', 'data', 'recommend.json');

if (!fs.existsSync(SRC)) { console.error('缺 recommend.jsonl'); process.exit(1); }

const map = {};
let lines = 0, totalRecs = 0;
for (const line of fs.readFileSync(SRC, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  lines++;
  let o;
  try { o = JSON.parse(line); } catch { continue; }
  if (!o.code || !Array.isArray(o.recs) || !o.recs.length) continue;
  if (!map[o.code] || o.recs.length > map[o.code].length) {
    map[o.code] = o.recs;
    totalRecs += o.recs.length;
  }
}

fs.writeFileSync(OUT, JSON.stringify(map), 'utf8');
console.log('读入', lines, '行');
console.log('商品', Object.keys(map).length, ' 累计推荐', totalRecs);
console.log('大小', (fs.statSync(OUT).size / 1024).toFixed(1), 'KB');
const k = Object.keys(map)[0];
if (k) {
  console.log(`\n样本 ${k}:`);
  map[k].slice(0, 3).forEach((r) => console.log(`  ${r.c}  $${r.p}  ${String(r.n).slice(0, 34)}`));
}
