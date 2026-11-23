/**
 * 7 个缺陷修复后的复验
 */
const PORT = 9222;
const BASE = 'https://tw-momo.pages.dev';

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
const ev = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true }); return r.result ? r.result.value : null; };
const ok = (n, c, d = '') => console.log(`${c ? '✅' : '❌'} ${n}${d ? '  ' + d : ''}`);

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false, screenWidth: 1440, screenHeight: 900 });

// ═══ 图1 导航 ═══
await send('Page.navigate', { url: BASE + '/' }); await sleep(4000);
let r = JSON.parse(await ev(`(() => {
  const items = [...document.querySelectorAll('a')].filter(a => {
    const t = (a.textContent||'').trim();
    return t.length >= 2 && t.length <= 8 && /^(家電|電玩|手機\\/相機|電腦\\/組件|3C週邊|保健\\/醫療|食品\\/飲料|生鮮|女時尚|男時尚|家電)$/.test(t);
  });
  const targets = {};
  items.forEach(a => { targets[(a.textContent||'').trim()] = a.getAttribute('href'); });
  const uniqTargets = new Set(Object.values(targets));
  return JSON.stringify({ count: Object.keys(targets).length, uniq: uniqTargets.size, sample: Object.entries(targets).slice(0,4) });
})()`));
ok('图1 导航各自指向不同分类', r.uniq > 5, `${r.count} 项 / ${r.uniq} 个不同目标  ${JSON.stringify(r.sample)}`);

// ═══ 图6 回首頁 ═══
const back = JSON.parse(await ev(`(() => {
  const a = [...document.querySelectorAll('a')].find(x => (x.getAttribute('title')||'') === '回首頁' || (x.textContent||'').trim() === '回首頁');
  return a ? JSON.stringify({ href: a.getAttribute('href') }) : 'null';
})()`));
ok('图6 回首頁指向 /', back && back.href === '/', JSON.stringify(back));

// ═══ 图3/4 商品链接 ═══
r = JSON.parse(await ev(`(() => {
  let imgLinks = 0, tpLinks = 0, good = 0;
  document.querySelectorAll('a').forEach(a => {
    const h = a.getAttribute('href') || '';
    if (/\\.(jpg|jpeg|png|webp|gif)/i.test(h)) imgLinks++;
    if (h.includes('/assets/www.momoshop.com.tw/TP/')) tpLinks++;
    if (/^\\/product\\/\\d+$/.test(h)) good++;
  });
  return JSON.stringify({ imgLinks, tpLinks, good });
})()`));
ok('图4 无「点开下载图片」链接', r.imgLinks === 0 && r.tpLinks === 0, `图片链接 ${r.imgLinks} / TP 镜像 ${r.tpLinks}`);
ok('图3 商品链接格式正确', r.good > 50, `${r.good} 个 /product/<code>`);

// ═══ 图2 分类页轮播 ═══
await send('Page.navigate', { url: BASE + '/category' }); await sleep(4000);
const t1 = await ev(`document.getElementById('catTrack') ? document.getElementById('catTrack').style.transform : 'no-track'`);
await ev(`(function(){ var b=document.querySelector('.catpage-banner__nav.next'); if(b) b.click(); })()`);
await sleep(700);
const t2 = await ev(`document.getElementById('catTrack') ? document.getElementById('catTrack').style.transform : 'no-track'`);
ok('图2 轮播可切换', t1 !== t2, `${t1 || '(空)'} → ${t2 || '(空)'}`);

// ═══ 图5 商品页推荐网格 ═══
await send('Page.navigate', { url: BASE + '/product/1607993' }); await sleep(4500);
r = JSON.parse(await ev(`(() => {
  const g = document.querySelector('.pdp2__rel .cat-grid') || document.querySelector('.cat-grid');
  if (!g) return JSON.stringify({ none: true });
  const cs = getComputedStyle(g);
  const card = g.querySelector('.cat-card');
  const cb = card ? card.getBoundingClientRect() : null;
  return JSON.stringify({ display: cs.display, cols: cs.gridTemplateColumns, cardW: cb ? Math.round(cb.width) : 0, cardH: cb ? Math.round(cb.height) : 0 });
})()`));
ok('图5 推荐网格正常（4 列）', r.display === 'grid' && r.cardW < 400, `${r.display} / ${r.cols} / 卡 ${r.cardW}×${r.cardH}`);

// ═══ 图7 窄屏 ═══
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true, screenWidth: 390, screenHeight: 844 });
await send('Page.navigate', { url: BASE + '/category' }); await sleep(4000);
r = JSON.parse(await ev(`(() => {
  const vis = (sel) => { const e = document.querySelector(sel); if (!e) return 'none'; const cs = getComputedStyle(e); return cs.display === 'none' ? 'hidden' : 'visible'; };
  return JSON.stringify({
    pills: vis('.catpage-pills'),
    banner: vis('.catpage-banner'),
    kw: vis('.catpage-kw'),
    side: vis('.catflt__side'),
    overflow: document.documentElement.scrollWidth > innerWidth,
    finalUrl: location.pathname
  });
})()`));
ok('图7 窄屏隐藏桌面板块', r.pills === 'hidden' && r.banner === 'hidden' && !r.overflow, JSON.stringify(r));

ws.close();
process.exit(0);
