/**
 * 真站抓取器：连 9222 的真实 Chrome，按 URL + 视口 + UA 打开页面，
 * 抽取结构化快照（文本/价格/按钮/图片/关键区块几何），存到 _ref/real/<name>.json
 *
 * 用法：node _tools/grab.mjs <url> <name> [mobile|desktop]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', '_ref', 'real');
fs.mkdirSync(OUT, { recursive: true });

const url = process.argv[2];
const name = process.argv[3] || 'page';
const mode = process.argv[4] || 'mobile';
const PORT = 9222;

const W = mode === 'mobile' ? 402 : 1440;
const H = mode === 'mobile' ? 874 : 900;
const UA_M = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const UA_D = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise((res, rej) => {
  const mid = ++id;
  pending.set(mid, (m) => (m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result)));
  ws.send(JSON.stringify({ id: mid, method, params }));
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = async (expr, awaitPromise = false) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise });
  return r.result && r.result.value;
};

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: W, height: H, deviceScaleFactor: mode === 'mobile' ? 2 : 1, mobile: mode === 'mobile',
  screenWidth: W, screenHeight: H,
});
await send('Emulation.setUserAgentOverride', {
  userAgent: mode === 'mobile' ? UA_M : UA_D,
  platform: mode === 'mobile' ? 'iPhone' : 'Win32',
  acceptLanguage: 'zh-TW,zh;q=0.9',
});

await send('Page.navigate', { url });
await sleep(6500);

const title = await ev('document.title');
if (/Access Denied/i.test(title || '')) { console.log('!! Access Denied'); process.exit(2); }

// 关掉可能的引导弹窗（APP 下载 / 廣告）
await ev(`(() => {
  const all = [...document.querySelectorAll('a,button,div,span')];
  for (const t of ['繼續使用網頁版','略過','關閉','稍後再說','我知道了']) {
    const el = all.find(e => (e.textContent||'').trim() === t);
    if (el) { el.click(); break; }
  }
})()`);
await sleep(1200);

const snap = await ev(`(() => {
  const vis = (el) => {
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  };
  const txt = (el) => (el.textContent || '').replace(/\\s+/g, ' ').trim();

  const prices = [...document.querySelectorAll('*')]
    .filter(el => el.children.length === 0 && /^\\$?[\\d,]+$/.test(txt(el).replace(/^\\$/, '$')) && /\\d/.test(txt(el)))
    .map(el => txt(el)).slice(0, 200);

  const buttons = [...document.querySelectorAll('a,button,[role="button"]')]
    .filter(vis).map(el => ({ t: txt(el).slice(0, 20), href: el.getAttribute('href') || '' }))
    .filter(x => x.t && x.t.length <= 20).slice(0, 150);

  const imgs = [...document.images].filter(vis).map(im => ({
    src: im.currentSrc || im.src, w: Math.round(im.getBoundingClientRect().width), h: Math.round(im.getBoundingClientRect().height),
  })).slice(0, 120);

  const blocks = [...document.querySelectorAll('body *')].filter(el => {
    const r = el.getBoundingClientRect(); return r.height > 24 && r.width > 200 && vis(el);
  }).slice(0, 80).map(el => ({
    tag: el.tagName, cls: (el.className || '').toString().slice(0, 80),
    x: Math.round(el.getBoundingClientRect().left), y: Math.round(el.getBoundingClientRect().top + scrollY),
    w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height),
    t: txt(el).slice(0, 60),
  }));

  return JSON.stringify({
    title: document.title, url: location.href,
    vw: innerWidth, vh: innerHeight, docH: document.documentElement.scrollHeight,
    prices, buttons, imgs, blocks,
    bodyText: txt(document.body).slice(0, 4000),
  });
})()`);

const data = JSON.parse(snap);
fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify(data, null, 1), 'utf8');
console.log(`[${name}] ${data.title}`);
console.log(`  价格 ${data.prices.length} 个 | 按钮 ${data.buttons.length} 个 | 图片 ${data.imgs.length} 张 | 区块 ${data.blocks.length} 个 | 高度 ${data.docH}`);
ws.close();
process.exit(0);
