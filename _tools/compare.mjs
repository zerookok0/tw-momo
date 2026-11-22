/**
 * 对比真站快照与我们站快照，输出可执行的差异清单
 *
 * 用法：node _tools/compare.mjs <real.json> <ours.json>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REAL = path.resolve(__dirname, '..', '_ref', 'real');
const OUT = path.resolve(__dirname, '..', '_ref', 'diff');
fs.mkdirSync(OUT, { recursive: true });

const a = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const b = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const name = path.basename(process.argv[2], '.json').replace(/^real-/, '');

const norm = (s) => String(s).replace(/\s+/g, '').replace(/[，,]/g, '');
const setDiff = (A, B, key = (x) => x) => {
  const sa = new Set(A.map(key)), sb = new Set(B.map(key));
  return {
    onlyReal: [...sa].filter((x) => !sb.has(x)).slice(0, 40),
    onlyOurs: [...sb].filter((x) => !sa.has(x)).slice(0, 40),
    common: [...sa].filter((x) => sb.has(x)).length,
    totalReal: sa.size, totalOurs: sb.size,
  };
};

// 价格：抽出纯数字集合
const priceNums = (arr) => arr.map((s) => Number(String(s).replace(/[^\d]/g, ''))).filter((n) => n > 0);
const pa = priceNums(a.prices), pb = priceNums(b.prices);

const report = {
  page: name,
  title: { real: a.title, ours: b.title, same: a.title === b.title },
  size: { realDocH: a.docH, oursDocH: b.docH, ratio: +(b.docH / (a.docH || 1)).toFixed(2) },
  buttons: setDiff(a.buttons, b.buttons, (x) => norm(x.t)),
  blocks: {
    realCount: a.blocks.length, oursCount: b.blocks.length,
    realTop: a.blocks.slice(0, 14).map((x) => ({ h: x.h, t: x.t.slice(0, 24) })),
    oursTop: b.blocks.slice(0, 14).map((x) => ({ h: x.h, t: x.t.slice(0, 24) })),
  },
  prices: {
    realCount: pa.length, oursCount: pb.length,
    realSample: pa.slice(0, 12), oursSample: pb.slice(0, 12),
    overlap: pa.filter((n) => pb.includes(n)).length,
  },
  images: { real: a.imgs.length, ours: b.imgs.length },
  text: {
    realHead: a.bodyText.slice(0, 600),
    oursHead: b.bodyText.slice(0, 600),
  },
};

fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify(report, null, 1), 'utf8');

console.log(`\n══════ ${name} ══════`);
console.log(`标题  真: ${a.title}`);
console.log(`      我: ${b.title}  ${report.title.same ? '✅' : '❌'}`);
console.log(`高度  真 ${a.docH} / 我 ${b.docH}  (${report.size.ratio}x)`);
console.log(`图片  真 ${a.imgs.length} / 我 ${b.imgs.length}`);
console.log(`按钮  真 ${report.buttons.totalReal} / 我 ${report.buttons.totalOurs} / 共有 ${report.buttons.common}`);
if (report.buttons.onlyReal.length) console.log(`  真站有我们没有: ${report.buttons.onlyReal.slice(0, 12).join(' | ')}`);
if (report.buttons.onlyOurs.length) console.log(`  我们有真站没有: ${report.buttons.onlyOurs.slice(0, 12).join(' | ')}`);
console.log(`价格  真 ${pa.length} / 我 ${pb.length} / 重复 ${report.prices.overlap}`);
console.log(`\n  真站前 12 个价格: ${pa.slice(0, 12).join(' ')}`);
console.log(`  我们前 12 个价格: ${pb.slice(0, 12).join(' ')}`);
console.log(`\n  真站前 10 个区块(高/文本):`);
report.blocks.realTop.slice(0, 10).forEach((x) => console.log(`    ${String(x.h).padStart(4)}  ${x.t}`));
console.log(`  我们前 10 个区块:`);
report.blocks.oursTop.slice(0, 10).forEach((x) => console.log(`    ${String(x.h).padStart(4)}  ${x.t}`));
