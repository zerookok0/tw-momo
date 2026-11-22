import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "..", "_ref", "real-mobile");
const PORT = 9222, W = 402, H = 874;
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r,j)=>{ ws.onopen=r; ws.onerror=j; });
let id=0; const pending=new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params={}) => new Promise((res,rej)=>{ const mid=++id; pending.set(mid, m => m.error ? rej(new Error(method+": "+m.error.message)) : res(m.result)); ws.send(JSON.stringify({id:mid,method,params})); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true }); return r.result && r.result.value; };
await send("Runtime.enable");

// 关掉 APP 引导弹窗：找含「繼續使用網頁版」的元素点击
const closed = await ev(`(() => {
  const all = [...document.querySelectorAll('a,button,div,span')];
  const el = all.find(e => (e.textContent||'').trim() === '繼續使用網頁版');
  if (el) { el.click(); return 'clicked'; }
  // 兜底：移除遮罩
  const masks = [...document.querySelectorAll('div')].filter(d => {
    const cs = getComputedStyle(d);
    return cs.position === 'fixed' && Number(cs.zIndex) > 1000 && d.getBoundingClientRect().height > innerHeight * 0.5;
  });
  masks.forEach(m => m.remove());
  return masks.length ? 'removed ' + masks.length : 'notfound';
})()`);
console.log("关弹窗:", closed);
await sleep(1500);

const info = await ev(`JSON.stringify({h:document.documentElement.scrollHeight,w:innerWidth})`);
console.log("页面:", info);
const html = await ev("document.documentElement.outerHTML");
fs.writeFileSync(path.join(OUT, "page-clean.html"), html || "", "utf8");
console.log("DOM:", (html||"").length);

// 全页截图
const m = await send("Page.getLayoutMetrics");
const fullH = Math.min(Math.round(m.cssContentSize.height), 14000);
const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x:0, y:0, width:W, height:fullH, scale:2 } });
fs.writeFileSync(path.join(OUT, "shot-full.png"), Buffer.from(shot.data, "base64"));
console.log("全页高度:", fullH);
ws.close(); process.exit(0);
