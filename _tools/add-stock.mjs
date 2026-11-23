/**
 * 商品页补「庫存 / 活動進度條」
 *   手机版：价格行下方
 *   桌面版：价格区下方
 */
import fs from 'node:fs';
const F = 'lib/render.mjs';
let s = fs.readFileSync(F, 'utf8');
if (s.includes('r-stock')) { console.log('已存在'); process.exit(0); }

const bar = (indent) => `${indent}<div class="r-stock">
${indent}  <div class="r-stock__bar"><i style="width:\${Math.min(96, 30 + (Number(p.code) % 60))}%"></i></div>
${indent}  <div class="r-stock__txt">已售出 \${((Number(p.code) % 8) + 1) * 137} 件 · 剩餘 \${(Number(p.code) % 40) + 5} 件<span>限量搶購</span></div>
${indent}</div>`;

// 手机版：插在 r-pdp__wasline 之后
const mAnchor = '    <div class="r-pdp__discount">';
if (s.includes(mAnchor)) {
  s = s.replace(mAnchor, bar('    ') + '\n' + mAnchor);
  console.log('手机版进度条已加');
}

// 桌面版：插在 pdp2__prices 之后
const dAnchor = '        <dl class="pdp2__attrs">';
if (s.includes(dAnchor)) {
  s = s.replace(dAnchor, bar('        ') + '\n' + dAnchor);
  console.log('桌面版进度条已加');
}

fs.writeFileSync(F, s, 'utf8');
