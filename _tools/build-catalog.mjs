/**
 * catalog_raw.jsonl → site/data/catalog.json
 *
 * 清洗规则：
 *   - 去重（按 code）
 *   - 名称去掉首尾空白与不可见字符
 *   - 价格缺失时用「同分类中位数」兜底，避免列表页出现 $0
 *   - 图片统一 https: 前缀，优先 _L.webp（大图）
 *   - 按 code 排序，输出 { version, count, items: [...] }
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(__dirname, '..');
const REF = path.join(PROJ, '_ref');
const OUT_DIR = path.join(PROJ, 'site', 'data');
fs.mkdirSync(OUT_DIR, { recursive: true });

const raw = fs.readFileSync(path.join(REF, 'catalog_raw.jsonl'), 'utf8');

const map = new Map();
let lines = 0;
for (const line of raw.split('\n')) {
  if (!line.trim()) continue;
  lines++;
  let it;
  try { it = JSON.parse(line); } catch { continue; }

  const code = String(it.code || '').trim();
  let name = String(it.name || '')
    .replace(/[\u0000-\u001f\u200b-\u200f\ufeff]/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (!/^\d+$/.test(code) || name.length < 2) continue;

  let img = it.img ? String(it.img) : '';
  if (img.startsWith('//')) img = 'https:' + img;
  if (img.startsWith('http://')) img = img.replace('http://', 'https://');
  // 只保留真正的商品图（goodsimg/…）；品牌块、活动块一律丢弃
  if (!img || !img.includes('goodsimg')) continue;
  if (!img) img = '';

  const price = Number.isFinite(it.price) && it.price > 0 ? Math.round(it.price) : null;

  const prev = map.get(code);
  if (prev) {
    // 合并：名称取更长的（更完整），价格/图片取有的
    if (name.length > prev.name.length) prev.name = name;
    if (!prev.price && price) prev.price = price;
    if (!prev.img && img) prev.img = img;
    continue;
  }
  map.set(code, { code, name, price, img });
}

let items = [...map.values()];

// 价格兜底：缺失的用全体中位数（避免 $0）
const prices = items.filter((i) => i.price).map((i) => i.price).sort((a, b) => a - b);
const median = prices.length ? prices[Math.floor(prices.length / 2)] : 990;
let filled = 0;
for (const i of items) {
  if (!i.price) { i.price = median; i.price_estimated = 1; filled++; }
}

// 无图兜底：用 momo 占位图
const NO_IMG = '/assets/img1.momoshop.com.tw/ecm/img/online/10/998/00/000/bt_0_245_01/bt_0_245_01_P1_1_e2.png';
let noImg = 0;
for (const i of items) if (!i.img) { i.img = NO_IMG; noImg++; }

items.sort((a, b) => Number(a.code) - Number(b.code));

const catalog = {
  version: new Date().toISOString(),
  source: 'wayback:www.momoshop.com.tw/category/LgrpCategory.jsp',
  count: items.length,
  items,
};

fs.writeFileSync(path.join(OUT_DIR, 'catalog.json'), JSON.stringify(catalog), 'utf8');

console.log('原始行数   :', lines);
console.log('唯一商品   :', items.length);
console.log('价格兜底   :', filled);
console.log('图片兜底   :', noImg);
console.log('价格区间   : $' + Math.min(...items.map((i) => i.price)) + ' ~ $' + Math.max(...items.map((i) => i.price)));
console.log('文件大小   :', (fs.statSync(path.join(OUT_DIR, 'catalog.json')).size / 1024 / 1024).toFixed(2), 'MB');
console.log('样例       :', items.slice(0, 3).map((i) => `${i.code} $${i.price} ${i.name.slice(0, 24)}`).join(' | '));
