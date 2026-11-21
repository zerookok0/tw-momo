/**
 * 从目录里识别「同款多规格」，给商品加上 skus 数组
 *
 * 背景：momo 的 SKU（同 i_code 下的规格）在商品详情页里，而详情页对我们是 403、
 * Wayback 也没有存档 —— 拿不到。但 momo 上「同一款商品的不同规格/包装/型号」
 * 本身常常是**不同的 i_code**，这些都在我们的目录里，是真实数据。
 *
 * 做法：按「去掉规格词 + 括号说明 + 品牌」后的名称严格分组，
 * 组内 ≥2 个视为同款多规格，写入 skus: [{code,name,label,price,img}]。
 *
 * 只做严格相等匹配，宁可少也不要把不同商品硬凑成一组。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(__dirname, '..');
const CAT = path.join(PROJ, 'site', 'data', 'catalog.json');

const cat = JSON.parse(fs.readFileSync(CAT, 'utf8'));
const items = cat.items;

const UNIT = '(?:gb|tb|mb|ml|kg|mg|g|l|w|v|mah|入|片|包|盒|瓶|顆|颗|組|组|件|支|雙|双|cm|mm|吋|號|号|碼|码|抽|捲|卷|張|张|條|条|個|个|粒|袋|箱|罐|杯|台|只|枚|卷|層|层)';

function norm(name) {
  let s = String(name).toLowerCase();
  s = s.replace(/【[^】]*】/g, '');
  s = s.replace(/[\[［][^\]］]*[\]］]/g, '');
  s = s.replace(/[（(][^）)]*[）)]/g, '');
  s = s.replace(new RegExp(`[\\d.,]+\\s*${UNIT}`, 'g'), '');
  s = s.replace(/[\s\-_/·、,，.。:：;；!！?？"'“”‘’|+*×]+/g, '');
  return s;
}

/** 取组内成员之间的差异片段作为规格标签 */
function labelOf(name, members) {
  const clean = String(name).replace(/^\s*【[^】]*】\s*/, '').trim();
  // 找公共前缀
  let pre = clean;
  for (const m of members) {
    const o = String(m.name).replace(/^\s*【[^】]*】\s*/, '').trim();
    let i = 0;
    while (i < pre.length && i < o.length && pre[i] === o[i]) i++;
    pre = pre.slice(0, i);
  }
  let rest = clean.slice(pre.length).replace(/^[\s\-_/·、,，.。:：;；(（]+/, '').trim();
  if (!rest) rest = clean.split(/[（(\/]/)[0].trim();
  // 规格标签尽量短：截到第一个括号/斜线前
  rest = rest.split(/[（(]/)[0].replace(/[)）\s]+$/g, '').trim();
  if (rest.length > 18) rest = rest.slice(0, 18) + '…';
  return rest || clean.slice(0, 18);
}

const groups = new Map();
for (const it of items) {
  const k = norm(it.name);
  if (k.length < 6) continue;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(it);
}

let grouped = 0, covered = 0;
for (const [, arr] of groups) {
  if (arr.length < 2) { for (const x of arr) delete x.skus; continue; }
  // 组内价格必须都有效
  const valid = arr.filter((x) => Number(x.price) > 0);
  if (valid.length < 2) { for (const x of arr) delete x.skus; continue; }

  const skus = valid
    .sort((a, b) => Number(a.price) - Number(b.price))
    .map((x) => ({ code: x.code, name: x.name, label: labelOf(x.name, valid), price: x.price, img: x.img }));

  for (const x of valid) {
    x.skus = skus;
    x.sku_count = skus.length;
  }
  grouped++; covered += valid.length;
}

// 单规格商品：清掉旧字段
for (const it of items) {
  if (!it.skus || it.skus.length < 2) { delete it.skus; delete it.sku_count; }
}

cat.count = items.length;
cat.sku_groups = grouped;
cat.sku_items = covered;
fs.writeFileSync(CAT, JSON.stringify(cat), 'utf8');

console.log(`同款多规格组: ${grouped}`);
console.log(`涉及商品: ${covered} / ${items.length} (${(covered / items.length * 100).toFixed(1)}%)`);
console.log('\n样例:');
let shown = 0;
for (const it of items) {
  if (!it.skus || shown >= 4) continue;
  shown++;
  console.log(`  ${it.name.slice(0, 20)}  → ${it.sku_count} 个规格`);
  it.skus.forEach((s) => console.log(`     ${s.code}  $${s.price}  「${s.label}」`));
}
