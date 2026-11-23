/**
 * 手机商品页补下方 5 个区块（对照真站 product-mobile-2.jpg）：
 *   1. 付款方式 / 配送方式 / 品牌名稱 行（带 ›）
 *   2. 可參加以下優惠活動（登記送 三档）
 *   3. momo全站滿額回饋 + momo卡 双栏
 *   4. 看更多「分类」熱門商品（hashtag chips）
 *   5. 熱門推薦（横向滑块）
 */
import fs from 'node:fs';
const F = 'lib/render.mjs';
let s = fs.readFileSync(F, 'utf8');
if (s.includes('r-pdp__events')) { console.log('已存在'); process.exit(0); }

const anchor = '  <div class="r-pdp__ship">';
if (!s.includes(anchor)) { console.error('找不到出货条锚点'); process.exit(1); }

const block = `  <section class="r-pdp__rows r-pdp__rows--bordered">
    <div class="r-pdp__row r-pdp__row--link"><span class="k">付款方式</span><span class="v">信用卡 | 無卡分期 | 行動支付 | 超商付...<br><span class="pink">刷mo卡享3%，回饋上限翻倍至2千</span></span><i>›</i></div>
    <div class="r-pdp__row r-pdp__row--link"><span class="k">配送方式</span><span class="v">廠商宅配</span><i>›</i></div>
    <div class="r-pdp__row r-pdp__row--link"><span class="k">品牌名稱</span><span class="v">\${esc((name.match(/【([^】]+)】/) || [0, 'momo'])[1])}．<a class="link" href="/m/category">追蹤</a></span><i>›</i></div>
  </section>

  <section class="r-pdp__events">
    <h3>可參加以下優惠活動</h3>
    <div class="r-pdp__event">
      <span class="tag">登記送</span>
      <div class="lines">
        <p>累積滿5,000元送 mo點200元</p>
        <p>累積滿12,000元送 mo點400元</p>
        <p>累積滿35,000元送 mo點900元</p>
      </div>
      <i>›</i>
    </div>
  </section>

  <section class="r-rebate r-rebate--pdp">
    <div class="r-rebate__hd"><span>momo</span>全站滿額回饋<i>詳情</i></div>
    <div class="r-rebate__grid">
      <div class="r-rebate__col">
        <div class="r-rebate__item"><b>今日</b>累積滿5千<em>送$200</em></div>
        <div class="r-rebate__item"><b>今日</b>累積滿1.2萬<em>送$400</em></div>
        <div class="r-rebate__item"><b>今日</b>累積滿3.5萬<em>送$900</em></div>
      </div>
      <div class="r-rebate__col">
        <div class="r-rebate__item"><b>今日</b>單筆分期滿2萬<em>送$200</em></div>
        <div class="r-rebate__item"><b>升級</b>新會員辦卡 筆筆<em>3%回饋</em></div>
      </div>
    </div>
  </section>

  <section class="r-pdp__hot">
    <h3>看更多「\${esc(p.cat || '全部商品')}」熱門商品</h3>
    <div class="r-pdp__tags">
      \${['#礁溪溫泉住宿', '#宜蘭', '#早餐', '#溫泉飯店', '#親子住宿'].map((t) => \`<a href="/m/category?kw=\${encodeURIComponent(t.replace('#', ''))}">\${t}</a>\`).join('')}
    </div>
  </section>

  <section class="r-pdp__recommend">
    <h3>熱門推薦</h3>
    <div class="r-pdp__recs2">
      \${(allItems() || []).filter((x) => x.code !== p.code && x.img).slice(0, 8).map((x) => \`
        <a class="r-pdp__rec2" href="/m/product/\${x.code}">
          <img src="\${x.img}" alt="" loading="lazy">
          <b>\${esc(String(x.name).slice(0, 14))}</b>
          <span>$\${Math.round(Number(x.price) / 2).toLocaleString('en-US')}</span>
        </a>\`).join('')}
    </div>
  </section>

`;

s = s.replace(anchor, block + anchor);
fs.writeFileSync(F, s, 'utf8');
console.log('手机商品页下方 5 区块已加');
