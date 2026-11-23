/**
 * 抓取真站商品规格：从商品页的 JSON-LD（application/ld+json）里取
 *   additionalProperty: [{name:"顏色", value:"黑色、灰色、膚色、粉紅色"}, ...]
 * 写入 _ref/specs.jsonl
 *
 * 用法：node _tools/harvest-specs.mjs [数量] [起始偏移]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, '_ref', 'specs.jsonl');
const PORT = 9222;

const LIMIT = Number(process.argv[2] || 300);
const OFFSET = Number(process.argv[3] || 0);

const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'site/data/catalog.json'), 'utf8'));
const items = cat.items.filter((x) => x.img).slice(OFFSET, OFFSET + LIMIT);
console.log('待抓商品:', items.length, ' 起始:', OFFSET);

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
await send('Emulation.setDeviceMetricsOverride', { width: 402, height: 874, deviceScaleFactor: 2, mobile: true, screenWidth: 402, screenHeight: 874 });
await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', platform: 'iPhone' });

const fd = fs.openSync(OUT, 'a');
let ok = 0, withSpec = 0;

for (let i = 0; i < items.length; i++) {
  const code = String(items[i].code);
  await send('Page.navigate', { url: 'https://www.momoshop.com.tw/goods/GoodsDetail.jsp?i_code=' + code });
  await sleep(1400);
  const raw = await ev(`(() => {
    try {
      const els = [...document.querySelectorAll('script[type="application/ld+json"]')];
      for (const el of els) {
        const j = JSON.parse(el.textContent || '{}');
        const ap = j.additionalProperty || (j.offers && j.offers.additionalProperty) || [];
        if (ap && ap.length) {
          return JSON.stringify(ap.map(p => ({ n: p.name, v: p.value })).filter(p => p.n && p.v));
        }
      }
      return 'null';
    } catch (e) { return 'null'; }
  })()`);
  let props = null;
  try { props = JSON.parse(raw || 'null'); } catch {}
  ok++;
  if (props && props.length) {
    withSpec++;
    fs.writeSync(fd, JSON.stringify({ code, props }) + '\n');
  }
  if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${items.length}  有规格 ${withSpec}`);
}

fs.closeSync(fd);
console.log(`\n完成：请求 ${ok}，有规格商品 ${withSpec}`);
ws.close();
process.exit(0);
