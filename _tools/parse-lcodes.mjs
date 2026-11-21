/**
 * 从 momo 页面里抠出「分类码 → 分类名」对照表
 *
 * momo 每个页面（首页/分类页）都带同一套巨型菜单，链接里含 l_code，
 * 文字就是分类名。这比逐页抓分类页快得多。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(__dirname, '..');
const REF = path.join(PROJ, '_ref');

const files = ['cat_probe.html', 'index-priced.html'].map((f) => path.join(REF, f)).filter((f) => fs.existsSync(f));
const map = new Map();

for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  // <a href="...LgrpCategory.jsp?l_code=NNNNNNNNNN...">名稱</a>
  const re = /<a\b[^>]*?href="[^"]*?LgrpCategory\.jsp\?l_code=(\d{8,12})[^"]*"[^>]*>([\s\S]{1,80}?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const code = m[1];
    const name = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!name || name.length < 2 || name.length > 20) continue;
    if (!/[\u4e00-\u9fa5]/.test(name)) continue;
    if (!map.has(code)) map.set(code, name);
  }
}

// 也收 d_code（品牌分类）与 cateCode 形式
const out = [...map.entries()].map(([code, name]) => ({ code, name }));
fs.writeFileSync(path.join(REF, 'lcode_names.json'), JSON.stringify(out, null, 1), 'utf8');
console.log(`分类对照: ${out.length} 条`);
console.log(out.slice(0, 20).map((x) => `  ${x.code}  ${x.name}`).join('\n'));
