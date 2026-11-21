/**
 * 首页商品块改价：一律以「划线价（原价）」为基准打 5 折
 *
 * 首页有两种商品卡，价格写死在 HTML 里：
 *  A. 普通卡   <span class="text-[21px] font-bold">828</span> + <span class="text-[13px] line-through">$828</span>
 *  B. 限時搶購 <span class="text-[23px] font-bold text-[#DD2222]">7,111</span> + <span ... data-testid="market-price">$12,400</span>
 *
 * 原价来源优先级：
 *   ① 卡片里的划线价 span（原价，脚本从不改它）
 *   ② 按商品码查 products.json / catalog.json（个别卡片没有划线价）
 *   ③ 兜底用当前展示价
 *
 * 展示价 = round(原价 / 2)。天然幂等。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(__dirname, '..');
const SITE = path.join(PROJ, 'site');

const toNum = (s) => Number(String(s).replace(/,/g, ''));
const withComma = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// ── 价格表：products.json + catalog.json ──
const priceByCode = new Map();
try {
  for (const p of JSON.parse(fs.readFileSync(path.join(PROJ, '_ref', 'products.json'), 'utf8'))) {
    if (p.price) priceByCode.set(String(p.code), Number(p.price));
  }
} catch {}
try {
  for (const p of JSON.parse(fs.readFileSync(path.join(SITE, 'data', 'catalog.json'), 'utf8')).items) {
    if (p.price && !priceByCode.has(String(p.code))) priceByCode.set(String(p.code), Number(p.price));
  }
} catch {}

function reprice(html) {
  // 逐个商品卡处理：<a href="/product/CODE" ...> ... </a>
  const anchorRe = /<a href="\/product\/(\d+)"[\s\S]*?<\/a>/g;
  let changed = 0, skipped = 0, viaTable = 0;

  html = html.replace(anchorRe, (block, code) => {
    const saleRe = /(<span class="text-\[(?:21|23)px\] font-bold[^"]*">)([\d,]+)(<\/span>)/;
    const sm = block.match(saleRe);
    if (!sm) { skipped++; return block; }

    const marketRe = /(<span class="text-\[13px\] line-through"[^>]*>)\$([\d,]+)(<\/span>)/;
    const mm = block.match(marketRe);

    // 全站统一口径：优先用价格表（products.json / catalog.json）的原价，
    // 保证首页卡与详情页、分类页是同一个数；表里没有才退回页面自带的划线价。
    let orig = null;
    let src = '';
    if (priceByCode.has(String(code))) { orig = priceByCode.get(String(code)); src = 'table'; viaTable++; }
    if (!orig && mm) { orig = toNum(mm[2]); src = 'dom'; }
    if (!orig) orig = toNum(sm[2]);

    const sale = Math.round(orig / 2);

    let out = block.replace(saleRe, `$1${withComma(sale)}$3`);
    if (mm) out = out.replace(marketRe, `$1$${withComma(orig)}$3`);
    else {
      // 没有划线价：补一个，保证「原价 → 5 折」可见
      out = out.replace(
        /(<div class="min-h-\[18px\]"[^>]*data-testid="market-price-container"[^>]*>)(<\/div>)/,
        `$1<span class="text-[13px] line-through" data-testid="market-price">$${withComma(orig)}</span>$2`
      );
    }

    if (out !== block) changed++;
    return out;
  });

  // ── 第二遍：没有商品码的展示卡（活动位），划线价容器是空的 ──
  // 以当前展示价为原价，补出划线价并把展示价打 5 折。
  // 幂等：补完后容器非空，下次不再匹配。
  const emptyCardRe = /(<span class="text-\[(?:21|23)px\] font-bold[^"]*">)([\d,]+)(<\/span><\/div><div class="min-h-\[18px\]" data-testid="market-price-container">)(<\/div>)/g;
  html = html.replace(emptyCardRe, (all, p1, num, p3, p4) => {
    const orig = toNum(num);
    const sale = Math.round(orig / 2);
    changed++;
    return `${p1}${withComma(sale)}${p3}<span class="text-[13px] line-through" data-testid="market-price">$${withComma(orig)}</span>${p4}`;
  });

  return { html, changed, skipped, viaTable };
}

function run(rel) {
  const f = path.join(SITE, rel);
  if (!fs.existsSync(f)) return console.log(`  跳过（不存在）: ${rel}`);
  const src = fs.readFileSync(f, 'utf8');
  const { html, changed, skipped, viaTable } = reprice(src);
  if (changed) fs.writeFileSync(f, html, 'utf8');
  console.log(`  ✓ ${rel}  改价 ${changed} 个卡${skipped ? `，跳过 ${skipped}` : ''}${viaTable ? `，${viaTable} 个按价格表兜底` : ''}`);
}

console.log('首页商品块改价（原价 → 5 折）…');
run('index.html');
console.log('完成。');
