import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "..", "_ref", "real-mobile", "slices");
fs.mkdirSync(OUT, { recursive: true });
const PORT = 9222, W = 402, STEP = 700;
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

const max = await ev(`(() => { const sc=[...document.querySelectorAll('div')].find(d=>/mu-overflow-y-auto/.test(d.className||'')); return sc.scrollHeight; })()`);
console.log("scrollHeight:", max);
let n = 0;
for (let y = 0; y < Math.min(max, 6300); y += STEP) {
  await ev(`(() => { const sc=[...document.querySelectorAll('div')].find(d=>/mu-overflow-y-auto/.test(d.className||'')); sc.scrollTop=${y}; })()`);
  await sleep(900);
  const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 82 });
  fs.writeFileSync(path.join(OUT, `s${String(n).padStart(2,"0")}_y${y}.jpg`), Buffer.from(shot.data, "base64"));
  n++;
}
console.log("已抓", n, "张切片");
ws.close(); process.exit(0);
