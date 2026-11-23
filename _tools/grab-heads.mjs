/**
 * 版面结构对照：抽取两边的区块标题序列（h1-h3、明显的小标题），按顺序比对
 * 这比「按钮数量」可靠得多——元素数量受懒加载影响，标题序列不受
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', '_ref', 'heads');
fs.mkdirSync(OUT, { recursive: true });

const url = process.argv[2];
const name = process.argv[3] || 'page';
const mode = process.argv[4] || 'mobile';
const PORT = 9222;

const W = mode === 'mobile' ? 402 : 1440;
const H = mode === 'mobile' ? 874 : 900;
const UA_M = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const UA_D = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

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
const ev = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true }); return r.result && r.result.value; };

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: mode === 'mobile', screenWidth: W, screenHeight: H });
await send('Emulation.setUserAgentOverride', { userAgent: mode === 'mobile' ? UA_M : UA_D, platform: mode === 'mobile' ? 'iPhone' : 'Win32' });
await send('Page.navigate', { url });
await sleep(7000);

// 关掉引导弹窗
await ev(`(() => { const all=[...document.querySelectorAll('button,div,span,a')]; for (const t of ['繼續使用網頁版','略過','關閉','稍後再說']) { const el=all.find(e=>(e.textContent||'').trim()===t); if(el){el.click();return;} } })()`);
await sleep(1200);

// 滚动一遍触发懒加载
await ev(`(async () => { const sc=[...document.querySelectorAll('div')].find(d=>/overflow-y-auto|mu-overflow-y-auto/.test(d.className||'')); for (let y=0;y<8000;y+=600){ if(sc) sc.scrollTop=y; else window.scrollTo(0,y); await new Promise(r=>setTimeout(r,60)); } })()`, true);
await sleep(1500);

const heads = await ev(`(() => {
  const out = [];
  const seen = new Set();
  document.querySelectorAll('h1,h2,h3,b,strong,span,div,p,a').forEach((el) => {
    if (el.children.length > 3) return;
    const t = (el.textContent || '').replace(/\\s+/g, '').trim();
    if (!t || t.length < 2 || t.length > 24) return;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width < 20 || cs.display === 'none' || cs.visibility === 'hidden') return;
    const fsz = parseFloat(cs.fontSize);
    const bold = Number(cs.fontWeight) >= 600;
    if (!(bold || fsz >= 15)) return;
    if (seen.has(t)) return;
    seen.add(t);
    out.push(t);
  });
  return JSON.stringify(out.slice(0, 120));
})()`);

const arr = JSON.parse(heads);
fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify(arr, null, 1), 'utf8');
console.log(`[${name}] 区块标题 ${arr.length} 个`);
console.log(arr.join(' | ').slice(0, 800));
ws.close();
process.exit(0);
