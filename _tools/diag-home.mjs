/**
 * 首页链接取证（正确 attach 到 page target）
 */
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

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false, screenWidth: 1440, screenHeight: 900 });
await send('Page.navigate', { url: 'https://tw-momo.pages.dev/' });
await sleep(4500);

console.log('=== 首页：指向图片文件的链接 ===');
console.log(await ev(`(() => {
  const bad = [];
  document.querySelectorAll('a').forEach(a => {
    const h = a.getAttribute('href') || '';
    if (/\\.(jpg|jpeg|png|webp|gif)/i.test(h)) bad.push({ t: (a.textContent||'').trim().slice(0,18), h: h.slice(0,90) });
  });
  return JSON.stringify(bad.slice(0,10), null, 1);
})()`));

console.log('\n=== 首页：商品卡 href 与名称 ===');
console.log(await ev(`(() => {
  const out = [];
  document.querySelectorAll('a[href*="/product/"]').slice(0, 8).forEach(a => {
    const code = (a.getAttribute('href')||'').replace('/product/','');
    const name = (a.textContent||'').replace(/\\s+/g,' ').trim().slice(0, 30);
    out.push({ code, name });
  });
  return JSON.stringify(out, null, 1);
})()`));

console.log('\n=== 首页：图片所在容器的链接 ===');
console.log(await ev(`(() => {
  const imgs = [...document.images].filter(i => /goodsimg/.test(i.currentSrc||i.src));
  const out = [];
  for (let i = 0; i < Math.min(8, imgs.length); i++) {
    let el = imgs[i].closest('a');
    out.push({ img: (imgs[i].currentSrc||'').slice(-38), href: el ? el.getAttribute('href') : '(无 A 标签)' });
  }
  return JSON.stringify(out, null, 1);
})()`));

console.log('\n=== 首页：熱搜榜区域 ===');
console.log(await ev(`(() => {
  const el = [...document.querySelectorAll('*')].find(e => (e.textContent||'').includes('熱搜榜') && e.children.length < 12);
  if (!el) return '未找到';
  const links = el.querySelectorAll('a');
  return JSON.stringify({ links: links.length, sample: [...links].slice(0,4).map(a=>({t:(a.textContent||'').trim().slice(0,16), h:a.getAttribute('href')})) }, null, 1);
})()`));
ws.close();
process.exit(0);
