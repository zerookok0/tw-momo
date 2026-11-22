/**
 * 手机版首页 —— 按真实 m.momoshop.com.tw 手机版 1:1 复刻
 *
 * 结构（对照 402×874 真机截图逐块量取）：
 *   1. header   ☰ | 新品标 | 搜索胶囊 | 历史 | 消息                40px sticky
 *   2. nav      首頁 限時搶購 直播 mo店+ 看看買 ▾                 36px
 *   3. 双栏     左 COACH 活动卡（底部红条）/ 右 超级品类日 + 今日大牌 2 小卡   250px
 *   4. 分类条   圆形图 + 主标题 + 副标题，横滑                     125px
 *   5. 桃金日   红黑整宽横幅（三栏）                                109px
 *   6. 双黑条   訂閱moPro直領1080 / 超取290免運                     57px
 *   7. 图标行   領券 秒殺 簽到 限搶 看更多（带角标）                 97px
 *   8. 好物榜   标题 + 横滑标签 + TOP1-3 商品卡                    387px
 *   9. 小卡行   mo店+ / 富邦產險 / COACH / 轉盤（横滑）             196px
 *  10. 旗艦店   标题 + 4 个品牌卡                                 165px
 *  11. 商品楼层 限時搶購网格
 *  12. tabbar   首頁 逛逛 追蹤清單 購物車 會員中心
 *
 * 已按要求去掉客服浮窗。
 */

const P = (code) => '/m/product/' + code;
const plat = (n) => '/m/category?cat=' + encodeURIComponent(n);

const ICO = {
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H8l-4 3V5Z"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>',
  coupon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h13A2.5 2.5 0 0 1 21 8.5v1a2.5 2.5 0 0 0 0 5v1a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 15.5v-1a2.5 2.5 0 0 0 0-5v-1Z"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="m9 15 2 2 4-4"/></svg>',
  alarm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.6M5 4 3 6M19 4l2 2"/></svg>',
  zoom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6M11 8v6M8 11h6"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8Z"/></svg>',
  shop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h16l-1.2 11.5a1 1 0 0 1-1 .9H6.2a1 1 0 0 1-1-.9L4 8Z"/><path d="M8.5 8V6a3.5 3.5 0 0 1 7 0v2"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.6-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.8C19 15.4 12 20 12 20Z"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h2l2.2 10.2a1 1 0 0 0 1 .8h8.4a1 1 0 0 0 1-.8L19.5 8H6"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.3-3.6 4-5.4 7.5-5.4s6.2 1.8 7.5 5.4"/></svg>',
};

export function renderHome(deps) {
  const { shell, UTM_SCRIPT, catalog } = deps;

  const items = catalog.items || [];
  const pick = (cat, n) => items.filter((x) => x.cat === cat && x.img).slice(0, n);
  const any = (i) => items.filter((x) => x.img)[i % Math.max(1, items.filter((x) => x.img).length)] || {};
  const img = (cat, i) => {
    const arr = pick(cat, i + 1);
    return (arr[i] && arr[i].img) || any(i + 7).img || '';
  };
  const sale = (p) => Math.round(Number(p) / 2);
  const fmt = (n) => Number(n || 0).toLocaleString('en-US');

  const top3 = items.filter((x) => x.img && Number(x.price) > 100).slice(0, 3);

  // ── 商品卡（好物榜 TOP 卡）──
  const topCard = (it, i) => `
    <a class="r-top" href="${P(it.code)}">
      <span class="r-top__rank">TOP<em>${i + 1}</em></span>
      <img src="${it.img}" alt="" loading="lazy">
      <b class="r-top__name">${it.name.slice(0, 26)}</b>
      <span class="r-top__price">$${fmt(sale(it.price))}</span>
      <s class="r-top__was">$${fmt(it.price)}</s>
    </a>`;

  const body = `
<header class="r-hd">
  <button class="r-hd__menu" type="button" aria-label="選單">${ICO.menu}</button>
  <span class="r-hd__tag">新品<em>🔥</em></span>
  <form class="r-hd__search" onsubmit="event.preventDefault();location.href='/m/category?kw='+encodeURIComponent(this.q.value)">
    <input name="q" type="search" placeholder="理膚寶水" aria-label="搜尋">
  </form>
  <a class="r-hd__ico" href="/m/category" aria-label="足跡">${ICO.clock}</a>
  <a class="r-hd__ico" href="/info/contact" aria-label="消息">${ICO.chat}</a>
</header>

<nav class="r-nav">
  <a class="on" href="/m/">首頁</a>
  <a href="/m/category">限時搶購</a>
  <a href="/m/category">直播</a>
  <a href="/m/category">mo店+</a>
  <a href="/m/category">看看買</a>
  <a class="r-nav__more" href="/m/category">${ICO.down}</a>
</nav>

<main class="r-main">

  <!-- 3. 双栏活动位 -->
  <section class="r-duo">
    <a class="r-duo__l" href="${plat('精品/飾品')}">
      <span class="r-duo__badge">11/23<br>限定</span>
      <div class="r-duo__brandline">COACH</div>
      <div class="r-duo__sub">新季焦點</div>
      <img src="${img('精品/飾品', 0)}" alt="">
      <span class="r-duo__foot">CHELSEA系列<em>最高回饋 7%</em></span>
    </a>
    <div class="r-duo__r">
      <a class="r-kind" href="${plat('彩妝保養')}">
        <span class="r-kind__hd">超級品類日<i>今日限定</i></span>
        <span class="r-kind__t">開架醫美日<br>最高回饋37%</span>
        <img src="${img('彩妝保養', 0)}" alt="">
      </a>
      <div class="r-daily">
        <div class="r-daily__hd">今日大牌</div>
        <div class="r-daily__grid">
          <a href="${plat('運動/按摩')}"><img src="${img('運動/按摩', 0)}" alt=""><span>adidas<em>回饋45%</em></span></a>
          <a href="${plat('家電')}"><img src="${img('家電', 0)}" alt=""><span>潔淨舒壓日<em>全館4折up</em></span></a>
        </div>
      </div>
    </div>
  </section>

  <!-- 4. 分类圆形横滑 -->
  <section class="r-cats">
    <a href="${plat('家電')}"><i><img src="${img('家電', 1)}" alt=""></i><b>家電集購</b><span>獨家優惠</span></a>
    <a href="${plat('食品/飲料')}"><i><img src="${img('食品/飲料', 1)}" alt=""></i><b>熱銷美食</b><span>抽年菜組</span></a>
    <a href="${plat('保健/醫療')}"><i><img src="${img('保健/醫療', 1)}" alt=""></i><b>保健快閃</b><span>下殺3折起</span></a>
    <a href="${plat('3C週邊')}"><i><img src="${img('3C週邊', 1)}" alt=""></i><b>3C達人</b><span>登記抽666</span></a>
    <a href="${plat('戶外')}"><i><img src="${img('戶外', 1)}" alt=""></i><b>休閒戶外</b><span>今日限定</span></a>
    <a href="${plat('女時尚')}"><i><img src="${img('女時尚', 1)}" alt=""></i><b>女裝特輯</b><span>5折起</span></a>
  </section>

  <!-- 5. 桃金日 红黑横幅 -->
  <a class="r-tj" href="${plat('食品/飲料')}">
    <span class="r-tj__tag">今日<br>限定</span>
    <span class="r-tj__l"><b>moPro</b><i>專屬價52折</i></span>
    <span class="r-tj__c"><b>黑五購物節</b><em>全站<br>加碼送<i>900</i></em></span>
    <span class="r-tj__r"><b>婦幼尿布</b><i>最高送300</i></span>
    <span class="r-tj__badge">限定</span>
  </a>

  <!-- 6. 两条黑底 -->
  <section class="r-bars">
    <a href="/info/member-center"><b>訂閱moPro</b>直領<i>1080</i><em>GO</em></a>
    <a href="/info/fast-delivery"><b>超取</b><i>290</i>免運<em>GO</em></a>
  </section>

  <!-- 7. 圆形图标行 -->
  <nav class="r-quick">
    <a href="/info/coupons"><span class="r-quick__ic" style="color:#e2125b">${ICO.coupon}</span><span class="r-quick__badge">92折</span><b>領券</b></a>
    <a href="/m/category"><span class="r-quick__ic" style="color:#4c8dff">${ICO.bolt}</span><span class="r-quick__badge r-quick__badge--shop">店+</span><b>秒殺</b></a>
    <a href="/info/member-center"><span class="r-quick__ic" style="color:#333">${ICO.cal}</span><span class="r-quick__badge r-quick__badge--m">m</span><b>簽到</b></a>
    <a href="${plat('家電')}"><span class="r-quick__ic" style="color:#e2125b">${ICO.alarm}</span><b>限搶</b></a>
    <a href="/m/category"><span class="r-quick__ic" style="color:#8a8a8a">${ICO.zoom}</span><b>看更多</b></a>
  </nav>

  <!-- 8. 精選好物榜 -->
  <section class="r-rank">
    <div class="r-rank__hd"><h2>你的精選好物榜</h2></div>
    <div class="r-rank__tabs">
      <a href="/m/category?kw=%E9%BA%A5%E9%A6%99%E9%AD%9A">麥香魚</a>
      <a href="/m/category?kw=%E6%98%9F%E5%B7%B4%E5%85%8B">星巴克券</a>
      <a href="/m/category?kw=%E7%A6%8F%E5%88%A9%E5%93%81">福利品手機</a>
      <a href="/m/category?kw=%E8%BA%AB%E9%AB%94%E4%BF%9D%E9%A4%8A">身體保養</a>
      <a href="/m/category?kw=%E7%89%9B%E7%88%BE">牛爾</a>
      <a href="/m/category?kw=%E4%BA%AC%E5%9F%8E%E4%B9%8B%E9%9C%9C">京城之霜</a>
    </div>
    <div class="r-rank__row">${top3.map((it, i) => topCard(it, i)).join('')}</div>
  </section>

  <!-- 9. 横滑小卡 -->
  <section class="r-mini">
    <a href="/info/fast-delivery"><span class="r-mini__tag">mo店+</span><b>FamilyMart</b><i>超取$290<br>免運無限次</i></a>
    <a href="/info/insurance"><span class="r-mini__tag">今日限定</span><b>富邦產險</b><i>旅遊不便險<br>投保享好禮</i></a>
    <a href="${plat('精品/飾品')}"><span class="r-mini__tag">WOW</span><b>COACH新品</b><i>新季焦點</i></a>
    <a href="/info/coupons"><span class="r-mini__tag">今日限定</span><b>轉盤拼88</b><i>每抽都有獎</i></a>
  </section>

  <!-- 10. 官方旗艦名店 -->
  <section class="r-brand">
    <div class="r-brand__hd"><h2>官方旗艦名店</h2><a href="/m/category">看更多 ${ICO.chev}</a></div>
    <div class="r-brand__row">
      <a href="${plat('男時尚')}"><span class="r-brand__logo" style="background:#e8442b">BEAMS</span><b>BEAMS</b><i>日本新品同步</i></a>
      <a href="${plat('保健/醫療')}"><span class="r-brand__logo" style="background:#c8102e">三友藥妝</span><b>三友藥妝</b><i>全館88折</i></a>
      <a href="${plat('戶外')}"><span class="r-brand__logo" style="background:#111">snow peak</span><b>snow peak</b><i>任選兩件8折</i></a>
      <a href="${plat('修繕園藝')}"><span class="r-brand__logo" style="background:#333">中崙五金</span><b>中崙五金</b><i>滿額折10↑</i></a>
    </div>
  </section>


  <!-- 9. 直播条 -->
  <a class="r-livebar" href="/m/category">
    <span>直播下單滿額登記送<em>2%</em></span>
    <span class="r-livebar__more">直播大廳 ${ICO.chev}</span>
  </a>

  <!-- 10. LIVE 短影音 横滑 -->
  <section class="r-live">
    <div class="r-live__row">
      <a class="r-live__card" href="/m/category">
        <div class="r-live__img"><img src="${img('家電', 2)}" alt=""><span class="r-live__tag">LIVE</span></div>
        <b>【火熱榜單大公開】偷看大家的購物車</b>
        <span class="r-live__cta">精選搶購</span>
      </a>
      <a class="r-live__card r-live__card--blue" href="/m/category">
        <div class="r-live__img"><img src="${img('彩妝保養', 2)}" alt=""><span class="r-live__date">11.1-11.30</span></div>
        <b>全月滿額登記贈<br>直播限定品</b>
        <span class="r-live__cta r-live__cta--blue">點我看更多</span>
      </a>
      <a class="r-live__card" href="/m/category">
        <div class="r-live__img"><img src="${img('食品/飲料', 2)}" alt=""></div>
        <b>全程冷鏈 涼感直送</b>
        <span class="r-live__cta">立即看</span>
      </a>
    </div>
  </section>

  <!-- 11. 商品行：分次配限定 -->
  <section class="r-sec">
    <div class="r-sec__hd"><h2>分次配限定天天享優惠價</h2><a href="/m/category">看更多 ${ICO.chev}</a></div>
    <div class="r-row2">
      <a class="r-row2__lead" href="/info/fast-delivery">
        <b>分次配</b><span>首單滿額送<br><em>5%</em></span><i>立即下單</i>
      </a>
      ${pick('食品/飲料', 3).map((p) => `
        <a class="r-row2__item" href="${P(p.code)}">
          <img src="${p.img}" alt="" loading="lazy">
          <b>${p.name.slice(0, 8)}</b>
          <span><em>${fmt(sale(p.price))}</em><s>${fmt(p.price)}</s></span>
        </a>
      `).join('')}
    </div>
  </section>

  <!-- 12. 商品行：横滑 -->
  <section class="r-sec">
    <div class="r-sec__hd"><h2>$499 起</h2><a href="/m/category">看更多 ${ICO.chev}</a></div>
    <div class="r-row2">
      ${pick('保健/醫療', 4).map((p) => `
        <a class="r-row2__item" href="${P(p.code)}">
          <img src="${p.img}" alt="" loading="lazy">
          <b>${p.name.slice(0, 8)}</b>
          <span><em>${fmt(sale(p.price))}</em><s>${fmt(p.price)}</s></span>
        </a>
      `).join('')}
    </div>
  </section>

  <!-- 13. momo全站滿額回饋 -->
  <section class="r-rebate">
    <div class="r-rebate__hd"><span>momo</span>全站滿額回饋<i>回饋</i></div>
    <div class="r-rebate__grid">
      <div class="r-rebate__col">
        <div class="r-rebate__item"><b>今日</b>累積滿5千<em>送$200</em></div>
        <div class="r-rebate__item"><b>今日</b>累積滿1.2萬<em>送$400</em></div>
        <div class="r-rebate__item"><b>今日</b>累積滿3.5萬<em>送$900</em></div>
      </div>
      <div class="r-rebate__col">
        <div class="r-rebate__item"><b>momo卡</b>今日單筆分期滿<em>送$200</em></div>
        <div class="r-rebate__item"><b>新會員</b>辦升級 筆筆<em>3%回饋</em></div>
      </div>
    </div>
  </section>

  <!-- 14. 防詐騙提示 -->
  <a class="r-warn" href="/info/anti-fraud">
    <span class="r-warn__ico">⚠️</span>
    <span>當心「發票中獎」假信件！請勿點擊不明連結</span>
    <em>了解詳情</em>
  </a>

  <!-- 15. 猜你想搜 + 品牌词横滑 -->
  <section class="r-sec">
    <div class="r-sec__hd"><h2>猜你想搜</h2><a href="/m/category">看更多 ${ICO.chev}</a></div>
    <div class="r-brands">
      ${['LUSH 嵐舒', '歐舒丹護手霜', 'Aesop', '雅詩蘭黛', '蘭蔻', '資生堂'].map((t, i) => `
        <a href="/m/category?kw=${encodeURIComponent(t)}"><i><img src="${img(['家電','3C週邊','食品/飲料'][i % 3], i + 1)}" alt=""></i><b>${t}</b></a>
      `).join('')}
    </div>
  </section>

  ${seckillWall()}
  ${floor('11.11 降價好貨', '食品/飲料', plat('食品/飲料'), '', 20)}
  ${floor('熱銷 3C', '3C週邊', plat('3C週邊'), '', 12)}
  ${floor('人氣推薦', '家具收納', plat('家具收納'), '', 12)}

</main>

<nav class="r-tab">
  <a class="on" href="/m/">${ICO.home}<span>首頁</span></a>
  <a href="/m/category">${ICO.shop}<span>逛逛</span></a>
  <a href="/info/wishlist">${ICO.heart}<span>追蹤清單</span></a>
  <a href="/m/cart">${ICO.cart}<span>購物車</span></a>
  <a href="/info/member-center">${ICO.user}<span>會員中心</span></a>
</nav>
`;


  /** 真站那种粉底商品墙：倒计时 + 角标 + 促销条 + 播放按钮 */
  function seckillWall() {
    const list = pick('家電', 20);
    if (!list.length) return '';
    const badges = ['東芝官方<br>NO.1 好評熱銷', '限時售完<br>-55折', '今日爆款<br>TOP 1', '限時特惠<br>-42折'];
    const promos = ['升級QLED★省$1,989', '買60ml送126ml', '登記抽$1,000', '滿$990折$100'];
    const tags = ['今日限定', '11/23限定', '今日限定', '11/23限定'];
    return `
  <section class="r-wall">
    <div class="r-wall__hd">
      <h2>🔥 限時搶購</h2>
      <span class="r-wall__cd"><i>04</i>:<i>24</i>:<i>24</i></span>
      <a class="r-wall__more" href="${plat('家電')}">${ICO.chev}</a>
    </div>
    <div class="r-wall__grid">
      ${list.map((p, i) => {
        const s2 = sale(p.price);
        return `<a class="r-wall__card" href="${P(p.code)}">
        <span class="r-wall__badge">${badges[i % 4]}</span>
        <div class="r-wall__img">
          <img src="${p.img}" alt="" loading="lazy">
          <span class="r-wall__play"></span>
          <span class="r-wall__tag">${tags[i % 4]}</span>
        </div>
        <span class="r-wall__promo">${promos[i % 4]}</span>
        <b>${p.name.slice(0, 22)}</b>
        <span class="r-wall__price">限搶價<em>${fmt(s2)}</em><s>${fmt(p.price)}</s></span>
      </a>`;
      }).join('')}
    </div>
  </section>`;
  }

  function floor(title, cat, link, badge, count = 6) {
    const list = pick(cat, count);
    if (!list.length) return '';
    return `
  <section class="r-sec">
    <div class="r-sec__hd"><h2>${title}${badge || ''}</h2><a href="${link}">看更多 ${ICO.chev}</a></div>
    <div class="r-grid">
      ${list.map((p) => {
        const s = sale(p.price);
        return `<a class="r-card" href="${P(p.code)}">
        <img src="${p.img}" alt="" loading="lazy">
        <b>${p.name.slice(0, 24)}</b>
        <span class="r-card__price">$${fmt(s)}<s>$${fmt(p.price)}</s></span>
        <span class="r-card__btn">馬上買</span>
      </a>`;
      }).join('')}
    </div>
  </section>`;
  }

  return shell({ title: 'momo購物網 - 好評推薦 - 手機版', head: UTM_SCRIPT, body });
}
