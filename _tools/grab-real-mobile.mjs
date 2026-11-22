/**
 * 从用户已打开的真实 Chrome（9222）抓取 momo 手机版页面
 *
 * 输出到 _ref/real-mobile/：
 *   page.html      完整 DOM
 *   sections.json  每个顶层区块的 class / 位置 / 尺寸 / 文本
 *   styles.json    关键元素的计算样式
 *   shot-full.png  整页截图
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', '_ref', 'real-mobile');
fs.mkdirSync(OUT, { recursive: true });

const PORT = 9222;
const W = 402, H = 874;

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find((t) => t.type === 'page');
if (!page) throw new Error('没有找到页面');

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
const evalJS = async (expr, awaitPromise = false) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise });
  return r.result && r.result.value;
};

await send('Page.enable');
await send('Runtime.enable');

// 1) 切手机视口 + iPhone UA
await send('Emulation.setDeviceMetricsOverride', {
  width: W, height: H, deviceScaleFactor: 2, mobile: true, screenWidth: W, screenHeight: H,
});
await send('Emulation.setUserAgentOverride', {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  platform: 'iPhone',
  acceptLanguage: 'zh-TW,zh;q=0.9',
});
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

// 2) 打开手机版首页
await send('Page.navigate', { url: 'https://m.momoshop.com.tw/main.momo' });
await sleep(6000);

const title = await evalJS('document.title');
const url = await evalJS('location.href');
console.log('页面:', title);
console.log('URL :', url);

if (/Access Denied/i.test(title || '')) {
  console.log('!! 仍是 Access Denied，代理可能未生效');
  process.exit(2);
}

// 3) 等图片
await evalJS(`Promise.all([...document.images].slice(0,120).map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));`, true);
await sleep(1500);

// 4) 存 DOM
const html = await evalJS('document.documentElement.outerHTML');
fs.writeFileSync(path.join(OUT, 'page.html'), html, 'utf8');
console.log('DOM 长度:', html.length);

// 5) 顶层区块结构
const sections = await evalJS(`(() => {
  const out = [];
  const walk = (el, depth) => {
    if (depth > 3) return;
    for (const c of el.children) {
      const r = c.getBoundingClientRect();
      if (r.height < 30) continue;
      out.push({
        depth,
        tag: c.tagName,
        id: c.id || '',
        cls: (c.className || '').toString().slice(0, 120),
        top: Math.round(r.top + scrollY),
        h: Math.round(r.height),
        w: Math.round(r.width),
        text: (c.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 80),
      });
      if (depth < 2) walk(c, depth + 1);
    }
  };
  walk(document.body, 0);
  return JSON.stringify(out, null, 1);
})()`);
fs.writeFileSync(path.join(OUT, 'sections.json'), sections, 'utf8');

// 6) 关键元素计算样式
const styles = await evalJS(`(() => {
  const pick = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      cls: (el.className || '').toString().slice(0, 100),
      w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top + scrollY),
      fontSize: cs.fontSize, fontWeight: cs.fontWeight, color: cs.color,
      background: cs.backgroundColor, padding: cs.padding, margin: cs.margin,
      borderRadius: cs.borderRadius, lineHeight: cs.lineHeight,
      display: cs.display, gridTemplateColumns: cs.gridTemplateColumns,
      gap: cs.gap, letterSpacing: cs.letterSpacing,
    };
  };
  const q = (s) => document.querySelector(s);
 const body = pick(document.body);
  const header = pick(q('header'));
  const search = pick(q('input[type="search"], input[placeholder]'));
  const navItems = [...document.querySelectorAll('nav a, [class*="nav"] a')].slice(0, 8).map(a => ({
    t: (a.textContent || '').trim().slice(0, 12),
    cls: (a.className || '').toString().slice(0, 60),
    fontSize: getComputedStyle(a).fontSize,
    color: getComputedStyle(a).color,
  }));
  return JSON.stringify({
    title: document.title,
    vw: innerWidth, vh: innerHeight, docH: document.documentElement.scrollHeight,
    body, header, search, navItems,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    fontFamily: getComputedStyle(document.body).fontFamily,
  }, null, 1);
})()`);
fs.writeFileSync(path.join(OUT, 'styles.json'), styles, 'utf8');

// 7) 整页截图
const m = await send('Page.getLayoutMetrics');
const fullH = Math.min(Math.round(m.cssContentSize.height), 12000);
const shot = await send('Page.captureScreenshot', {
  format: 'png', captureBeyondViewport: true,
  clip: { x: 0, y: 0, width: W, height: fullH, scale: 2 },
});
fs.writeFileSync(path.join(OUT, 'shot-full.png'), Buffer.from(shot.data, 'base64'));

console.log('整页高度:', fullH);
console.log('输出目录:', OUT);

ws.close();
process.exit(0);
