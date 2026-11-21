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

// ── _routes.json ──
// 全部路径交给 Functions，只把纯静态目录排除掉。
// 为什么不用逐条 include：Pages 对「存在同名目录」的路径（/m、/checkout）
// 会先做 308 → /m/，即使 include 里写了 /m 也可能被静态层抢走。
// include 用 /* 且排除静态目录后，Function 稳定接管，DIRECT_PAGES 直出 200。
const routes = {
  version: 1,
  include: ['/*'],
  exclude: ['/assets/*', '/bp/*', '/promo/*'],
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
