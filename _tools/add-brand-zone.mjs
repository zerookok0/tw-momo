/**
 * 手机首页加「品牌專區 TOP10」楼层（用占位符避免模板转义）
 */
import fs from 'node:fs';
const F = '_tools/mobile-home.mjs';
let s = fs.readFileSync(F, 'utf8');
if (s.includes('品牌專區')) { console.log('已存在'); process.exit(0); }

const anchor = "  ${floor('限時搶購'";
if (!s.includes(anchor)) { console.error('找不到锚点'); process.exit(1); }

// 用 @X@ 占位，最后统一替换成真正的模板表达式
const raw = `  <!-- 品牌專區 TOP10（真站首页同款品牌墙） -->
  <section class="r-sec">
    <div class="r-sec__hd"><h2>品牌專區 · 康寧餐具</h2><a href="/m/category?kw=@KWE@">看更多 @CHEV@</a></div>
    <div class="r-wall__grid">
@CARDS@
    </div>
  </section>

`;

const cards = "      " + "${pick('餐廚', 10).map((p, i) => `" + "\n" +
  "        <a class=\"r-wall__card\" href=\"${P(p.code)}\">" + "\n" +
  "        <span class=\"r-wall__badge\">TOP${i + 1}</span>" + "\n" +
  "        <div class=\"r-wall__img\"><img src=\"${p.img}\" alt=\"\" loading=\"lazy\"></div>" + "\n" +
  "        <b>${p.name.slice(0, 18)}</b>" + "\n" +
  "        <span class=\"r-wall__price\"><em>$${fmt(sale(p.price))}</em><s>$${fmt(p.price)}</s></span>" + "\n" +
  "      </a>`).join('')}";

const block = raw
  .replace('@CARDS@', cards)
  .replace('@KWE@', '${encodeURIComponent("康寧餐具")}')
  .replace('@CHEV@', '${ICO.chev}');

s = s.replace(anchor, block + anchor);
fs.writeFileSync(F, s, 'utf8');
console.log('品牌專區 TOP10 已插入');
