/**
 * 逐个检查 24 个站内页（桌面 + 手机）：状态码、裂图、坏链、横向溢出
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', '_ref', 'audit');
fs.mkdirSync(OUT, { recursive: true });

const BASE = process.argv[2] || 'https://tw-momo.pages.dev';
const PORT = 9222;
const MODE = process.argv[3] || 'both';

const files = fs.readdirSync(path.resolve(__dirname, '..', 'site', 'info')).filter((f) => f.endsWith('.html'));
const slugs = files.map((f) => f.replace(/\.html$/, ''));
console.log('站内页数量:', slugs.length);

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
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  return r.result && r.result.value;
};

await send('Page.enable');
await send('Runtime.enable');

const results = [];
const modes = MODE === 'both' ? ['desktop', 'mobile'] : [MODE];

for (const mode of modes) {
  const W = mode === 'mobile' ? 402 : 1440;
  const H = mode === 'mobile' ? 874 : 900;
  const prefix = mode === 'mobile' ? '/m/info/' : '/info/';
  await send('Emulation.setDeviceMetricsOverride', {
    width: W, height: H, deviceScaleFactor: 1, mobile: mode === 'mobile', screenWidth: W, screenHeight: H,
  });
  console.log(`\n── ${mode} ──`);
  for (const slug of slugs) {
    await send('Page.navigate', { url: BASE + prefix + slug });
    await sleep(1400);
    const r = await ev(`JSON.stringify({
      title: document.title,
      h: document.documentElement.scrollHeight,
      broken: [...document.images].filter(i => i.complete && i.naturalWidth === 0).length,
      imgs: document.images.length,
      overflow: document.documentElement.scrollWidth > innerWidth ? document.documentElement.scrollWidth - innerWidth : 0,
      deadA: [...document.querySelectorAll('a')].filter(a => { const h=a.getAttribute('href'); return !h || h === '#'; }).length,
      h1: (document.querySelector('h1, .r-info__hd h1, .card__hd h2') || {}).textContent || ''
    })`);
    let o = {};
    try { o = JSON.parse(r); } catch { o = { title: 'ERR' }; }
    const bad = (o.broken || 0) + (o.overflow ? 1 : 0) + (o.deadA || 0);
    results.push({ mode, slug, ...o });
    console.log(`${bad ? '⚠️' : '✅'} ${slug.padEnd(18)} h=${String(o.h).padStart(5)} 图${o.imgs} 裂${o.broken} 无href链${o.deadA} 溢出${o.overflow}` + (o.title ? '' : '  [空标题]'));
  }
}

fs.writeFileSync(path.join(OUT, 'audit-info.json'), JSON.stringify(results, null, 1), 'utf8');
const badList = results.filter((r) => (r.broken || 0) + (r.overflow ? 1 : 0) + (r.deadA || 0) > 0);
console.log(`\n总计 ${results.length} 次检查，有问题 ${badList.length} 个`);
ws.close();
process.exit(0);
