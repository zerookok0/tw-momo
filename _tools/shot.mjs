import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', '_ref', 'shots');
fs.mkdirSync(OUT, { recursive: true });

const TARGET = process.argv[2];
const NAME = process.argv[3] || 'shot';
const W = Number(process.argv[4] || 1440);
const PORT = 9444;

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Users/Admin/AppData/Local/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const UD = path.join(process.env.TEMP || '.', 'cdp-shot-' + Date.now());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + UD, '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--window-size=' + W + ',1000', '--lang=zh-TW', 'about:blank'], { stdio: 'ignore' });

async function getJSON(p) { for (let i = 0; i < 60; i++) { try { return await (await fetch('http://127.0.0.1:' + PORT + p)).json(); } catch { await sleep(400); } } throw new Error('no devtools'); }
const ver = await getJSON('/json/version');
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pend = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const { resolve, reject } = pend.get(m.id); pend.delete(m.id); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result); } };
const send = (method, params = {}) => new Promise((resolve, reject) => { const i = ++id; pend.set(i, { resolve, reject }); ws.send(JSON.stringify({ id: i, method, params })); setTimeout(() => { if (pend.has(i)) { pend.delete(i); reject(new Error('timeout ' + method)); } }, 120000); });

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (m, p) => new Promise((resolve, reject) => { const i = ++id; pend.set(i, { resolve, reject }); ws.send(JSON.stringify({ id: i, method: m, params: p, sessionId })); setTimeout(() => { if (pend.has(i)) { pend.delete(i); reject(new Error('timeout ' + m)); } }, 120000); });

await S('Page.enable');
await S('Runtime.enable');
await S('Emulation.setDeviceMetricsOverride', { width: W, height: 1000, deviceScaleFactor: 1, mobile: false });
await S('Page.navigate', { url: TARGET });
await sleep(5000);
for (let i = 0; i < 14; i++) { await S('Runtime.evaluate', { expression: 'window.scrollBy(0,1100)' }); await sleep(350); }
await S('Runtime.evaluate', { expression: 'window.scrollTo(0,0)' });
await sleep(1500);

const errs = await S('Runtime.evaluate', { expression: 'JSON.stringify(window.__errs||[])' });
const m = await S('Page.getLayoutMetrics');
const cs = m.cssContentSize;
console.log('content', cs.width, cs.height);
const sliceH = 2000;
const files = [];
for (let y = 0; y < Math.min(cs.height, 12000); y += sliceH) {
  const h = Math.min(sliceH, cs.height - y);
  const shot = await S('Page.captureScreenshot', { format: 'png', clip: { x: 0, y, width: cs.width, height: h, scale: 1 }, captureBeyondViewport: true });
  const f = path.join(OUT, `${NAME}_${String(y).padStart(5, '0')}.png`);
  fs.writeFileSync(f, Buffer.from(shot.data, 'base64'));
  files.push(f);
}
console.log(files.join('\n'));
await S('Target.closeTarget', { targetId });
ws.close(); proc.kill();
process.exit(0);
