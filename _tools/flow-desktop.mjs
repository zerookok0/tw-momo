const PORT = 9222, BASE = 'https://tw-momo.pages.dev';
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r,j)=>{ ws.onopen=r; ws.onerror=j; });
let id=0; const pending=new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params={}) => new Promise((res,rej)=>{ const mid=++id; pending.set(mid, m => m.error ? rej(new Error(method+": "+m.error.message)) : res(m.result)); ws.send(JSON.stringify({id:mid,method,params})); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ev = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true }); return r.result && r.result.value; };
const go = async (u) => { await send('Page.navigate', { url: BASE + u }); await sleep(3200); };
const ok = (n, c, d) => console.log((c ? '✅' : '❌') + ' ' + n + (d ? '  ' + d : ''));
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width:1440, height:900, deviceScaleFactor:1, mobile:false, screenWidth:1440, screenHeight:900 });

// 商品页 加入购物车
await go('/product/1341656');
await ev(`localStorage.removeItem('momo_cart')`);
await ev(`document.getElementById('btn-add-cart').click()`);
await sleep(700);
const cart = await ev(`localStorage.getItem('momo_cart') || '[]'`);
ok('桌面 加入購物車', JSON.parse(cart).length > 0, '购物车 ' + JSON.parse(cart).length + ' 条');

// 购物车 数量 + / 结账链接
await go('/cart');
const before = await ev(`(document.getElementById('cart-total')||{}).textContent`);
await ev(`(() => { const b=[...document.querySelectorAll('.qty button')].pop(); if(b) b.click(); })()`);
await sleep(600);
const after = await ev(`(document.getElementById('cart-total')||{}).textContent`);
ok('桌面 购物车数量+', before !== after, before + ' → ' + after);
const href = await ev(`(document.getElementById('go-checkout')||{}).getAttribute ? document.getElementById('go-checkout').getAttribute('href') : null`);
ok('桌面 前往結帳是链接', href === '/checkout/', String(href));

// 分类页 轮播
await go('/category');
const t1 = await ev(`document.getElementById('catTrack').style.transform`);
await ev(`document.querySelector('.catpage-banner__nav.next').click()`);
await sleep(500);
const t2 = await ev(`document.getElementById('catTrack').style.transform`);
ok('桌面 分类页轮播', t1 !== t2, t1 + ' → ' + t2);
ws.close(); process.exit(0);
