/**
 * 抓取真实商品评价：POST https://eccapi.momoshop.com.tw/user/getGoodsComment
 *   body: {"host":"mobile","goodsCode":"<code>","custNo":""}
 *   返回 commentAvg / commentCount / saleCount / goodsComments[]
 * 写入 _ref/reviews.jsonl
 *
 * 用法：node _tools/harvest-reviews.mjs [数量] [起始偏移]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, '_ref', 'reviews.jsonl');
const PORT = 9222;

const LIMIT = Number(process.argv[2] || 300);
const OFFSET = Number(process.argv[3] || 0);

const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'site/data/catalog.json'), 'utf8'));
const codes = cat.items.filter((x) => x.img).map((x) => String(x.code)).slice(OFFSET, OFFSET + LIMIT);
console.log('待抓商品:', codes.length, ' 起始偏移:', OFFSET);

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
await send('Page.navigate', { url: 'https://www.momoshop.com.tw/goods/GoodsDetail.jsp?i_code=' + codes[0] });
await sleep(8000);

const fd = fs.openSync(OUT, 'a');
let ok = 0, withRev = 0;

for (let i = 0; i < codes.length; i++) {
  const code = codes[i];
  const js = `(async () => {
    try {
      const r = await fetch('https://eccapi.momoshop.com.tw/user/getGoodsComment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: 'mobile', goodsCode: '${code}', custNo: '' })
      });
      const t = await r.text();
      const j = JSON.parse(t);
      return JSON.stringify({ ok: !!j.success, avg: j.commentAvg, cnt: j.commentCount, sale: j.saleCount, list: (j.goodsComments || []).slice(0, 6) });
    } catch (e) { return JSON.stringify({ ok: false, err: String(e).slice(0, 60) }); }
  })()`;
  const raw = await ev(js, true);
  let o;
  try { o = JSON.parse(raw); } catch { o = { ok: false }; }
  if (o.ok) {
    ok++;
    if (o.list && o.list.length) withRev++;
    fs.writeSync(fd, JSON.stringify({ code, avg: o.avg, cnt: o.cnt, sale: o.sale, reviews: o.list }) + '\n');
  }
  if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${codes.length}  成功 ${ok}  有评论 ${withRev}`);
  await sleep(350);
}

fs.closeSync(fd);
console.log(`\n完成：成功 ${ok} / ${codes.length}，其中有评论 ${withRev}`);
ws.close();
process.exit(0);
