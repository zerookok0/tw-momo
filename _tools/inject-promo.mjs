/**
 * 往首页（桌面 + 行动）注入「今日限定 5 折起」促销弹窗
 *
 * 只插两行引用，逻辑与样式都在 /assets/promo/ 下，方便单独改：
 *   <link rel="stylesheet" href="/assets/promo/promo.css" data-promo="1">
 *   <script defer src="/assets/promo/promo.js" data-promo="1"></script>
 *
 * 幂等：已注入则跳过（按 data-promo 标记判断）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(__dirname, '..');
const SITE = path.join(PROJ, 'site');

const LINK = '<link rel="stylesheet" href="/assets/promo/promo.css" data-promo="1">';
const SCRIPT = '<script defer src="/assets/promo/promo.js" data-promo="1"></script>';

function inject(rel) {
  const f = path.join(SITE, rel);
  if (!fs.existsSync(f)) {
    console.log(`  跳过（不存在）: ${rel}`);
    return;
  }
  let html = fs.readFileSync(f, 'utf8');
  if (html.includes('data-promo="1"')) {
    console.log(`  已注入，跳过: ${rel}`);
    return;
  }

  if (html.includes('</head>')) html = html.replace('</head>', `${LINK}\n</head>`);
  else html = LINK + html;

  if (html.includes('</body>')) html = html.replace('</body>', `${SCRIPT}\n</body>`);
  else html = html + SCRIPT;

  fs.writeFileSync(f, html, 'utf8');
  console.log(`  ✓ ${rel}  已注入促销弹窗`);
}

console.log('注入首页促销弹窗…');
inject('index.html');
inject(path.join('m', 'index.html'));
console.log('完成。');
