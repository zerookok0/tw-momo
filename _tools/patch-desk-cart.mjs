/**
 * 桌面结账页：把本地购物车金额覆盖脚本插入到 <body> 模板内部（不是函数体里）
 */
import fs from 'node:fs';
const F = '_tools/build-pages.mjs';
const lines = fs.readFileSync(F, 'utf8').split('\n');

const ri = lines.findIndex((l) => l.includes("return page({ title: '結帳 - momo購物網'"));
if (ri < 0) { console.error('找不到结账 return'); process.exit(1); }
// 往上找 body 模板结束行（形如 </div>`;）
let bi = ri - 1;
while (bi > 0 && !/<\/div>`;\s*$/.test(lines[bi])) bi--;
if (bi <= 0) { console.error('找不到 body 结束'); process.exit(1); }
console.log('插入点行号:', bi + 1, '内容:', lines[bi].trim());

if (lines.slice(bi, ri).join('\n').includes('deskLocalCart')) { console.log('已存在'); process.exit(0); }

const inject = [
  '<script>',
  '(function(){',
  "  // 与 /cart 同一份 localStorage，保证「购物车金额 = 结账金额」",
  '  function deskLocalCart() {',
  '    var list = [];',
  "    try { list = JSON.parse(localStorage.getItem('momo_cart') || '[]'); } catch (e) {}",
  '    if (!list.length) return null;',
  '    var total = list.reduce(function (a, b) { return a + Number(b.price || 0) * Number(b.qty || 1); }, 0);',
  "    return { total: total, amount: '$' + total.toLocaleString('en-US'), items: list };",
  '  }',
  '  function paint() {',
  '    var c = deskLocalCart();',
  '    if (!c) return;',
  "    var tot = document.getElementById('bp-total');",
  "    if (tot) { tot.textContent = c.amount; tot.setAttribute('data-amount', String(c.total)); }",
  "    var sub = document.getElementById('sum-subtotal');",
  '    if (sub) sub.textContent = c.amount;',
  "    var cnt = document.getElementById('sum-count');",
  "    if (cnt) cnt.textContent = c.items.reduce(function (a, b) { return a + Number(b.qty || 1); }, 0) + ' 件';",
  '  }',
  '  paint();',
  "  document.addEventListener('bp:cart-applied', paint);",
  '  setTimeout(paint, 1200);',
  '  setTimeout(paint, 3000);',
  '})();',
  '</script>',
];

// 插到 `</div>\`;` 这一行之前，仍在模板字符串内部
lines.splice(bi, 0, ...inject);
fs.writeFileSync(F, lines.join('\n'), 'utf8');
console.log('已插入', inject.length, '行');
