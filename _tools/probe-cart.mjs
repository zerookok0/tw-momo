/**
 * 手机版 购物车 / 结账 / 订单 三页统一改成 r-* 体系
 * 只替换外壳与类名，表单 id、connector 接线、JS 逻辑全部保留不动。
 */
import fs from 'node:fs';
const F = '_tools/build-mobile.mjs';
let s = fs.readFileSync(F, 'utf8');

// ── 1. 购物车页 ──
const cartStart = s.indexOf('function cartPage()');
if (cartStart < 0) { console.error('找不到 cartPage'); process.exit(1); }
let i = cartStart + 10, depth = 0, cartEnd = -1;
for (; i < s.length; i++) {
  if (s[i] === '{') depth++;
  else if (s[i] === '}') { depth--; if (depth === 0) { cartEnd = i + 1; break; } }
}
console.log('cartPage 长度', cartEnd - cartStart);
console.log(s.slice(cartStart, cartStart + 400));
