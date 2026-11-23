/**
 * 商品页评价区改成真实数据（有则用，无则显示「暫無評價」）
 * 手机版 + 桌面版都改
 */
import fs from 'node:fs';
const F = 'lib/render.mjs';
let s = fs.readFileSync(F, 'utf8');
if (s.includes('rvData')) { console.log('已存在'); process.exit(0); }

// 1) 在 renderProductPage 开头取评论
const anchor = 'export function renderProductPage(';
const i = s.indexOf(anchor);
const j = s.indexOf('\n', i) + 1;
s = s.slice(0, j) + '  const rvData = typeof getReview === "function" ? getReview(p.code) : null;\n' + s.slice(j);

// 2) 手机版评价区换成真实数据
const mobileOld = `  <section class="r-pdp__detail" id="sec-review">
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
  </section>`;

const mobileNew = `  <section class="r-pdp__detail" id="sec-review">
    <h3>商品評價</h3>
    \${rvData && rvData.reviews && rvData.reviews.length ? \`
      <div class="r-pdp__rate">
        <span class="score">\${esc(String(rvData.avg || ''))}</span>
        <span class="stars">\${'★'.repeat(Math.max(1, Math.round(Number(rvData.avg) || 5)))}</span>
        <span class="cnt">\${esc(String(rvData.cnt || ''))}　\${esc(String(rvData.sale || ''))}</span>
      </div>
      \${rvData.reviews.slice(0, 4).map((r) => \`
        <div class="r-pdp__review">
          <b>\${esc(String(r.customName || '匿名'))}</b>
          <span class="stars">\${'★'.repeat(Number(r.score) || 5)}</span>
          <span class="date">\${esc(String(r.date || ''))}</span>
          <p>\${esc(String(r.comment || ''))}</p>
          \${r.replyContent ? \`<p class="reply">店家回覆：\${esc(String(r.replyContent))}</p>\` : ''}
        </div>\`).join('')}
    \` : \`
      <p class="r-pdp__norev">這件商品目前尚無評價</p>
    \`}
  </section>`;

if (s.includes(mobileOld)) { s = s.replace(mobileOld, mobileNew); console.log('手机版评价区已换真实数据'); }
else console.log('手机版评价区未匹配');

// 3) 桌面版：把 pdp2__detail 里的假评价换成真实（桌面版目前没有评价区，加一个）
const deskAnchor = '  <section class="card pdp2__rel"';
if (s.includes(deskAnchor) && !s.includes('pdp2__reviews')) {
  const deskBlock = `  <section class="card pdp2__reviews" style="margin-top:14px">
    <div class="card__hd"><h2>商品評價</h2></div>
    <div class="card__bd">
      \${rvData && rvData.reviews && rvData.reviews.length ? \`
        <div class="pdp2__ratesum">
          <span class="big">\${esc(String(rvData.avg || ''))}</span>
          <span class="stars">\${'★'.repeat(Math.max(1, Math.round(Number(rvData.avg) || 5)))}</span>
          <span class="cnt">\${esc(String(rvData.cnt || ''))}　\${esc(String(rvData.sale || ''))}</span>
        </div>
        \${rvData.reviews.slice(0, 5).map((r) => \`
          <div class="pdp2__review">
            <div class="hd"><b>\${esc(String(r.customName || '匿名'))}</b><span class="stars">\${'★'.repeat(Number(r.score) || 5)}</span><span class="date">\${esc(String(r.date || ''))}</span></div>
            <p>\${esc(String(r.comment || ''))}</p>
          </div>\`).join('')}
      \` : '<p class="pdp2__norev">這件商品目前尚無評價</p>'}
    </div>
  </section>

`;
  s = s.replace(deskAnchor, deskBlock + deskAnchor);
  console.log('桌面版评价区已加');
}

fs.writeFileSync(F, s, 'utf8');
console.log('完成');
