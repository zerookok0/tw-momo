/**
 * Cloudflare Pages 部署准备
 * 把 site/ 复制到 dist/，并写入 Pages 专用的 _headers 与 _routes.json
 *
 * 为什么需要复制：
 *   - Pages 的「输出目录」必须是纯静态产物，site/ 里还有 _partials（内部模板）
 *   - _headers / _routes.json 必须位于输出目录根部
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(__dirname, '..');
const SRC = path.join(PROJ, 'site');
const OUT = path.join(PROJ, 'dist');

const PANEL_DOMAIN = process.env.PANEL_DOMAIN || (() => {
  // 从 /bp/config.json 的 panel_host 推导（wss://host → host），避免两处配置漂移
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(SRC, 'bp', 'config.json'), 'utf8'));
    return String(cfg.panel_host || '').replace(/^wss?:\/\//, '').replace(/\/.*$/, '') || 'panel.local';
  } catch {
    return 'panel.local';
  }
})();

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(from, to, skip = new Set()) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (skip.has(e.name)) continue;
    const s = path.join(from, e.name);
    const d = path.join(to, e.name);
    if (e.isDirectory()) copyDir(s, d, skip);
    else fs.copyFileSync(s, d);
  }
}

console.log('准备 Cloudflare Pages 产物…');
rmrf(OUT);
copyDir(SRC, OUT, new Set(['_partials']));

// ── _headers：契约 §7.1 方案 A ──
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: https://www.facebook.com",
  "font-src 'self' data: https:",
  `connect-src 'self' https://${PANEL_DOMAIN} wss://${PANEL_DOMAIN} https://connect.facebook.net https://www.facebook.com`,
  // 🔴 契约 §7.1：验证屏是面板托管的独立页面（https://面板/checkout/3ds/<hash>/index.html），
  //    不是 srcdoc。frame-src 只写 'self' 会直接白屏。
  `frame-src 'self' https://${PANEL_DOMAIN}`,
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

fs.writeFileSync(
  path.join(OUT, '_headers'),
  `/*
  Content-Security-Policy: ${CSP}
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: payment=(self), clipboard-write=(self)

/bp/*
  Cache-Control: no-store

/data/catalog.json
  Cache-Control: public, max-age=300
`,
  'utf8'
);

// ── _routes.json：显式白名单 ──
// 试过 include:['/*'] + exclude 静态目录，结果 Functions 全部不生效
// （/api/cart 直接回落成首页 HTML）。Pages 对全通配的 include 有额外限制，
// 所以仍然按「逐条列出动态路由」的方式配置。
const routes = {
  version: 1,
  include: [
    '/checkout', '/checkout/',
    '/cart', '/cart/',
    '/m/checkout', '/m/checkout/',
    '/m/cart', '/m/cart/',
    '/info/*',
    '/member', '/member/*',
    '/order/*', '/m/order/*',
    '/api/*',
    '/product/*',
    '/goods/GoodsDetail.jsp',
    '/category', '/category/*',
    '/m/product/*',
    '/m/goods.momo',
    '/m/category', '/m/category/*',
  ],
  exclude: [],
};
// 暂时不写 _routes.json：诊断发现写了之后 Functions 反而不生效。
// Pages 默认行为就是「非静态资源请求交给 Functions」，先回归默认。
try { fs.unlinkSync(path.join(OUT, '_routes.json')); } catch {}

// ── 链接规范化 ──
// Pages 对「存在同名静态目录」的路径会 308 → 带斜杠版本（/m → /m/、/checkout → /checkout/）。
// 站内链接直接写成带斜杠的形式，用户点击时少一跳，也不会在浏览器地址栏出现重定向。
const SLASH_FIX = [
  [/(?<=href=")\/m(?=")/g, '/m/'],
  [/(?<=href=")\/checkout(?=")/g, '/checkout/'],
  [/(?<=href=")\/cart(?=")/g, '/cart/'],
];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!e.name.endsWith('.html')) continue;
    let html = fs.readFileSync(p, 'utf8');
    const before = html;
    for (const [re, to] of SLASH_FIX) html = html.replace(re, to);
    if (html !== before) fs.writeFileSync(p, html, 'utf8');
  }
})(OUT);
console.log('  链接规范 : 目录页链接统一带斜杠');

// ── _redirects：Functions 不可用时的静态兜底 ──
// Pages 的 200 重写：每条请求都原地返回目标文件，地址栏不变。
// 商品页 / 分类页 / 订单页 全部交给静态页 + 浏览器端渲染。
const REDIRECTS = [
  '/product/*    /app-product.html   200',
  '/m/product/*  /app-product.html   200',
  '/goods/GoodsDetail.jsp  /app-product.html  200',
  '/category      /category/index.html  200',
  '/category/     /category/index.html  200',
  '/m/category    /m/category/index.html  200',
  '/m/category/   /m/category/index.html  200',
  '/order/*      /order/index.html   200',
  '/m/order/*    /m/order/index.html   200',
].join('\n');
fs.writeFileSync(path.join(OUT, '_redirects'), REDIRECTS + '\n', 'utf8');
console.log('  重写规则 : dist/_redirects 已写入');

// ── api/cart 静态兜底 ──
// Pages Functions 偶发整体不生效（/api/* 回落到 index.html），
// 这时结账页金额会变 $0。这里放一份静态 JSON 兜底：
//  - Functions 正常时：_routes.json 的 /api/* 让 Function 优先，静态文件不会被用到
//  - Functions 挂了时：Pages 直接把这份 JSON 当静态资源返回，页面金额仍然正确
const FALLBACK_CART = {
  order_number: 'ORD-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-DEMO01',
  currency: 'TWD',
  total: 594,
  total_amount: '$594',
  items: [
    { name: '【Kingston 金士頓】8GB DDR5 5600MT/s Non-ECC 記憶體', qty: 1, price: 414, img: '/assets/i4.momoshop.com.tw/1754298127/goodsimg/0014/295/303/14295303_OL_m.webp' },
    { name: '【威拂】魔撢本體 1把+1片裝(藍色/粉色 隨機出貨)', qty: 1, price: 30, img: '/assets/i2.momoshop.com.tw/1698915746/goodsimg/0008/593/194/8593194_OL_m.webp' },
    { name: '【SONAX】鍍膜美容巾(細緻柔軟.極具吸收力)', qty: 1, price: 150, img: '/assets/i3.momoshop.com.tw/1759350466/goodsimg/0007/053/569/7053569_OL_m.webp' },
  ],
  locale: 'zh-TW',
  fallback: true,
};
const apiDir = path.join(OUT, 'api');
fs.mkdirSync(apiDir, { recursive: true });
fs.writeFileSync(path.join(apiDir, 'cart'), JSON.stringify(FALLBACK_CART), 'utf8');
console.log('  api 兜底 : dist/api/cart 已写入');

// ── 统计 ──
let files = 0;
let bytes = 0;
(function walk(p) {
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const f = path.join(p, e.name);
    if (e.isDirectory()) walk(f);
    else { files++; bytes += fs.statSync(f).size; }
  }
})(OUT);

console.log(`  输出目录 : dist/`);
console.log(`  文件数   : ${files}`);
console.log(`  体积     : ${(bytes / 1024 / 1024).toFixed(1)} MB`);
console.log(`  _headers : CSP 方案 A（panel=${PANEL_DOMAIN}）`);
console.log(`  _routes  : ${routes.include.length} 条动态路由走 Functions`);
console.log('完成。');
