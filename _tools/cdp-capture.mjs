import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(__dirname, '..');
const CAP = path.join(PROJ, '_ref', 'cap');
const ASSETS = path.join(CAP, 'net');
fs.mkdirSync(ASSETS, { recursive: true });

const TARGET = process.argv[2] || 'https://web.archive.org/web/20251020051707/https://www.momoshop.com.tw/main/Main.jsp';
const NAME = process.argv[3] || 'home';
const VW = Number(process.argv[4] || 1440);
const IS_MOBILE = String(process.argv[5] || '') === 'mobile';
const PORT = 9333;

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Users/Admin/AppData/Local/Google/Chrome/Application/chrome.exe',
].find((p) => fs.existsSync(p));
if (!CHROME) { console.error('chrome not found'); process.exit(1); }

const UD = path.join(process.env.TEMP || CAP, 'cdp-profile-' + Date.now());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function stripWayback(u) {
  const m = u.match(/^https?:\/\/web\.archive\.org\/web\/\d+(?:id_|im_|if_|cs_|js_)?\/(.+)$/);
  return m ? m[1].replace(/^\/?/, '') : null;
}

function urlToRel(u) {
  let s = stripWayback(u) || u;
  s = s.replace(/^https?:\/\//, '');
  s = s.split('#')[0];
  s = s.replace(/[?&]/g, '_').replace(/[<>:"|*\\]/g, '_');
  if (s.length > 180) s = s.slice(0, 120) + '_' + Buffer.from(u).toString('hex').slice(0, 40);
  return s;
}

const proc = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=' + PORT,
  '--user-data-dir=' + UD,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--disable-gpu', '--hide-scrollbars', '--mute-audio',
  '--window-size=' + VW + ',1000',
  '--lang=zh-TW',
  'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });
proc.stderr.on('data', () => {});

async function getJSON(p) {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch('http://127.0.0.1:' + PORT + p);
      return await r.json();
    } catch { await sleep(500); }
  }
  throw new Error('chrome devtools not up');
}

const ver = await getJSON('/json/version');
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let msgId = 0;
const pending = new Map();
const responses = [];
const bodies = new Map();

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
    return;
  }
  if (msg.method === 'Network.responseReceived') {
    const r = msg.params.response;
    responses.push({ id: msg.params.requestId, url: r.url, status: r.status, mime: r.mimeType, type: msg.params.type, fromCache: r.fromDiskCache });
  }
};

function send(method, params = {}, sessionId) {
  const id = ++msgId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('timeout ' + method)); } }, 120000);
  });
}

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (m, p) => send(m, p, sessionId);

await S('Page.enable');
await S('Network.enable', { maxTotalBufferSize: 800 * 1024 * 1024, maxResourceBufferSize: 100 * 1024 * 1024 });
await S('Runtime.enable');
await S('Emulation.setDeviceMetricsOverride', { width: VW, height: 844, deviceScaleFactor: IS_MOBILE ? 3 : 1, mobile: IS_MOBILE });

console.log('navigating', TARGET);
await S('Page.navigate', { url: TARGET });
await sleep(12000);

// lazy-load scroll
for (let i = 0; i < 12; i++) {
  await S('Runtime.evaluate', { expression: 'window.scrollBy(0, 1100);', awaitPromise: false });
  await sleep(700);
}
await S('Runtime.evaluate', { expression: 'window.scrollTo(0,0);' });
await sleep(2500);

const dom = await S('Runtime.evaluate', { expression: 'document.documentElement.outerHTML', returnByValue: true });
fs.writeFileSync(path.join(CAP, NAME + '_dom.html'), dom.result.value, 'utf8');
console.log('dom saved', dom.result.value.length);

const metrics = await S('Page.getLayoutMetrics');
const cs = metrics.cssContentSize;
console.log('content size', cs.width, cs.height);

// full page screenshot in slices
const sliceH = 2000;
const shots = [];
for (let y = 0; y < cs.height; y += sliceH) {
  const h = Math.min(sliceH, cs.height - y);
  const shot = await S('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 0, y, width: cs.width, height: h, scale: 1 },
    captureBeyondViewport: true,
  });
  const f = path.join(CAP, `${NAME}_slice_${String(y).padStart(5, '0')}.png`);
  fs.writeFileSync(f, Buffer.from(shot.data, 'base64'));
  shots.push(f);
}
console.log('shots', shots.length);

// save network bodies
const skip = new Set(['Document', 'Preflight', 'Ping', 'Other', 'Manifest', 'TextTrack', 'Media', 'Eventsource', 'WebSocket']);
const targets = responses.filter((r) => !skip.has(r.type));
console.log('body targets', targets.length);
const map = {};
let saved = 0, failed = 0;
for (const r of targets) {
  try {
    const body = await S('Network.getResponseBody', { requestId: r.id });
    const buf = body.base64Encoded ? Buffer.from(body.body, 'base64') : Buffer.from(body.body, 'utf8');
    const rel = urlToRel(r.url);
    const abs = path.join(ASSETS, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, buf);
    map[r.url] = 'net/' + rel.split(path.sep).join('/');
    saved++;
  } catch (e) {
    failed++;
  }
}
fs.writeFileSync(path.join(CAP, NAME + '_assetmap.json'), JSON.stringify(map, null, 2), 'utf8');
console.log('assets saved', saved, 'failed', failed);

await S('Target.closeTarget', { targetId });
ws.close();
proc.kill();
process.exit(0);
