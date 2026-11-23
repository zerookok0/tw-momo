/**
 * 7 个缺陷的取证脚本
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASE = 'https://tw-momo.pages.dev';
const PORT = 9222;

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
const go = async (u, w = 3000) => { await send('Page.navigate', { url: BASE + u }); await sleep(w); };

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });

// ═══ 图1：桌面导航链接 ═══
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false, screenWidth: 1440, screenHeight: 900 });
await go('/');
console.log('════ 图1：桌面主导航链接目标 ════');
console.log(await ev(`(() => {
  const items = [...document.querySelectorAll('a')].filter(a => /首頁|限時搶購|直播|mo店\\+|看看買|家電|電玩|手機\\/相機|電腦\\/組件|3C週邊|保健\\/醫療|食品\\/飲料|生鮮|女時尚|男時尚/.test(a.textContent||'') && (a.textContent||'').length < 10);
  const uniq = {};
  items.slice(0, 20).forEach(a => {
    const t = (a.textContent||'').trim();
    const h = a.getAttribute('href');
    if (!uniq[t]) uniq[t] = h;
  });
  return JSON.stringify(uniq, null, 1);
})()`));

// ═══ 图2：分类页轮播 ═══
await go('/category');
console.log('\n════ 图2：分类页轮播元素与状态 ════');
console.log(await ev(`(() => {
  const t = document.getElementById('catTrack');
  const box = document.getElementById('catBanner');
  const next = document.querySelector('.catpage-banner__nav.next');
  const script = [...document.querySelectorAll('script[src]')].map(s=>s.getAttribute('src')).filter(s=>/carousel/.test(s));
  return JSON.stringify({
    hasTrack: !!t, slides: t ? t.children.length : 0,
    hasNext: !!next,
    scriptLoaded: script,
    trackTransform: t ? t.style.transform : null,
    bannerCount: document.querySelectorAll('.catpage-banner').length
  });
})()`));

// ═══ 图3/4：产品链接目标 ═══
console.log('\n════ 图3/4：分类页商品链接样本 ════');
console.log(await ev(`(() => {
  const out = { total: 0, bad: [], imgLinks: [], samples: [] };
  const links = [...document.querySelectorAll('a')];
  out.total = links.length;
  links.forEach(a => {
    const h = a.getAttribute('href') || '';
    if (/\\\\.(jpg|jpeg|png|webp|gif)(\\\\?|$)/i.test(h)) out.imgLinks.push({ t: (a.textContent||'').trim().slice(0,20), h: h.slice(0,80) });
    if (h && !h.startsWith('/') && !h.startsWith('http') && !h.startsWith('#')) out.bad.push({ t: (a.textContent||'').trim().slice(0,16), h: h.slice(0,60) });
  });
  out.imgLinks = out.imgLinks.slice(0, 8);
  out.bad = out.bad.slice(0, 8);
  // 商品卡链接
  out.samples = [...document.querySelectorAll('.cat-card')].slice(0,3).map(c => ({
    href: c.getAttribute('href'),
    name: (c.querySelector('.cat-card__name')||{}).textContent?.slice(0,20)
  }));
  return JSON.stringify(out, null, 1);
})()`));

// ═══ 图6：回首頁 ═══
console.log('\n════ 图6：回首頁链接 ════');
console.log(await ev(`(() => {
  const a = [...document.querySelectorAll('a')].find(x => (x.textContent||'').trim() === '回首頁');
  return a ? JSON.stringify({ href: a.getAttribute('href'), tag: a.tagName, onclick: !!a.onclick }) : '未找到「回首頁」';
})()`));

// ═══ 图5：商品页 限時搶購 布局 ═══
await go('/product/1607993', 3500);
console.log('\n════ 图5：商品页 限時搶購 区块布局 ════');
console.log(await ev(`(() => {
  const rel = document.querySelector('.pdp2__rel, .r-sec');
  const grid = document.querySelector('.cat-grid, .r-grid');
  const cards = document.querySelectorAll('.cat-card, .r-card');
  const cs = grid ? getComputedStyle(grid) : null;
  const first = cards[0] ? cards[0].getBoundingClientRect() : null;
  return JSON.stringify({
    cards: cards.length,
    gridCols: cs ? cs.gridTemplateColumns : 'no grid',
    gridWidth: grid ? Math.round(grid.getBoundingClientRect().width) : 0,
    firstCard: first ? { w: Math.round(first.width), h: Math.round(first.height) } : null,
    parentCls: grid ? grid.className : null
  });
})()`));

// ═══ 图7：手机分类页 ═══
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true, screenWidth: 390, screenHeight: 844 });
await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', platform: 'iPhone' });
await go('/m/category', 3500);
console.log('\n════ 图7：手机分类页 ════');
console.log(await ev(`(() => {
  return JSON.stringify({
    pills: document.querySelectorAll('.catpage-pills').length,
    banner: document.querySelectorAll('.catpage-banner').length,
    kw: document.querySelectorAll('.catpage-kw').length,
    catflt: document.querySelectorAll('.catflt').length,
    rChips: document.querySelectorAll('.r-chip').length,
    rCards: document.querySelectorAll('.r-card').length,
    title: document.title,
    bodyOverflow: document.documentElement.scrollWidth > innerWidth
  });
})()`));
ws.close();
process.exit(0);
