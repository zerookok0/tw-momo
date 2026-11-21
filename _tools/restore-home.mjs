/**
 * 首页还原：把「已改价」的首页快照装回 site/index.html
 *
 * 背景：首页是从线上抓的渲染后 DOM，价格写死在 HTML 里。改价用真实浏览器 DOM
 * 改写完成（见 REPRICE.md），结果存为 _ref/index-priced.html 作为构建源。
 * 之后每次 build 都用它覆盖 site/index.html，保证价格不会被重新抓来的原版冲掉。
 *
 * 若快照不存在，则保留现有 site/index.html 不动（并在日志里提示）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(__dirname, '..');
const SRC = path.join(PROJ, '_ref', 'index-priced.html');
const DST = path.join(PROJ, 'site', 'index.html');

console.log('还原首页（5 折改价版）…');
if (!fs.existsSync(SRC)) {
  console.log('  ⚠ 缺少 _ref/index-priced.html，跳过（现有首页保持不变）');
  process.exit(0);
}
const html = fs.readFileSync(SRC, 'utf8');
fs.writeFileSync(DST, html, 'utf8');

// 校验：价格 span 与划线价数量
const sales = (html.match(/text-\[2[13]px\] font-bold/g) || []).length;
const strikes = (html.match(/line-through/g) || []).length;
console.log(`  ✓ site/index.html ← _ref/index-priced.html（${(html.length / 1024).toFixed(0)} KB，价格 ${sales} 处，划线价 ${strikes} 处）`);
