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
await ev(`(() => { const sc=[...document.querySelectorAll('div')].find(d=>/mu-overflow-y-auto/.test(d.className||'')); sc.scrollTop=0; })()`);

const out = await ev(`(() => {
  const r = (el) => { if(!el) return null; const b = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { w: Math.round(b.width), h: Math.round(b.height), fs: cs.fontSize, fw: cs.fontWeight, color: cs.color,
             bg: cs.backgroundColor, bgImg: cs.backgroundImage.slice(0,60), pad: cs.padding, rad: cs.borderRadius,
             gap: cs.gap, cols: cs.gridTemplateColumns, lh: cs.lineHeight, pos: cs.position }; };
  const byText = (t, tag) => [...document.querySelectorAll(tag || '*')].find(e => (e.textContent||'').trim() === t);
  const sc = [...document.querySelectorAll('div')].find(d => /mu-overflow-y-auto/.test(d.className||''));
  const header = sc.querySelector('header') || sc.children[0];
  const nav = [...sc.querySelectorAll('nav')][0];
  const navA = nav ? [...nav.querySelectorAll('a')].slice(0,6).map(a => ({ t: a.textContent.trim().slice(0,8), fs: getComputedStyle(a).fontSize, fw: getComputedStyle(a).fontWeight, color: getComputedStyle(a).color, h: Math.round(a.getBoundingClientRect().height) })) : [];
  const title = byText('你的精選好物榜');
  const tab = [...sc.querySelectorAll('nav')].pop();
  const tabA = tab ? [...tab.querySelectorAll('a')].slice(0,6).map(a => ({ t: a.textContent.trim().slice(0,6), fs: getComputedStyle(a).fontSize, color: getComputedStyle(a).color })) : [];
  return JSON.stringify({
    header: r(header), nav: r(nav), navA,
    seckillRow: r(byText('領券')?.parentElement?.parentElement?.parentElement),
    tabbar: r(tab), tabA,
    titleRank: r(title),
    scrollW: sc.clientWidth,
  }, null, 1);
})()`);
fs.writeFileSync(path.join(OUT, "styles-key.json"), out, "utf8");
console.log(out);
ws.close(); process.exit(0);
