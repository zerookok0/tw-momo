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
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data: https:",
  `connect-src 'self' https://${PANEL_DOMAIN} wss://${PANEL_DOMAIN}`,
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

// ── _routes.json：只让动态路由走 Functions，静态资源零开销 ──
const routes = {
  version: 1,
  include: [
    // 目录页直出：Pages 默认会把 /checkout 308 到 /checkout/，契约要求 200 无 Location
    '/checkout',
    '/checkout/',
    '/cart',
    '/cart/',
    '/m',
    '/m/',
    '/m/checkout',
    '/m/checkout/',
    '/m/cart',
    '/m/cart/',
    // 订单成功页（不显式指派会回落到首页内容）
    '/order/*',
    '/m/order/*',
    // 动态路由
    '/api/*',
    '/product/*',
    '/goods/GoodsDetail.jsp',
    '/category',
    '/category/*',
    '/m/product/*',
    '/m/goods.momo',
    '/m/category',
    '/m/category/*',
  ],
  exclude: [],
};
fs.writeFileSync(path.join(OUT, '_routes.json'), JSON.stringify(routes, null, 2), 'utf8');

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
