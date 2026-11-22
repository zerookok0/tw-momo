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

const res = await ev(`(() => {
  const sc = [...document.querySelectorAll('div')].find(d => /mu-overflow-y-auto/.test(d.className||''));
  if (!sc) return JSON.stringify({err:'no scroll container'});
  const secs = [...sc.children].map(c => {
    const r = c.getBoundingClientRect();
    return {
      tag: c.tagName,
      cls: (c.className||'').toString(),
      top: Math.round(r.top - sc.getBoundingClientRect().top + sc.scrollTop),
      h: Math.round(r.height),
      text: (c.textContent||'').replace(/\\s+/g,' ').trim().slice(0,100),
    };
  });
  return JSON.stringify({ scrollH: sc.scrollHeight, clientH: sc.clientHeight, secs }, null, 1);
})()`);
fs.writeFileSync(path.join(OUT, "sections.json"), res, "utf8");
console.log(res.slice(0, 3000));
ws.close(); process.exit(0);
