/**
 * 商品页冒烟测试：随机抽 N 个商品，双端检查
 *   状态码 / 标题 / 价格 / SKU / 评价区 / 推荐区 / 裂图
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASE = process.argv[2] || 'https://tw-momo.pages.dev';
const N = Number(process.argv[3] || 25);

const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'site/data/catalog.json'), 'utf8'));
const items = cat.items.filter((x) => x.img);
// 均匀抽样
const step = Math.floor(items.length / N);
const sample = Array.from({ length: N }, (_, i) => items[i * step]).filter(Boolean);

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
const ev = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true }); return r.result && r.result.value; };

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 402, height: 874, deviceScaleFactor: 2, mobile: true, screenWidth: 402, screenHeight: 874 });

let pass = 0, fail = 0;
const problems = [];

for (const mode of ['mobile', 'desktop']) {
  const W = mode === 'mobile' ? 402 : 1440;
  const H = mode === 'mobile' ? 874 : 900;
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: mode === 'mobile', screenWidth: W, screenHeight: H });
  console.log(`\n── ${mode} ──`);
  for (const it of sample) {
    const url = (mode === 'mobile' ? '/m/product/' : '/product/') + it.code;
    await send('Page.navigate', { url: BASE + url });
    await sleep(1500);
    const r = await ev(`JSON.stringify({
      title: document.title,
      h1: (document.querySelector('h1, .r-pdp__name') || {}).textContent || '',
      price: (document.querySelector('.r-pdp__priceline .now, .pdp2__prices .big') || {}).textContent || '',
      sku: document.querySelectorAll('.m-sku-chip, .sku-chip').length,
      review: !!document.querySelector('#sec-review, .pdp2__reviews'),
      rec: document.querySelectorAll('.r-pdp__rec2, .pdp2__rel .cat-card').length,
      broken: [...document.images].filter(i => i.complete && i.naturalWidth === 0).length,
      overflow: document.documentElement.scrollWidth > innerWidth
    })`);
    let o;
    try { o = JSON.parse(r); } catch { o = {}; }
    const bad = !o.title || !o.h1 || !o.price || o.broken > 0 || o.overflow;
    if (bad) { fail++; problems.push({ mode, code: it.code, ...o }); console.log(`❌ ${it.code}  ${JSON.stringify(o).slice(0, 150)}`); }
    else pass++;
  }
}

console.log(`\n通过 ${pass} / ${pass + fail}`);
if (problems.length) {
  console.log('\n问题清单:');
  problems.slice(0, 10).forEach((p) => console.log(`  [${p.mode}] ${p.code}  title=${!!p.title} h1=${!!p.h1} price=${!!p.price} 裂图=${p.broken} 溢出=${p.overflow}`));
}
ws.close();
process.exit(fail ? 1 : 0);
