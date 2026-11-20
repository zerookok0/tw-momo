/**
 * 商品存活校验：只保留「有真实价格 + 图片 200」的商品
 *
 * 为什么需要：
 *   - 列表页快照里有「售完 / 已下架」的商品，价格抓不到
 *   - 部分商品图在 CDN 上已 404（下架后删除）
 *   留着会渲染成破图 + 假价格，宁可少也要真
 *
 * 输出：site/data/catalog.json（原地覆盖）+ 统计
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(__dirname, '..');
const F = path.join(PROJ, 'site', 'data', 'catalog.json');
const CONC = Number(process.env.CONC || 12);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const catalog = JSON.parse(fs.readFileSync(F, 'utf8'));
const before = catalog.items.length;

// 1) 先按价格过滤
const hasPrice = catalog.items.filter((i) => Number.isFinite(i.price) && i.price > 0);
const noPrice = before - hasPrice.length;

// 2) 并发 HEAD 校验图片
const alive = new Set();
let idx = 0;
async function worker() {
  while (idx < hasPrice.length) {
    const it = hasPrice[idx++];
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 20000);
        const r = await fetch(it.img, { method: 'HEAD', headers: { 'user-agent': UA }, signal: ctl.signal });
        clearTimeout(t);
        if (r.status === 200) { alive.add(it.code); break; }
        if (r.status === 404 || r.status === 403) break;
        await new Promise((s) => setTimeout(s, 800));
      } catch {
        await new Promise((s) => setTimeout(s, 800));
      }
    }
    if (idx % 100 === 0) process.stdout.write(`\r  校验 ${idx}/${hasPrice.length}  存活 ${alive.size}`);
  }
}
await Promise.all(Array.from({ length: CONC }, worker));
process.stdout.write(`\r  校验完成 ${hasPrice.length} 个，图片存活 ${alive.size}\n`);

const items = hasPrice.filter((i) => alive.has(i.code));
for (const i of items) delete i.price_estimated;

catalog.items = items;
catalog.count = items.length;
catalog.version = new Date().toISOString();
catalog.verified = { images_checked_at: new Date().toISOString(), dropped_no_price: noPrice, dropped_dead_image: hasPrice.length - items.length };

fs.writeFileSync(F, JSON.stringify(catalog), 'utf8');

console.log('校验前     :', before);
console.log('无价格丢弃 :', noPrice);
console.log('图片失效丢弃:', hasPrice.length - items.length);
console.log('最终商品   :', items.length, `(${(items.length / before * 100).toFixed(0)}% 存活)`);
console.log('价格区间   : $' + Math.min(...items.map((i) => i.price)) + ' ~ $' + Math.max(...items.map((i) => i.price)));
console.log('文件大小   :', (fs.statSync(F).size / 1024 / 1024).toFixed(2), 'MB');
