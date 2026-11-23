/**
 * 抓取真站推荐商品：POST /api/moecapp/getRecommendGoods
 *   body: {host:"ecmobile",data:{goodsCode, goodsSortedCode, recommendType:"8", ...}}
 * 写入 _ref/recommend.jsonl
 *
 * 用法：node _tools/harvest-recommend.mjs [数量] [起始偏移]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, '_ref', 'recommend.jsonl');
const PORT = 9222;

const LIMIT = Number(process.argv[2] || 300);
const OFFSET = Number(process.argv[3] || 0);

const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'site/data/catalog.json'), 'utf8'));
const items = cat.items.filter((x) => x.img && x.l).slice(OFFSET, OFFSET + LIMIT);
console.log('待抓商品:', items.length);

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

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 402, height: 874, deviceScaleFactor: 2, mobile: true, screenWidth: 402, screenHeight: 874 });
await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', platform: 'iPhone' });
await send('Page.navigate', { url: 'https://www.momoshop.com.tw/goods/GoodsDetail.jsp?i_code=' + items[0].code });
await sleep(8000);

const fd = fs.openSync(OUT, 'a');
let ok = 0, total = 0;

for (let i = 0; i < items.length; i++) {
  const { code, l } = items[i];
  const js = `(async () => {
    try {
      const r = await fetch('/api/moecapp/getRecommendGoods', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({host:"ecmobile",data:{categoryCode:"",ccguid:"",ccsession:"",curGoodsInfoListSize:0,curPage:1,custNo:"",goodsCode:"${code}",goodsSortedCode:"${l}",imgType:"webp",pageType:"1",recommendType:"8"}})
      });
      const j = await r.json();
      const list = (j.rtnData && j.rtnData.goodsInfoList) || [];
      return JSON.stringify({ ok: !!j.success, list: list.slice(0, 12).map(g => ({ c: g.goodsCode, n: g.goodsName || '', p: (g.goodsPriceModel && g.goodsPriceModel.basePrice && g.goodsPriceModel.basePrice.price) || '', m: (g.marketPriceModel && g.marketPriceModel.basePrice && g.marketPriceModel.basePrice.price) || '', i: g.imgUrl || '' })) });
    } catch (e) { return JSON.stringify({ ok: false }); }
  })()`;
  const raw = await ev(js, true);
  let o;
  try { o = JSON.parse(raw); } catch { o = { ok: false }; }
  if (o.ok && o.list && o.list.length) {
    ok++; total += o.list.length;
    fs.writeSync(fd, JSON.stringify({ code, recs: o.list }) + '\n');
  }
  if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${items.length}  成功 ${ok}  累计推荐 ${total}`);
  await sleep(320);
}

fs.closeSync(fd);
console.log(`\n完成：成功 ${ok} / ${items.length}，累计推荐 ${total}`);
ws.close();
process.exit(0);
