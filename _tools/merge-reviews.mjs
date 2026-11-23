/**
 * 把真实评价合并进目录：site/data/reviews.json（code → {avg, cnt, sale, reviews}）
 * 目录本身不动，商品页按 code 查这个文件
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, '_ref', 'reviews.jsonl');
const OUT = path.join(ROOT, 'site', 'data', 'reviews.json');

if (!fs.existsSync(SRC)) { console.error('缺 reviews.jsonl'); process.exit(1); }

const map = {};
let lines = 0;
for (const line of fs.readFileSync(SRC, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  lines++;
  let o;
  try { o = JSON.parse(line); } catch { continue; }
  if (!o.code) continue;
  const prev = map[o.code];
  const cur = { avg: o.avg || '', cnt: o.cnt || '', sale: o.sale || '', reviews: o.reviews || [] };
  // 取评论条数多的那份
  if (!prev || (cur.reviews.length > prev.reviews.length)) map[o.code] = cur;
}

fs.writeFileSync(OUT, JSON.stringify(map), 'utf8');
const withRev = Object.values(map).filter((x) => x.reviews.length > 0).length;
console.log('读入', lines, '行');
console.log('去重商品', Object.keys(map).length, ' 有评论', withRev);
console.log('文件大小', (fs.statSync(OUT).size / 1024).toFixed(1), 'KB');

// 抽样
const sample = Object.entries(map).filter(([, v]) => v.reviews.length).slice(0, 2);
sample.forEach(([code, v]) => {
  console.log(`\n${code}  ${v.avg} 分  ${v.cnt}  ${v.sale}`);
  v.reviews.slice(0, 2).forEach((r) => console.log(`  ${r.date} ${r.customName} ${r.score}★ ${r.comment}`));
});
