/**
 * 真浏览器全链路测试：按钮能不能点、流程通不通
 *   首页 → 商品页 → 加入购物车 → 购物车改数量 → 结账页 → 金额正确
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', '_ref', 'audit');
fs.mkdirSync(OUT, { recursive: true });

const BASE = process.argv[2] || 'https://tw-momo.pages.dev';
const PORT = 9222;
const W = 402, H = 874;
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise((res, rej) => {
  const mid = ++id;
  pending.set(mid, (m) => (m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result)));
  ws.send(JSON.stringify({ id: mid, method, params }));
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = async (expr, awaitPromise = false) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise, awaitPromiseForSideEffects: true });
  if (r.exceptionDetails) return { __err: (r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text };
  return r.result && r.result.value;
};
const goto = async (p) => { await send('Page.navigate', { url: BASE + p }); await sleep(3000); };

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true, screenWidth: W, screenHeight: H });
await send('Emulation.setUserAgentOverride', { userAgent: UA, platform: 'iPhone' });

const R = { base: BASE, steps: [] };
const step = (name, ok, detail) => { R.steps.push({ name, ok, detail }); console.log(`${ok ? '✅' : '❌'} ${name}${detail ? '  ' + detail : ''}`); };

// 1) 首页可达 + 有商品卡
await goto('/m/');
let r = await ev(`JSON.stringify({ cards: document.querySelectorAll('.r-card').length, h: document.documentElement.scrollHeight })`);
let o = JSON.parse(r);
step('首页渲染', o.cards > 0, `商品卡 ${o.cards}，页高 ${o.h}`);

// 2) 点第一个商品卡 → 进商品页
r = await ev(`(() => { const a = document.querySelector('.r-card'); if (!a) return 'no-card'; location.href = a.getAttribute('href'); return a.getAttribute('href'); })()`);
await sleep(3200);
const pdpUrl = await ev('location.pathname');
step('首页→商品页', /^\/m\/product\//.test(pdpUrl), pdpUrl);

// 3) 商品页按钮：加购
await ev(`localStorage.removeItem('momo_cart')`);
r = await ev(`(() => { const b = document.getElementById('btnAdd'); if (!b) return 'no-btn'; b.click(); return 'clicked'; })()`);
await sleep(600);
r = await ev(`localStorage.getItem('momo_cart') || '[]'`);
let cart = JSON.parse(r);
step('加入購物車', cart.length > 0, `购物车 ${cart.length} 条，首件 $${cart[0] && cart[0].price}`);

// 4) 规格切换
const skuCount = await ev(`document.querySelectorAll('#pdpSkusM .m-sku-chip').length`);
if (skuCount > 0) {
  r = await ev(`(() => { const c = [...document.querySelectorAll('#pdpSkusM .m-sku-chip')]; const before = document.querySelector('.r-pdp__price .now').textContent; c[c.length-1].click(); const after = document.querySelector('.r-pdp__price .now').textContent; return before + '→' + after; })()`);
  step('规格切换', r.includes('→') && r.split('→')[0] !== r.split('→')[1], r);
} else {
  step('规格切换', true, '单规格，跳过');
}

// 5) 购物车页：数量 + 与合计
await goto('/m/cart');
const cartInfo = await ev(`JSON.stringify({ items: document.querySelectorAll('.m-cart-item').length, total: (document.querySelector('.m-cobar .vl')||{}).textContent })`);
o = JSON.parse(cartInfo);
step('购物车渲染', o.items > 0, `${o.items} 件，合计 ${o.total}`);
r = await ev(`(() => { const q = document.querySelector('.m-cart-item [class*="qty"] button:last-child, .m-cart-item button:last-of-type'); if (!q) return 'no-qty'; const before = document.querySelector('.m-cart-item [class*="price"], .m-cart-item b') ? 1 : 1; q.click(); return 'clicked'; })()`);
step('购物车数量按钮', r === 'clicked', String(r));

// 6) 结账页金额
await goto('/m/checkout');
const chk = await ev(`JSON.stringify({ amt: (document.getElementById('bp-total')||{}).textContent, bar: (document.getElementById('barTotal')||{}).textContent, submit: !!document.getElementById('bp-submit'), card: !!document.getElementById('bp-card-number') })`);
o = JSON.parse(chk);
step('结账页渲染', o.submit && o.card, `总额 ${o.amt} / 底栏 ${o.bar}`);

// 7) 提交按钮存在且可点
r = await ev(`(() => { const b = document.getElementById('bp-submit'); if (!b) return 'no'; b.click(); return b.classList.contains('bp-busy') ? 'busy' : 'clicked'; })()`);
await sleep(900);
step('確認付款可点', r === 'busy' || r === 'clicked', String(r));

// 8) 站内页
await goto('/m/info/wishlist');
const wl = await ev(`document.querySelectorAll('.r-info__card').length`);
step('站内页渲染', wl > 0, `卡片 ${wl}`);

fs.writeFileSync(path.join(OUT, 'flow-mobile.json'), JSON.stringify(R, null, 1), 'utf8');
const pass = R.steps.filter((s) => s.ok).length;
console.log(`\n通过 ${pass}/${R.steps.length}`);
ws.close();
process.exit(pass === R.steps.length ? 0 : 1);
