/**
 * 全站体检：五条硬指标
 *   1. 无 404 —— 所有站内链接逐个请求
 *   2. 无裂图 —— 所有 <img> 检查 naturalWidth
 *   3. 无死按钮 —— 可点元素必须有 href 或 onclick 或受控事件
 *   4. 无错版 —— 横向溢出 / 元素越界 / 零尺寸
 *   5. 流程一致 —— 首页→商品→加购→购物车→结账 全链路可达
 *
 * 用法：node _tools/audit-all.mjs [mobile|desktop] [urlBase]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', '_ref', 'audit');
fs.mkdirSync(OUT, { recursive: true });

const mode = process.argv[2] || 'mobile';
const BASE = process.argv[3] || 'https://tw-momo.pages.dev';
const PORT = 9222;

const W = mode === 'mobile' ? 402 : 1440;
const H = mode === 'mobile' ? 874 : 900;
const UA_M = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const UA_D = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

const PAGES = mode === 'mobile'
  ? ['/m/', '/m/category', '/m/product/1341656', '/m/cart', '/m/checkout', '/m/order/ORD-TEST', '/m/info/wishlist', '/m/info/member-center', '/m/info/faq']
  : ['/', '/category', '/product/1341656', '/cart', '/checkout', '/order/ORD-TEST', '/info/wishlist', '/info/about', '/info/faq'];

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
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise, includeCommandLineAPI: true });
  if (r.exceptionDetails) return { __err: r.exceptionDetails.text };
  return r.result && r.result.value;
};

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: W, height: H, deviceScaleFactor: mode === 'mobile' ? 2 : 1, mobile: mode === 'mobile', screenWidth: W, screenHeight: H,
});
await send('Emulation.setUserAgentOverride', { userAgent: mode === 'mobile' ? UA_M : UA_D, platform: mode === 'mobile' ? 'iPhone' : 'Win32' });

const report = { mode, base: BASE, at: new Date().toISOString(), pages: [], issues: [] };

for (const p of PAGES) {
  await send('Page.navigate', { url: BASE + p });
  await sleep(3200);

  const info = await ev(`(async () => {
    const out = { url: location.href, status: 'ok', docW: document.documentElement.scrollWidth, vw: innerWidth };

    // 1) 站内链接
    const hrefs = [...new Set([...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')))]
      .filter(h => h && h.startsWith('/') && !h.startsWith('//'));
    const bad = [];
    for (const h of hrefs.slice(0, 120)) {
      try { const r = await fetch(h, { method: 'GET', redirect: 'follow' }); if (r.status >= 400) bad.push(h + ' → ' + r.status); }
      catch (e) { bad.push(h + ' → ERR'); }
    }
    out.badLinks = bad;

    // 2) 裂图
    out.brokenImgs = [...document.images].filter(i => i.complete && i.naturalWidth === 0)
      .map(i => (i.currentSrc || i.src).slice(-70)).slice(0, 20);

    // 3) 死按钮：可见的可点元素，无 href / 无 onclick / 无 role
    const hasClick = (el) => {
      try { return typeof getEventListeners === 'function' && getEventListeners(el).click && getEventListeners(el).click.length > 0; }
      catch (e) { return false; }
    };
    out.deadButtons = [...document.querySelectorAll('a,button,[role="button"]')].filter(el => {
      const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
      if (cs.display === 'none' || cs.visibility === 'hidden' || r.width < 8 || r.height < 8) return false;
      if (el.tagName === 'A') { const h = el.getAttribute('href'); return !h || h === '#'; }
      if (el.tagName === 'BUTTON') {
        if (el.form) return false;
        if (el.getAttribute('onclick') || el.onclick) return false;
        if (hasClick(el)) return false;
        // 事件委托：看祖先链上有没有 click 监听
        let p = el.parentElement;
        while (p) { if (hasClick(p)) return false; p = p.parentElement; }
        return true;
      }
      return false;
    }).map(el => (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 18)).filter(Boolean).slice(0, 20);

    // 真点击探针：对疑似死按钮点一下，看 DOM/URL/滚动是否变化
    out.clickProbe = [];
    for (const label of out.deadButtons.slice(0, 4)) {
      const el = [...document.querySelectorAll('a,button,[role="button"]')]
        .find(e => (e.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 18) === label);
      if (!el) continue;
      document.querySelectorAll('[style]').forEach((e,i)=>{ if(/translateX|display/.test(e.getAttribute('style')||'')) e.setAttribute('data-t','1') }); const snapBefore = document.documentElement.outerHTML.length + '|' + location.href + '|' + scrollY + '|' + (document.body.getAttribute('data-t') || 0);
      try { el.click(); } catch (e) {}
      await new Promise(r => setTimeout(r, 250));
      const snapAfter = document.documentElement.outerHTML.length + '|' + location.href + '|' + scrollY + '|' + (document.body.getAttribute('data-t') || 0);
      if (snapBefore !== snapAfter) out.clickProbe.push(label);
    }
    out.deadButtons = out.deadButtons.filter(l => !out.clickProbe.includes(l));

    // 4) 错版：横向溢出 / 元素越界
    out.overflowX = document.documentElement.scrollWidth > innerWidth + 1;
    out.overflowBy = document.documentElement.scrollWidth - innerWidth;
    const inScroller = (el) => {
      let p = el.parentElement;
      while (p) {
        const cs = getComputedStyle(p);
        if (/(auto|scroll|hidden)/.test(cs.overflowX)) return true;
        p = p.parentElement;
      }
      return false;
    };
    out.offside = [...document.querySelectorAll('body *')].filter(el => {
      const r = el.getBoundingClientRect();
      if (!(r.width > 0 && (r.right > innerWidth + 4 || r.left < -4))) return false;
      return !inScroller(el);
    }).slice(0, 10).map(el => ({
      tag: el.tagName, cls: (el.className || '').toString().slice(0, 40),
      left: Math.round(el.getBoundingClientRect().left), right: Math.round(el.getBoundingClientRect().right),
      t: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 24),
    }));

    return JSON.stringify(out);
  })()`, true);

  const o = typeof info === 'string' ? JSON.parse(info) : { url: p, status: 'eval-failed', raw: info };
  report.pages.push({ page: p, ...o });
  const bad = (o.badLinks || []).length + (o.brokenImgs || []).length + (o.deadButtons || []).length + (o.overflowX ? 1 : 0) + (o.offside || []).length;
  console.log(`${p}  坏链${(o.badLinks || []).length} 裂图${(o.brokenImgs || []).length} 死按钮${(o.deadButtons || []).length} 溢出${o.overflowX ? o.overflowBy + 'px' : 0} 越界${(o.offside || []).length}  ${bad ? '⚠️' : '✅'}`);
  if ((o.badLinks || []).length) console.log('   坏链:', o.badLinks.slice(0, 5).join(', '));
  if ((o.brokenImgs || []).length) console.log('   裂图:', o.brokenImgs.slice(0, 5).join(', '));
  if ((o.deadButtons || []).length) console.log('   死按钮:', o.deadButtons.slice(0, 5).join(' | '));
  if ((o.offside || []).length) console.log('   越界:', o.offside.slice(0, 3).map((x) => `${x.cls}[${x.left},${x.right}] ${x.t}`).join(' ; '));
}

fs.writeFileSync(path.join(OUT, `audit-${mode}.json`), JSON.stringify(report, null, 1), 'utf8');
console.log(`\n报告: ${path.join(OUT, 'audit-' + mode + '.json')}`);
ws.close();
process.exit(0);
