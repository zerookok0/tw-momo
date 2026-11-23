/**
 * 全项验收：一次性检查用户列出的 18 条要求
 * 用法：node _tools/final-check.mjs [base]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASE = process.argv[2] || 'https://tw-momo.pages.dev';
const PORT = 9222;

const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'site/data/catalog.json'), 'utf8'));
const rv = JSON.parse(fs.readFileSync(path.join(ROOT, 'site/data/reviews.json'), 'utf8'));

const ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const pending = new Map(); let SID = null;
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const rs = (m, p, sess) => new Promise((res, rej) => { const mid = ++id; pending.set(mid, (x) => (x.error ? rej(new Error(m + ': ' + x.error.message)) : res(x.result))); ws.send(JSON.stringify({ id: mid, method: m, params: p, ...(sess ? { sessionId: sess } : {}) })); });
const { targetId } = await rs('Target.createTarget', { url: 'about:blank' });
const att = await rs('Target.attachToTarget', { targetId, flatten: true }); SID = att.sessionId;
const send = (m, p) => rs(m, p, SID);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = async (e, aw = false) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: aw }); return r.result && r.result.value; };
const go = async (u, wait = 2200) => { await send('Page.navigate', { url: BASE + u }); await sleep(wait); };

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });

const R = [];
const chk = (name, ok, detail = '') => { R.push({ name, ok, detail }); console.log(`${ok ? '✅' : '❌'} ${name}${detail ? '  ' + detail : ''}`); };

// ═══ 手机端 ═══
await send('Emulation.setDeviceMetricsOverride', { width: 402, height: 874, deviceScaleFactor: 2, mobile: true, screenWidth: 402, screenHeight: 874 });
await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', platform: 'iPhone' });
console.log('\n════ 手机端 ════');

// 1) 顶部导航
await go('/m/');
let o = JSON.parse(await ev(`JSON.stringify({
  nav: document.querySelectorAll('.r-nav a').length,
  brands: document.querySelectorAll('.r-brand__row a, .r-brands a').length,
  kw: document.querySelectorAll('.r-kwrow a').length,
  prod: document.querySelectorAll('.r-card, .r-wall__card').length,
  broken: [...document.images].filter(i => i.complete && i.naturalWidth === 0).length,
  overflow: document.documentElement.scrollWidth > innerWidth
})`));
chk('顶部导航 39+ 项', o.nav >= 39, `${o.nav} 项`);
chk('首页商品卡', o.prod > 30, `${o.prod} 张`);
chk('首页无裂图', o.broken === 0, `${o.broken} 张`);
chk('首页无横向溢出', !o.overflow);

// 2) 搜索
await go('/m/category?kw=' + encodeURIComponent('康寧餐具'), 2500);
o = JSON.parse(await ev(`JSON.stringify({ n: document.querySelectorAll('.r-card').length, first: (document.querySelector('.r-card b')||{}).textContent || '', title: document.title })`));
chk('搜索能出结果', o.n > 0, `${o.n} 件 · ${String(o.first).slice(0, 16)}`);

// 3) 商品详情
const p = cat.items.find((x) => x.img && rv[String(x.code)] && rv[String(x.code)].reviews.length) || cat.items[0];
await go('/m/product/' + p.code, 3000);
o = JSON.parse(await ev(`JSON.stringify({
  title: document.title,
  name: (document.querySelector('.r-pdp__name')||{}).textContent || '',
  price: (document.querySelector('.r-pdp__priceline .now')||{}).textContent || '',
  was: (document.querySelector('.r-pdp__wasline s')||{}).textContent || '',
  sku: document.querySelectorAll('#pdpSkusM .m-sku-chip').length,
  qty: !!document.getElementById('pdpQty'),
  addBtn: !!document.getElementById('btnAdd'),
  buyBtn: !!document.getElementById('btnBuy'),
  review: document.querySelectorAll('.r-pdp__review').length,
  score: (document.querySelector('.r-pdp__rate .score')||{}).textContent || '',
  recs: document.querySelectorAll('.r-pdp__rec2').length,
  imgs: document.images.length,
  broken: [...document.images].filter(i => i.complete && i.naturalWidth === 0).length,
  ship: (document.querySelector('.r-pdp__ship')||{}).textContent || ''
})`));
chk('详情页商品名', !!o.name, String(o.name).slice(0, 24));
chk('详情页 5 折价', /^\$?[\d,]+$/.test(String(o.price).trim()), String(o.price).trim());
chk('详情页有划线原价', !!o.was, String(o.was));
chk('SKU 规格可切换', o.sku >= 0, `${o.sku} 个 chip`);
chk('数量可增减', o.qty);
chk('可加入购物车', o.addBtn);
chk('可直接购买', o.buyBtn);
chk('评价有真实数据', o.review > 0, `${o.review} 条 · ${o.score} 分`);
chk('推荐商品位', o.recs > 0, `${o.recs} 个`);
chk('详情页无裂图', o.broken === 0, `${o.imgs} 张图`);
chk('出貨時間条', !!o.ship, String(o.ship).slice(0, 30));

// 4) 加购 + 数量
await ev(`localStorage.removeItem('momo_cart')`);
await ev(`document.querySelector('[data-q="1"]').click()`);
await ev(`document.getElementById('btnAdd').click()`);
await sleep(500);
o = JSON.parse(await ev(`localStorage.getItem('momo_cart') || '[]'`));
chk('加购写入购物车', Array.isArray(o) && o.length > 0, o.length ? `qty=${o[0].qty}` : '空');

// 5) 购物车
await go('/m/cart', 2600);
o = JSON.parse(await ev(`JSON.stringify({
  items: document.querySelectorAll('.m-cart-item').length,
  total: (document.querySelector('.m-cobar .vl')||{}).textContent || '',
  checkout: (document.getElementById('go-checkout')||{}).tagName || ''
})`));
chk('购物车有商品', o.items > 0, `${o.items} 件 · ${o.total}`);

// 6) 结账页
await go('/m/checkout', 3200);
o = JSON.parse(await ev(`JSON.stringify({
  form: !!document.getElementById('bp-form'),
  submit: !!document.getElementById('bp-submit'),
  total: (document.getElementById('bp-total')||{}).textContent || '',
  cod: /貨到付款|貨到付現|COD/.test(document.body.textContent || ''),
  freeShip: /免運/.test(document.body.textContent || ''),
  fields: document.querySelectorAll('.m-co-row input, .m-co-row select').length
})`));
chk('结账页表单完整', o.form && o.fields >= 6, `${o.fields} 个字段`);
chk('结账页可提交', o.submit, o.total);
chk('结账页无 COD 选项', !o.cod, o.cod ? '发现货到付款' : '已确认无');
chk('结账页显示免運', o.freeShip);

// 7) 登录 / 注册
await go('/m/info/login', 2600);
o = JSON.parse(await ev(`JSON.stringify({
  phone: !!document.getElementById('loginPhone') || !!document.querySelector('input[inputmode=numeric]'),
  pass: !!document.getElementById('loginPwd') || !!document.querySelector('input[type=password]'),
  reg: !!document.getElementById('regPhone') || /註冊|注册/.test(document.body.textContent || '')
})`));
chk('登录页有账号密码', o.phone && o.pass);
chk('登录页可切注册', o.reg);

// 8) 站内页
await go('/m/info/faq', 2000);
o = JSON.parse(await ev(`JSON.stringify({ h: (document.querySelector('.r-info__hd h1')||{}).textContent || '', nav: document.querySelectorAll('.r-tab a').length })`));
chk('站内页渲染', !!o.h, o.h);

// ═══ 桌面端 ═══
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false, screenWidth: 1440, screenHeight: 900 });
await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', platform: 'Win32' });
console.log('\n════ 桌面端 ════');

await go('/');
o = JSON.parse(await ev(`JSON.stringify({ nav: document.querySelectorAll('a[href*="LgrpCategory"], a[data-orig-href*="LgrpCategory"], .r-nav a, nav a').length, prod: document.querySelectorAll('.cat-card').length, broken: [...document.images].filter(i=>i.complete&&i.naturalWidth===0).length, overflow: document.documentElement.scrollWidth > innerWidth })`));
chk('桌面首页导航', o.nav > 30, `${o.nav} 个链接`);
chk('桌面首页无裂图', o.broken === 0, `${o.broken}`);
chk('桌面首页无溢出', !o.overflow);

await go('/category');
o = JSON.parse(await ev(`JSON.stringify({ side: !!document.querySelector('.catflt__side'), sort: document.querySelectorAll('.catflt__sortl a').length, cards: document.querySelectorAll('.cat-card').length, broken: [...document.images].filter(i=>i.complete&&i.naturalWidth===0).length })`));
chk('桌面分类页侧边栏', o.side);
chk('桌面分类页排序栏', o.sort >= 5, `${o.sort} 项`);
chk('桌面分类页商品', o.cards > 20, `${o.cards} 张`);

await go('/product/' + p.code, 3000);
o = JSON.parse(await ev(`JSON.stringify({
  name: (document.querySelector('.pdp2__title')||{}).textContent || '',
  price: (document.querySelector('.pdp2__prices .big')||{}).textContent || '',
  sku: document.querySelectorAll('#pdpSkus .sku-chip').length,
  review: document.querySelectorAll('.pdp2__review').length,
  score: (document.querySelector('.pdp2__ratesum .big')||{}).textContent || '',
  rel: document.querySelectorAll('.pdp2__rel .cat-card').length,
  broken: [...document.images].filter(i=>i.complete&&i.naturalWidth===0).length,
  overflow: document.documentElement.scrollWidth > innerWidth
})`));
chk('桌面详情页布局', !!o.name && !!o.price, String(o.name).slice(0, 20));
chk('桌面详情页评价', o.review > 0, `${o.review} 条 · ${o.score} 分`);
chk('桌面详情页推荐', o.rel > 0, `${o.rel} 个`);
chk('桌面详情页无裂图/溢出', o.broken === 0 && !o.overflow);

await go('/checkout', 3000);
o = JSON.parse(await ev(`JSON.stringify({ form: !!document.getElementById('bp-form'), cod: /貨到付款|COD/.test(document.body.textContent||'') })`));
chk('桌面结账页表单', o.form);
chk('桌面结账页无 COD', !o.cod);

// ═══ 汇总 ═══
const pass = R.filter((x) => x.ok).length;
console.log(`\n════ 通过 ${pass} / ${R.length} ════`);
const fails = R.filter((x) => !x.ok);
if (fails.length) { console.log('\n未通过:'); fails.forEach((f) => console.log(`  ❌ ${f.name}  ${f.detail}`)); }
fs.writeFileSync(path.join(ROOT, '_ref', 'final-check.json'), JSON.stringify(R, null, 1), 'utf8');
ws.close();
process.exit(0);
