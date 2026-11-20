import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(__dirname, '..');
const IMGDIR = path.join(PROJ, 'site', 'bp', '3ds', 'img');
fs.mkdirSync(IMGDIR, { recursive: true });

const PORT = 9455;
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Users/Admin/AppData/Local/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const UD = path.join(process.env.TEMP || '.', 'cdp-badge-' + Date.now());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BADGES = [
  { file: '3d-secure-mastercard.png', w: 120, h: 32, bg: '#ffffff', ring: '#eb001b', text: 'ID Check', sub: 'Mastercard' },
  { file: '3d-secure-ae.png', w: 120, h: 32, bg: '#ffffff', ring: '#006fcf', text: 'SafeKey', sub: 'American Express' },
  { file: '3d-secure-jcb.png', w: 120, h: 32, bg: '#ffffff', ring: '#0e4c96', text: 'J/Secure', sub: 'JCB' },
  { file: '3d-secure-dir.png', w: 120, h: 32, bg: '#ffffff', ring: '#333333', text: '3D Secure', sub: 'Verified' },
];

function svg(b) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${b.w}" height="${b.h}" viewBox="0 0 ${b.w} ${b.h}">
  <rect x="0.5" y="0.5" width="${b.w - 1}" height="${b.h - 1}" rx="4" fill="${b.bg}" stroke="#dcdcdc"/>
  <circle cx="20" cy="${b.h / 2}" r="9" fill="none" stroke="${b.ring}" stroke-width="1.6"/>
  <path d="M15.6 ${b.h / 2 - 1.6} l3 3 5.4-6" fill="none" stroke="${b.ring}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="35" y="${b.h / 2 - 1}" font-family="Helvetica, Arial, sans-serif" font-size="10.5" font-weight="700" fill="#333333">${b.text}</text>
  <text x="35" y="${b.h / 2 + 9}" font-family="Helvetica, Arial, sans-serif" font-size="7.5" fill="#8c8c8c">${b.sub}</text>
</svg>`;
}

const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + UD, '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
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
await S('Emulation.setDeviceMetricsOverride', { width: 400, height: 300, deviceScaleFactor: 3, mobile: false });

for (const b of BADGES) {
  const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(b));
  await S('Page.navigate', { url: dataUrl });
  await sleep(600);
  const shot = await S('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: b.w, height: b.h, scale: 3 } });
  const out = path.join(IMGDIR, b.file);
  fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log('✓', b.file, fs.statSync(out).size + 'B');
}

await S('Target.closeTarget', { targetId });
ws.close(); proc.kill();
process.exit(0);
