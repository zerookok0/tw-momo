/**
 * 全量抓取：商品评价 + 推荐商品（专用 Chrome 9333，断点续跑）
 *
 * 用法：node _tools/harvest-all.mjs [每批数量] [并发间隔ms]
 * 已抓过的 code 会跳过（读 _ref/reviews.jsonl 与 _ref/recommend.jsonl 的已有 code）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const RV = path.join(ROOT, '_ref', 'reviews.jsonl');
const RC = path.join(ROOT, '_ref', 'recommend.jsonl');
const PORT = 9333;                       // 专用抓取实例，不与其他脚本抢 target
const DELAY = Number(process.argv[2] || 300);

const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'site/data/catalog.json'), 'utf8'));

const done = new Set();
for (const f of [RV, RC]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { const o = JSON.parse(line); if (o.code) done.add(String(o.code)); } catch {}
  }
}
console.log('已有记录商品:', done.size);

const todo = cat.items.filter((x) => x.img && !done.has(String(x.code)));
console.log('待抓商品:', todo.length);

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

if (!todo.length) { console.log('全部已抓完'); process.exit(0); }
await send('Page.navigate', { url: 'https://www.momoshop.com.tw/goods/GoodsDetail.jsp?i_code=' + todo[0].code });
await sleep(8000);

const fdr = fs.openSync(RV, 'a');
const fdc = fs.openSync(RC, 'a');
let okR = 0, okC = 0;

for (let i = 0; i < todo.length; i++) {
  const { code, l } = todo[i];
  const js = `(async () => {
    const out = {};
    try {
      const r1 = await fetch('https://eccapi.momoshop.com.tw/user/getGoodsComment', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ host:'mobile', goodsCode:'${code}', custNo:'' })
      });
      const j1 = await r1.json();
      if (j1.success) out.rev = { ok:1, avg:j1.commentAvg, cnt:j1.commentCount, sale:j1.saleCount, list:(j1.goodsComments||[]).slice(0,6) };
    } catch (e) {}
    try {
      const r2 = await fetch('/api/moecapp/getRecommendGoods', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({host:"ecmobile",data:{categoryCode:"",ccguid:"",ccsession:"",curGoodsInfoListSize:0,curPage:1,custNo:"",goodsCode:"${code}",goodsSortedCode:"${l || ''}",imgType:"webp",pageType:"1",recommendType:"8"}})
      });
      const j2 = await r2.json();
      const list = (j2.rtnData && j2.rtnData.goodsInfoList) || [];
      if (list.length) out.rec = list.slice(0,12).map(g => ({ c:g.goodsCode, n:g.goodsName||'', p:(g.goodsPriceModel&&g.goodsPriceModel.basePrice&&g.goodsPriceModel.basePrice.price)||'', m:(g.marketPriceModel&&g.marketPriceModel.basePrice&&g.marketPriceModel.basePrice.price)||'', i:g.imgUrl||'' }));
    } catch (e) {}
    return JSON.stringify(out);
  })()`;
  const raw = await ev(js, true);
  let o = {};
  try { o = JSON.parse(raw); } catch {}
  if (o.rev) { fs.writeSync(fdr, JSON.stringify({ code, avg: o.rev.avg, cnt: o.rev.cnt, sale: o.rev.sale, reviews: o.rev.list }) + '\n'); okR++; }
  if (o.rec && o.rec.length) { fs.writeSync(fdc, JSON.stringify({ code, recs: o.rec }) + '\n'); okC++; }
  if ((i + 1) % 100 === 0) console.log(`  ${i + 1}/${todo.length}  评价 ${okR}  推荐 ${okC}`);
  await sleep(DELAY);
}

fs.closeSync(fdr);
fs.closeSync(fdc);
console.log(`\n完成：评价 ${okR}  推荐 ${okC}`);
ws.close();
process.exit(0);
