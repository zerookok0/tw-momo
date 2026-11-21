/**
 * 全站自检：链接能否点开、图片是否缺失
 *
 * 检查范围（默认打线上 BASE）：
 *   - 首页、24 个 /info 页、购物车/结账/订单/会员
 *   - 全部 /category 分页（691 页）
 *   - 随机抽 600 个商品页
 *
 * 对抓到的每个页面：
 *   - 收集同源 <a href>，逐个 HEAD 检查状态
 *   - 收集 <img src>/srcset/内联背景图，逐个检查
 * 输出：坏链清单、缺图清单、统计汇总
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(__dirname, '..');
const BASE = process.env.BASE || 'https://tw-momo.pages.dev';
const OUT = path.join(PROJ, '_ref', 'audit');
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pool(items, n, worker) {
  let i = 0;
  const out = new Array(items.length);
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await worker(items[idx], idx);
    }
  }));
  return out;
}

async function getText(url, tries = 3) {
  for (let t = 0; t < tries; t++) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 30000);
      const r = await fetch(url, { headers: { 'user-agent': 'momo-audit/1.0' }, signal: ctl.signal, redirect: 'follow' });
      clearTimeout(timer);
      const text = await r.text();
      return { status: r.status, text, url: r.url };
    } catch (e) {
      if (t === tries - 1) return { status: 0, text: '', error: String(e && e.message) };
      await sleep(600 * (t + 1));
    }
  }
}

async function head(url) {
  for (let t = 0; t < 2; t++) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 20000);
      const r = await fetch(url, { method: 'GET', headers: { 'user-agent': 'momo-audit/1.0' }, signal: ctl.signal });
      clearTimeout(timer);
      const len = Number(r.headers.get('content-length') || 0);
      // 取消读取 body，只取头
      try { r.body && r.body.cancel(); } catch {}
      return { status: r.status, len, type: r.headers.get('content-type') || '' };
    } catch (e) {
      if (t === 1) return { status: 0, len: 0, error: String(e && e.message) };
      await sleep(400);
    }
  }
}

// ── 1. 页面清单 ──
const pages = ['/', '/cart', '/checkout', '/order/ORD-AUDIT', '/m', '/m/cart', '/m/checkout'];

const infoDir = path.join(PROJ, 'site', 'info');
if (fs.existsSync(infoDir)) {
  for (const f of fs.readdirSync(infoDir).filter((x) => x.endsWith('.html'))) {
    pages.push('/info/' + f.replace(/\.html$/, ''));
  }
}

const cat = JSON.parse(fs.readFileSync(path.join(PROJ, 'site', 'data', 'catalog.json'), 'utf8'));
const totalCat = Math.ceil(cat.count / 48);
for (let p = 1; p <= totalCat; p++) pages.push('/category?page=' + p);

// 随机抽 600 个商品
const shuffled = cat.items.slice().sort(() => Math.random() - 0.5).slice(0, 600);
for (const it of shuffled) pages.push('/product/' + it.code);

console.log(`待检查页面: ${pages.length}（含 ${totalCat} 个分类页 + 600 个商品页）`);

// ── 2. 抓页面并收集链接/图片 ──
const linkRefs = new Map();   // url -> Set(来源页)
const imgRefs = new Map();
const pageErrors = [];

let done = 0;
await pool(pages, 10, async (p) => {
  const url = BASE + p;
  const r = await getText(url);
  done++;
  if (done % 100 === 0) process.stdout.write(`\r  抓取 ${done}/${pages.length}`);
  if (r.status !== 200) { pageErrors.push({ page: p, status: r.status, error: r.error }); return; }

  const html = r.text;
  const add = (map, u, from) => {
    if (!u) return;
    if (!map.has(u)) map.set(u, new Set());
    map.get(u).add(from);
  };

  for (const m of html.matchAll(/<a\b[^>]*href="([^"]+)"/gi)) {
    const h = m[1];
    if (/^(mailto:|tel:|javascript:|#)/i.test(h)) continue;
    if (h.startsWith('//')) continue;
    if (h.startsWith('http') && !h.startsWith(BASE)) { add(linkRefs, h, p); continue; }
    let rel = h.startsWith(BASE) ? h.slice(BASE.length) : h;
    if (!rel.startsWith('/')) rel = '/' + rel;
    add(linkRefs, rel, p);
  }

  for (const m of html.matchAll(/<img\b[^>]*src="([^"]+)"/gi)) add(imgRefs, m[1], p);
  for (const m of html.matchAll(/<img\b[^>]*data-src="([^"]+)"/gi)) add(imgRefs, m[1], p);
  for (const m of html.matchAll(/url\((['"]?)([^'")]+)\1\)/gi)) {
    const u = m[2];
    if (/^data:/i.test(u)) continue;
    add(imgRefs, u, p);
  }
});
process.stdout.write('\n');

console.log(`收集到链接 ${linkRefs.size} 个、图片 ${imgRefs.size} 个`);

// ── 3. 检查链接 ──
const linkList = [...linkRefs.keys()].filter((u) => !/^https?:\/\//.test(u) || u.startsWith(BASE));
const deadLinks = [];
await pool(linkList, 16, async (u) => {
  const url = u.startsWith('http') ? u : BASE + u;
  const r = await head(url);
  if (r.status !== 200) deadLinks.push({ url: u, status: r.status, from: [...linkRefs.get(u)].slice(0, 3) });
});

// 外链只检查域名是否可达（不跟跳转）
const extLinks = [...linkRefs.keys()].filter((u) => /^https?:\/\//.test(u) && !u.startsWith(BASE));
const deadExt = [];
await pool(extLinks.slice(0, 60), 6, async (u) => {
  const r = await head(u);
  if (r.status === 0) deadExt.push({ url: u, status: 'unreachable', from: [...linkRefs.get(u)].slice(0, 2) });
});

// ── 4. 检查图片 ──
const brokenImgs = [];
await pool([...imgRefs.keys()], 16, async (u) => {
  const url = u.startsWith('http') ? u : BASE + u;
  const r = await head(url);
  const bad = r.status !== 200 || r.len === 0;
  if (bad) brokenImgs.push({ url: u.slice(0, 120), status: r.status, len: r.len, from: [...imgRefs.get(u)].slice(0, 2) });
});

// ── 5. 报告 ──
const report = {
  base: BASE,
  at: new Date().toISOString(),
  pages: { total: pages.length, failed: pageErrors.length, errors: pageErrors.slice(0, 20) },
  links: { total: linkList.length, dead: deadLinks.length, list: deadLinks.slice(0, 200) },
  external: { checked: Math.min(extLinks.length, 60), unreachable: deadExt.length, list: deadExt },
  images: { total: imgRefs.size, broken: brokenImgs.length, list: brokenImgs.slice(0, 200) },
};
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1), 'utf8');

console.log('\n──────── 自检结果 ────────');
console.log(`页面      : ${pages.length} 个，失败 ${pageErrors.length}`);
console.log(`内部链接  : ${linkList.length} 个，坏链 ${deadLinks.length}`);
console.log(`外部链接  : 抽查 ${Math.min(extLinks.length, 60)} 个，不可达 ${deadExt.length}`);
console.log(`图片      : ${imgRefs.size} 个，缺失 ${brokenImgs.length}`);
if (deadLinks.length) {
  console.log('\n坏链前 15 条:');
  deadLinks.slice(0, 15).forEach((d) => console.log(`  ${d.status}  ${d.url}   ← ${d.from[0]}`));
}
if (brokenImgs.length) {
  console.log('\n缺图前 15 条:');
  brokenImgs.slice(0, 15).forEach((d) => console.log(`  ${d.status} len=${d.len}  ${d.url}   ← ${d.from[0]}`));
}
if (pageErrors.length) {
  console.log('\n页面失败前 10 条:');
  pageErrors.slice(0, 10).forEach((d) => console.log(`  ${d.status}  ${d.page}  ${d.error || ''}`));
}
console.log(`\n完整报告: ${path.join(OUT, 'report.json')}`);
