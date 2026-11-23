/**
 * 合并规格/SKU → site/data/specs.json
 *   { code: { props: [{n,v}], vars: [{s,n,p}], group } }
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, '_ref', 'specs.jsonl');
const OUT = path.join(ROOT, 'site', 'data', 'specs.json');

if (!fs.existsSync(SRC)) { console.error('缺 specs.jsonl'); process.exit(1); }

const map = {};
let lines = 0, withVar = 0, totalVar = 0;
for (const line of fs.readFileSync(SRC, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  lines++;
  let o;
  try { o = JSON.parse(line); } catch { continue; }
  if (!o.code) continue;
  const prev = map[o.code];
  const cur = { props: o.props || [], vars: o.vars || [], group: o.group || '' };
  if (!prev || (cur.vars.length + cur.props.length) > (prev.vars.length + prev.props.length)) map[o.code] = cur;
  if (cur.vars.length) { withVar++; totalVar += cur.vars.length; }
}

fs.writeFileSync(OUT, JSON.stringify(map), 'utf8');
console.log('读入', lines, '行');
console.log('商品', Object.keys(map).length, ' 有变体', withVar, ' 变体总数', totalVar);
console.log('大小', (fs.statSync(OUT).size / 1024).toFixed(1), 'KB');

const k = Object.keys(map).find((c) => map[c].vars.length > 1);
if (k) {
  console.log(`\n样本 ${k}:`);
  console.log('  属性:', map[k].props.map((p) => p.n + '=' + p.v).join(' | ').slice(0, 160));
  map[k].vars.slice(0, 4).forEach((v) => console.log(`  变体 ${v.s}  ${v.n}  [${v.p}]`));
}
