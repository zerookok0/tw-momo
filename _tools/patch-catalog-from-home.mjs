/**
 * 用首页卡片数据补全目录
 *
 * 首页有少量商品卡（活动位）不在 catalog.json 里 —— 当初按「无价格 / 图片失效」
 * 被剔除，但首页仍在展示它们，点进去就 404。
 * 这里从首页 DOM 抽 name / 原价 / 主图，补进目录，让详情页能正常渲染。
 *
 * 幂等：已在目录里的 code 不动。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(__dirname, '..');
const SITE = path.join(PROJ, 'site');
const CAT = path.join(SITE, 'data', 'catalog.json');

const html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
const catalog = JSON.parse(fs.readFileSync(CAT, 'utf8'));
const have = new Set(catalog.items.map((i) => String(i.code)));

const anchorRe = /<a href="\/product\/(\d+)"([^>]*)>([\s\S]*?)<\/a>/g;
let m;
const added = [];
while ((m = anchorRe.exec(html))) {
  const code = m[1];
  if (have.has(code)) continue;

  const attrs = m[2];
  const block = m[3];

  const title = (attrs.match(/title="([^"]*)"/) || [])[1] || '';
  // 原价 = 划线价；首页已把展示价改成 5 折，划线价才是目录要的 price
  const strike = block.match(/line-through"[^>]*>\$([\d,]+)</);
  const sale = block.match(/<span class="[^"]*text-\[2[13]px\][^"]*">([\d,]+)<\/span>/);
  const img = block.match(/<img[^>]+src="(\/assets\/[^"]*(?:goodsimg|ecm\/img)[^"]*)"/);

  let price = strike ? Number(strike[1].replace(/,/g, '')) : 0;
  if (!price && sale) price = Number(sale[1].replace(/,/g, '')) * 2;   // 兜底：反推原价
  if (!price || !title) continue;

  const item = {
    code,
    name: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim(),
    price,
    img: img ? img[1] : '',
    from_home: 1,
  };
  catalog.items.push(item);
  have.add(code);
  added.push(item);
}

if (added.length) {
  catalog.items.sort((a, b) => Number(a.code) - Number(b.code));
  catalog.count = catalog.items.length;
  fs.writeFileSync(CAT, JSON.stringify(catalog), 'utf8');
}
console.log(`补全目录：新增 ${added.length} 个商品，目录总数 ${catalog.count}`);
added.slice(0, 10).forEach((i) => console.log('  +', i.code, `$${i.price}`, i.name.slice(0, 30)));
