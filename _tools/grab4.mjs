import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "..", "_ref", "real-mobile");
const PORT = 9222;
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r,j)=>{ ws.onopen=r; ws.onerror=j; });
let id=0; const pending=new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params={}) => new Promise((res,rej)=>{ const mid=++id; pending.set(mid, m => m.error ? rej(new Error(method+": "+m.error.message)) : res(m.result)); ws.send(JSON.stringify({id:mid,method,params})); });
const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true }); return r.result && r.result.value; };
await send("Runtime.enable");

// 找可滚动容器
const sc = await ev(`(() => {
  const out = [];
  document.querySelectorAll('*').forEach(el => {
    const cs = getComputedStyle(el);
    const scrollable = /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 50;
    if (scrollable) out.push({ tag: el.tagName, id: el.id, cls: (el.className||'').toString().slice(0,60), sh: el.scrollHeight, ch: el.clientHeight });
  });
  return JSON.stringify(out.slice(0, 8), null, 1);
})()`);
console.log("滚动容器:", sc);

// 顶层结构
const struct = await ev(`(() => {
  const out = [];
  const roots = document.querySelectorAll('body > *, #app > *, .momo-main > *');
  roots.forEach(c => {
    const r = c.getBoundingClientRect();
    out.push({ tag: c.tagName, id: c.id||'', cls: (c.className||'').toString().slice(0,80), h: Math.round(r.height), w: Math.round(r.width), text: (c.textContent||'').replace(/\\s+/g,' ').trim().slice(0,60) });
  });
  return JSON.stringify(out, null, 1);
})()`);
console.log("body 直接子元素:", struct);
fs.writeFileSync(path.join(OUT, "structure.json"), struct + "\n" + sc, "utf8");
ws.close(); process.exit(0);
