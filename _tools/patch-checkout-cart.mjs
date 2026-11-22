/**
 * 手机结账页：金额改用本地购物车（与 /m/cart 同一份 localStorage）
 * 只替换第 812 行附近那一段，锚点取 4 行唯一组合，避免误伤。
 */
import fs from 'node:fs';
const F = '_tools/build-mobile.mjs';
const lines = fs.readFileSync(F, 'utf8').split('\n');

// 定位：applyCart.__ready 行（文件里只有一处）
const idx = lines.findIndex((l) => l.includes('applyCart.__ready = true;'));
if (idx < 0) { console.error('找不到锚点'); process.exit(1); }
console.log('锚点行号:', idx + 1);
console.log(lines.slice(idx, idx + 6).join('\n'));

// 校验接下来 5 行是不是那段 fetch
const seg = lines.slice(idx, idx + 5).join('\n');
if (!seg.includes("fetch('/api/cart'")) { console.error('锚点上下文不符'); process.exit(1); }

const block = [
  "  applyCart.__ready = true;",
  "",
  "  // 优先用本地购物车（与 /m/cart 同一份 localStorage），保证「购物车看到的金额 = 结账金额」",
  "  function fromLocal() {",
  "    var list = [];",
  "    try { list = JSON.parse(localStorage.getItem('momo_cart') || '[]'); } catch (e) {}",
  "    if (!list.length) return null;",
  "    var total = list.reduce(function (a, b) { return a + Number(b.price || 0) * Number(b.qty || 1); }, 0);",
  "    return {",
  "      items: list.map(function (i) { return { name: i.name, price: i.price, qty: i.qty || 1, img: i.img }; }),",
  "      total: total,",
  "      total_amount: '$' + total.toLocaleString('en-US'),",
  "      order_number: '',",
  "    };",
  "  }",
  "",
  "  var localCart = fromLocal();",
  "  if (localCart) {",
  "    applyCart(localCart);",
  "    fetch('/api/cart', { credentials: 'same-origin' })",
  "      .then(function (r) { return r.json(); })",
  "      .then(function (j) {",
  "        var no = document.getElementById('orderNoHint');",
  "        if (no && j) no.textContent = j.order_number || '—';",
  "      })",
  "      .catch(function () {});",
  "  } else {",
  "    fetch('/api/cart', { credentials: 'same-origin' })",
  "      .then(function (r) { return r.json(); })",
  "      .then(applyCart)",
  "      .catch(function () {});",
  "  }",
];

lines.splice(idx, 5, ...block);
fs.writeFileSync(F, lines.join('\n'), 'utf8');
console.log('已替换，新行数:', lines.length);
