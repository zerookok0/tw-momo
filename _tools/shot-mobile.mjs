/**
 * 真机尺寸截图（CDP Emulation.setDeviceMetricsOverride）
 *
 * 用法：node _tools/shot-mobile.mjs <url> <name>
 * 固定 402×874 DPR3 mobile（用户模拟器同款），并等待图片与字体加载完。
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', '_ref', 'shots');
fs.mkdirSync(OUT, { recursive: true });

const TARGET = process.argv[2];
const NAME = process.argv[3] || 'mobile';
const W = Number(process.argv[4] || 402);
const H = Number(process.argv[5] || 874);
const PORT = 9466;

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Users/Admin/AppData/Local/Google/Chrome/Application/chrome.exe',
].find((p) => fs.existsSync(p));

const UD = path.join(process.env.TEMP || '.', 'cdp-m-' + Date.now());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const proc = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + UD,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--hide-scrollbars', '--mute-audio', '--lang=zh-TW', 'about:blank',
], { stdio: 'ignore' });

async function getJSON(p) {
  for (let i = 0; i < 60; i++) {
    try { return await (await fetch('http://127.0.0.1:' + PORT + p)).json(); } catch { await sleep(400); }
  }
  throw new Error('devtools not ready');
}

const ver = await getJSON('/json/version');
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
function send(method, params = {}, extra = {}) {
  const mid = ++id;
  return new Promise((res, rej) => {
    pending.set(mid, (m) => (m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result)));
    ws.send(JSON.stringify({ id: mid, method, params, ...extra }));
  });
}

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (method, params) => send(method, params, { sessionId });

await S('Page.enable');
await S('Runtime.enable');
await S('Emulation.setDeviceMetricsOverride', {
  width: W, height: H, deviceScaleFactor: 3, mobile: true,
  screenWidth: W, screenHeight: H,
});
await S('Emulation.setUserAgentOverride', {
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  platform: 'iPhone',
  acceptLanguage: 'zh-TW',
});
await S('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

await S('Page.navigate', { url: TARGET });
await sleep(4500);

// 等图片解码完成
await S('Runtime.evaluate', {
  expression: `Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })))`,
  awaitPromise: true,
});

const vp = await S('Page.getLayoutMetrics');
const full = vp.cssContentSize || vp.contentSize;

const shot = await S('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: true,
  clip: { x: 0, y: 0, width: W, height: Math.min(full.height, 6000), scale: 1 },
});
const file = path.join(OUT, NAME + '.png');
fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));

// 顺便输出关键几何，便于判断排版
const diag = await S('Runtime.evaluate', {
  expression: `(() => {
    const q = (s) => document.querySelector(s);
    const box = (el) => el ? { w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) } : null;
    return JSON.stringify({
      vw: innerWidth, vh: innerHeight, docW: document.documentElement.scrollWidth,
      overflowX: document.documentElement.scrollWidth > innerWidth,
      promoBox: box(q('#promoBox')),
      promoMask: box(q('#promoMask')),
      header: box(q('.m-header')),
      nav: box(q('.m-nav')),
      duo: box(q('.m-duo')),
      limit: box(q('.m-limit')),
      icoRow: box(q('.m-ico-row')),
      tabbar: box(q('.m-tabbar')),
      card: box(q('.m-card')),
      cardsPerRow: (() => {
        const c = [...document.querySelectorAll('.m-card')];
        if (c.length < 2) return c.length;
        const y = c[0].getBoundingClientRect().top;
        return c.filter(x => Math.abs(x.getBoundingClientRect().top - y) < 2).length;
      })(),
    });
  })()`,
  returnByValue: true,
});

console.log('截图:', file);
console.log('尺寸:', W + 'x' + H, ' 文档高:', Math.round(full.height));
console.log('诊断:', diag.result.value);

ws.close();
proc.kill();
process.exit(0);
