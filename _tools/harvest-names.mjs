/**
 * 商品名补全：调用真站分类接口拿完整商品名
 *
 * 接口：POST /api/moecapp/getCategoryGoodsV3
 *       返回 rtnGoodsData.goodsInfoList[].goodsName（完整名）+ goodsCode
 * 做法：从我们目录里取各 l_code，按页抓取，写入 _ref/names.jsonl
 *
 * 用法：node _tools/harvest-names.mjs [最多抓几个 l_code] [每个最多几页]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, '_ref', 'names.jsonl');
const PORT = 9222;

const MAX_LCODES = Number(process.argv[2] || 40);
const MAX_PAGES = Number(process.argv[3] || 30);

// 1) 统计我们目录里的 l_code
const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'site/data/catalog.json'), 'utf8'));
const tally = {};
for (const it of cat.items) {
  const l = it.l || '';
  if (!l) continue;
  tally[l] = (tally[l] || 0) + 1;
}
const codes = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, MAX_LCODES);
console.log('目录 l_code 数:', Object.keys(tally).length, '  取样:', codes.length);
console.log('前 5 个:', codes.slice(0, 5).map(([l, n]) => `${l}(${n})`).join(' '));

// 2) 连浏览器
const ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
let SID = null;
const rootSend = (method, params = {}, sess) => new Promise((res, rej) => {
  const mid = ++id;
  pending.set(mid, (m) => (m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result)));
  ws.send(JSON.stringify({ id: mid, method, params, ...(sess ? { sessionId: sess } : {}) }));
});
const send = (method, params = {}) => rootSend(method, params, SID);
const { targetId } = await rootSend('Target.createTarget', { url: 'about:blank' });
const att = await rootSend('Target.attachToTarget', { targetId, flatten: true });
SID = att.sessionId;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = async (expr, awaitPromise = false) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise });
  if (r.exceptionDetails) return null;
  return r.result && r.result.value;
};

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false, screenWidth: 1440, screenHeight: 900 });
await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', platform: 'Win32' });

// 先在一个分类页里，保证同源上下文
await send('Page.navigate', { url: 'https://www.momoshop.com.tw/category/LgrpCategory.jsp?l_code=' + codes[0][0] });
await sleep(7000);

const DONE = path.join(ROOT, '_ref', 'harvest-done.txt');
const done = new Set(fs.existsSync(DONE) ? fs.readFileSync(DONE, 'utf8').split('\n').filter(Boolean) : []);
const doneFd = fs.openSync(DONE, 'a');
console.log('已完成类目:', done.size);

await send('Network.enable');
let callCount = 0;
async function refreshSession(lcode) {
  try { await send('Network.clearBrowserCookies'); } catch (e) {}
  await send('Page.navigate', { url: 'https://www.momoshop.com.tw/category/LgrpCategory.jsp?l_code=' + lcode });
  await sleep(6000);
}

const fd = fs.openSync(OUT, 'a');
let total = 0;

for (const [lcode, cnt] of codes) {
  if (done.has(lcode)) { console.log(`跳过 ${lcode}（已完成）`); continue; }
  let pages = 0, got = 0;
  for (let p = 1; p <= MAX_PAGES; p++) {
    const js = `(async () => {
      const body = {host:"momoshop",data:{curPage:"${p}",cateCode:"${lcode}",searchType:"",isSpecialSortType:true,cateLevel:"1",salesSort:"",custNo:"",imgType:"webp",sortType:"",priceS:"",priceE:"",commentRate:"",brandCode:[],brandName:[],indexInfoList:[],brandSeriesList:[],ecTagNos:[],first:"N",freeze:"N",prefere:"N",NAM:"N",cod:"N",superstorePay:"N",moCoinFeedback:"N"}};
      const r = await fetch('/api/moecapp/getCategoryGoodsV3', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const j = await r.json();
      const list = (j.rtnGoodsData && j.rtnGoodsData.goodsInfoList) || [];
      return JSON.stringify({ max: Number(j.maxPage||0), list: list.map(g => ({ c: String(g.goodsCode||''), n: g.goodsName || '', p: g.price || '', i: g.imgUrl || '' })) });
    })()`;
    callCount++;
    if (callCount % 50 === 0) await refreshSession(lcode);
    const raw = await ev(js, true);
    if (!raw) { await sleep(600); continue; }
    let o;
    try { o = JSON.parse(raw); } catch { continue; }
    pages = o.max || pages;
    if (!o.list.length) {
      if (p === 1) { await refreshSession(lcode); continue; }
      break;
    }
    for (const g of o.list) {
      if (g.c && g.n) { fs.writeSync(fd, JSON.stringify({ ...g, l: lcode }) + '\n'); got++; }
    }
    total += o.list.length;
    if (p >= pages) break;
    await sleep(2000);
  }
  if (got > 0) fs.writeSync(doneFd, lcode + '\n');
  console.log(`l_code ${lcode} (目录${cnt}件)  抓到 ${got} 条，共 ${pages} 页`);
}

fs.closeSync(fd);
fs.closeSync(doneFd);
console.log(`\n完成，累计写入 ${total} 条 → ${OUT}`);
ws.close();
process.exit(0);
