import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET = process.argv[2];
const W = Number(process.argv[3] || 375);
const PORT = 9466;
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Users/Admin/AppData/Local/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const UD = path.join(process.env.TEMP || '.', 'cdp-measure-' + Date.now());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + UD, '--no-first-run', '--disable-gpu', '--hide-scrollbars', '--window-size=' + W + ',900', 'about:blank'], { stdio: 'ignore' });
async function getJSON(p) { for (let i = 0; i < 60; i++) { try { return await (await fetch('http://127.0.0.1:' + PORT + p)).json(); } catch { await sleep(400); } } throw new Error('no devtools'); }
const ver = await getJSON('/json/version');
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pend = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const { resolve, reject } = pend.get(m.id); pend.delete(m.id); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result); } };
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const i = ++id; pend.set(i, { resolve, reject }); ws.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) })); setTimeout(() => { if (pend.has(i)) { pend.delete(i); reject(new Error('timeout ' + method)); } }, 60000); });

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (m, p) => send(m, p, sessionId);
await S('Page.enable');
await S('Runtime.enable');
await S('Emulation.setDeviceMetricsOverride', { width: W, height: 900, deviceScaleFactor: 2, mobile: true });
await S('Page.navigate', { url: TARGET });
await sleep(4000);

const res = await S('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const iw = window.innerWidth;
    const all = [...document.querySelectorAll('*')];
    const bad = all.filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > iw + 1 || r.right > iw + 1;
    }).slice(0, 25).map(el => ({
      tag: el.tagName.toLowerCase(),
      id: el.id || '',
      cls: String(el.className || '').slice(0, 70),
      w: Math.round(el.getBoundingClientRect().width),
      right: Math.round(el.getBoundingClientRect().right)
    }));
    return { iw, sw: document.documentElement.scrollWidth, bw: document.body.scrollWidth, bad };
  })()`
});
console.log(JSON.stringify(res.result.value, null, 1));
await S('Target.closeTarget', { targetId });
ws.close(); proc.kill();
process.exit(0);
