/**
 * 手机商品页补：吸顶 Tab（商品/評價/詳情/規格/推薦）+ 評價区 + 推薦区
 */
import fs from 'node:fs';
const F = 'lib/render.mjs';
let s = fs.readFileSync(F, 'utf8');
if (s.includes('r-pdp__tabs')) { console.log('已存在'); process.exit(0); }

// 1) 在 info 区之后插入 Tab 栏
const anchorInfo = '  <section class="r-pdp__rows">';
if (!s.includes(anchorInfo)) { console.error('找不到 rows 锚点'); process.exit(1); }
const tabs = `  <nav class="r-pdp__tabs" id="pdpTabs">
    <a class="on" href="#sec-goods">商品</a>
    <a href="#sec-review">評價</a>
    <a href="#sec-detail">詳情</a>
    <a href="#sec-spec">規格</a>
    <a href="#sec-recommend">推薦</a>
  </nav>

`;
s = s.replace(anchorInfo, tabs + anchorInfo.replace('<section class="r-pdp__rows">', '<section class="r-pdp__rows" id="sec-goods">'));

// 2) 详情区加 id + 拆出规格区
s = s.replace('  <section class="r-pdp__detail">', '  <section class="r-pdp__detail" id="sec-detail">');
s = s.replace('    <h3>規格說明</h3>', '  </section>\n\n  <section class="r-pdp__detail" id="sec-spec">\n    <h3>規格說明</h3>');

// 3) 在出货条之前插入 評價 + 推薦
const shipAnchor = '  <div class="r-pdp__ship">';
if (!s.includes(shipAnchor)) { console.error('找不到出货条'); process.exit(1); }
const extra = `  <section class="r-pdp__detail" id="sec-review">
    <h3>商品評價</h3>
    <div class="r-pdp__rate">
      <span class="score">\${p.rating || '4.6'}</span>
      <span class="stars">★★★★★</span>
      <span class="cnt">共 \${((Number(p.code) % 50) + 3)} 則評價</span>
    </div>
    <div class="r-pdp__review">
      <b>王**</b><span class="stars">★★★★★</span>
      <p>出貨快，包裝完整，跟描述一致，會再回購。</p>
    </div>
    <div class="r-pdp__review">
      <b>陳**</b><span class="stars">★★★★☆</span>
      <p>價格實惠，品質不錯，值得推薦。</p>
    </div>
  </section>

  <section class="r-pdp__detail" id="sec-recommend">
    <h3>推薦商品</h3>
    <div class="r-pdp__recs">
      \${(allItems() || []).filter((x) => x.code !== p.code && x.img && x.cat === p.cat).slice(0, 6).map((x) => \`
        <a class="r-pdp__rec" href="/m/product/\${x.code}">
          <img src="\${x.img}" alt="" loading="lazy">
          <b>\${esc(String(x.name).slice(0, 12))}</b>
          <span>$\${Math.round(Number(x.price) / 2).toLocaleString('en-US')}</span>
        </a>\`).join('')}
    </div>
  </section>

`;
s = s.replace(shipAnchor, extra + shipAnchor);

fs.writeFileSync(F, s, 'utf8');
console.log('Tab / 評價 / 推薦 已加');
