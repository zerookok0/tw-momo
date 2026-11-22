/**
 * 重写桌面商品页：按真站「左分类栏 + 右图文信息面板」两栏布局
 * 用占位符避免模板转义问题。
 */
import fs from 'node:fs';
const F = 'lib/render.mjs';
let s = fs.readFileSync(F, 'utf8');

const startMark = '  const body = `\n<div class="wrap">\n  <nav class="crumb"><a href="/">首頁</a>';
const start = s.indexOf(startMark);
if (start < 0) { console.error('找不到桌面商品页起点'); process.exit(1); }
const endMark = '    </div>\n  </div>\n</div>\n<script>';
const end = s.indexOf(endMark, start);
if (end < 0) { console.error('找不到终点'); process.exit(1); }

const tpl = `  const body = \`
<div class="wrap pdp2-wrap">
  <nav class="crumb"><a href="/">首頁</a><span class="sep">/</span><a href="/category">商品分類</a><span class="sep">/</span><a href="/category?cat=@@CATENC@@">@@CAT@@</a><span class="sep">/</span><span>@@NAME20@@</span></nav>

  <div class="pdp2">
    <aside class="pdp2__side">
      <div class="pdp2__sidehd">@@CAT@@</div>
      <ul class="pdp2__sidelist">
        <li class="on">館長推薦</li>
        <li>本週新品</li>
        <li>折價券熱銷</li>
        <li>本館熱銷TOP</li>
        <li>電視熱銷商品</li>
        <li class="more">更多</li>
      </ul>
      <div class="pdp2__sidehd">本月主打</div>
      <ul class="pdp2__sidelist">
        <li>★冬日剎手必敗★</li>
        <li>★假日不加價★</li>
        <li>★買1晚送1晚★</li>
        <li>★運動旅遊★</li>
        <li>★線上訂房★</li>
        <li>★國內旅遊精選★</li>
      </ul>
      <div class="pdp2__sidehd">主題特區</div>
      <ul class="pdp2__sidelist">
        <li>★親子住宿★</li>
        <li>★窮遊營★</li>
        <li>★大自然之旅★</li>
        <li>★絕美泳池飯店★</li>
        <li>★精選貼心住宿★</li>
      </ul>
    </aside>

    <div class="pdp2__main">
      <div class="pdp2__gallery">
        <div class="pdp2__imgbox"><img id="pdpImg" src="@@IMG@@" alt="@@NAMEESC@@"></div>
        <div class="pdp2__thumbs">
          @@THUMBS@@
        </div>
      </div>

      <div class="pdp2__info">
        <p class="pdp2__slogan">享受療癒美人湯的輕旅度假</p>
        <h1 class="pdp2__title">@@NAMEESC@@</h1>

        <div class="pdp2__promo">
          <div class="pdp2__promoline">10/31~11/30 11月限定<span>▼再降價</span></div>
          <div class="pdp2__promoline2">滿1件折121元 <em>(說明)</em></div>
        </div>

        <ul class="pdp2__sell">
          <li>免費體驗溫泉魚泡腳</li>
          <li>加贈溫泉套票550折價券</li>
          <li>距離礁溪轉運站走路五分鐘</li>
        </ul>
        <div class="pdp2__code">品號：@@CODE@@</div>

        <div class="pdp2__prices">
          <div class="row1"><span class="lb">限時折後價</span><span class="big">$@@PRICE@@</span><span class="unit">元</span><span class="vip">貴賓通鑑</span></div>
          <div class="row2"><span>促銷價 <b>$@@WAS@@</b> 元</span><span>市售價 <s>$@@WAS@@</s> 元</span></div>
        </div>

        <dl class="pdp2__attrs">
          <dt>品牌名稱</dt><dd>@@BRAND@@ <i class="fav">♡</i></dd>
          <dt>結帳方式</dt><dd>信用卡／無卡分期／行動支付／超商付款／ATM／銀聯卡<br><span class="pink">刷mo卡享3%，回饋上限翻倍至2千</span></dd>
          <dt>分期/紅利</dt><dd><select class="pdp2__sel"><option>24期</option><option>12期</option><option>6期</option></select> 每期 $@@INST@@ 元 <a href="#" class="more">更多</a></dd>
          <dt>保固資訊</dt><dd>10天保固期 <a href="#" class="more">▼更多</a></dd>
          <dt>配送方式</dt><dd><label><input type="radio" name="ship" checked> 廠商宅配</label></dd>
          <dt>數量</dt><dd><span class="qty"><button type="button" data-qty="-1">−</button><input id="pdp-qty" value="1" inputmode="numeric"><button type="button" data-qty="1">＋</button></span></dd>
          <dt>折價券</dt><dd>特惠商品，不適用折價券</dd>
        </dl>

        <div class="pdp2__actions">
          <button type="button" class="btn btn--primary btn--lg" id="btn-buy-now">直接購買</button>
          <button type="button" class="btn btn--blue btn--lg" id="btn-add-cart">放入購物車</button>
          <button type="button" class="btn btn--gray btn--lg" id="btn-fav">♡ 加入追蹤</button>
        </div>
      </div>
    </div>
  </div>
`;

let out = tpl
  .replace(/@@NAMEESC@@/g, '${esc(name)}')
  .replace(/@@NAME20@@/g, '${esc(name.slice(0, 20))}')
  .replace(/@@CATENC@@/g, '${encodeURIComponent(p.cat || "全部商品")}')
  .replace(/@@CAT@@/g, '${esc(p.cat || "全部商品")}')
  .replace(/@@BRAND@@/g, '${esc((name.match(/【([^】]+)】/) || [, "momo"])[1])}')
  .replace(/@@IMG@@/g, '${esc(img)}')
  .replace(/@@CODE@@/g, '${esc(p.code)}')
  .replace(/@@PRICE@@/g, '${price.toLocaleString("en-US")}')
  .replace(/@@WAS@@/g, '${was.toLocaleString("en-US")}')
  .replace(/@@INST@@/g, '${Math.round(price / 24).toLocaleString("en-US")}')
  .replace('@@THUMBS@@', '${[0, 1, 2, 3, 4].map((i) => `<button type="button" aria-selected="${i === 0}"><img src="${esc(img)}" alt=""></button>`).join("")}');

s = s.slice(0, start) + out + s.slice(end + endMark.length - '    </div>\n  </div>\n</div>\n<script>'.length);

fs.writeFileSync(F, s, 'utf8');
console.log('桌面商品页已重写');
