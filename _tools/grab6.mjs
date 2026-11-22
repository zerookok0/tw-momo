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
  const main = sc.querySelector('main');
  const out = [];
  const walk = (el, d) => {
    [...el.children].forEach(c => {
      const r = c.getBoundingClientRect();
      if (r.height < 24) return;
      out.push({ d, tag: c.tagName, cls: (c.className||'').toString().slice(0,140), h: Math.round(r.height), w: Math.round(r.width), text: (c.textContent||'').replace(/\\s+/g,' ').trim().slice(0,70) });
      if (d < 2) walk(c, d + 1);
    });
  };
  walk(main, 0);
  return JSON.stringify(out, null, 0);
})()`);
fs.writeFileSync(path.join(OUT, "floors.json"), res, "utf8");
const arr = JSON.parse(res);
console.log("区块数:", arr.length);
arr.filter(x => x.d <= 1).slice(0, 40).forEach(x => console.log(`d${x.d} h=${x.h} ${x.cls.slice(0,70)} | ${x.text.slice(0,40)}`));
ws.close(); process.exit(0);
