/**
 * 抓取真站 SKU 列表：POST /api/moecapp/getAdditionalGoodsInfo
 *   body: {host:"ecmobile",data:{goodsCode, custNo:"", imgType:"webp"}}
 *   返回 rtnData.additionalGoodsInfoList[] = 同款其它规格（不同 goodsCode）
 * 写入 _ref/skus.jsonl
 *
 * 用法：node _tools/harvest-skus.mjs [数量] [起始偏移]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, '_ref', 'skus.jsonl');
const PORT = 9222;

const LIMIT = Number(process.argv[2] || 500);
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
const ev = async (e, aw = false) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: aw }); return r.result ? r.result.value : null; };

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 402, height: 874, deviceScaleFactor: 2, mobile: true, screenWidth: 402, screenHeight: 874 });
await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', platform: 'iPhone' });

if (!items.length) { console.log('无商品'); process.exit(0); }
await send('Page.navigate', { url: 'https://www.momoshop.com.tw/goods/GoodsDetail.jsp?i_code=' + items[0].code });
await sleep(8000);

const fd = fs.openSync(OUT, 'a');
let ok = 0, withSku = 0, total = 0;

for (let i = 0; i < items.length; i++) {
  const code = String(items[i].code);
  const js = `(async () => {
    try {
      const r = await fetch('/api/moecapp/getAdditionalGoodsInfo', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({host:"ecmobile",data:{goodsCode:"${code}",custNo:"",imgType:"webp"}}) });
      const j = await r.json();
      const list = (j.rtnData && j.rtnData.additionalGoodsInfoList) || [];
      return JSON.stringify(list.map(g => ({
        c: g.goodsCode, n: g.goodsName || '',
        p: (g.goodsPriceV2 && g.goodsPriceV2.basePrice && g.goodsPriceV2.basePrice.price) || g.goodsPrice || '',
        i: g.imgUrl || ''
      })));
    } catch (e) { return '[]'; }
  })()`;
  const raw = await ev(js, true);
  let list = [];
  try { list = JSON.parse(raw || '[]'); } catch {}
  ok++;
  if (list.length) {
    withSku++; total += list.length;
    fs.writeSync(fd, JSON.stringify({ code, skus: list }) + '\n');
  }
  if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${items.length}  有规格 ${withSku}  累计规格 ${total}`);
  await sleep(260);
}

fs.closeSync(fd);
console.log(`\n完成：请求 ${ok}，有规格商品 ${withSku}，累计规格 ${total}`);
ws.close();
process.exit(0);
