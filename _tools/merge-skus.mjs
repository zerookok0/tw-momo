/**
 * 合并真站 SKU → site/data/skus.json（code → [{c,n,p,i}]）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, '_ref', 'skus.jsonl');
const OUT = path.join(ROOT, 'site', 'data', 'skus.json');

if (!fs.existsSync(SRC)) { console.error('缺 skus.jsonl'); process.exit(1); }

const map = {};
let lines = 0, total = 0;
for (const line of fs.readFileSync(SRC, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  lines++;
  let o;
  try { o = JSON.parse(line); } catch { continue; }
  if (!o.code || !Array.isArray(o.skus) || !o.skus.length) continue;
  // 把自己也算进去（真站列表通常已含自己，若不含则补）
  const has = o.skus.some((s) => String(s.c) === String(o.code));
  map[o.code] = o.skus;
  total += o.skus.length;
}

fs.writeFileSync(OUT, JSON.stringify(map), 'utf8');
console.log('读入', lines, '行');
console.log('有真站规格的商品', Object.keys(map).length, ' 规格条数', total);
console.log('大小', (fs.statSync(OUT).size / 1024).toFixed(1), 'KB');
const k = Object.keys(map)[0];
if (k) {
  console.log(`\n样本 ${k}:`);
  map[k].slice(0, 4).forEach((s) => console.log(`  ${s.c}  $${s.p}  ${String(s.n).slice(0, 34)}`));
}
