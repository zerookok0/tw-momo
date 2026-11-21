/**
 * 手机版首页渲染（按目标站点 m.momoshop.com.tw 的结构排版）
 *
 * 依赖由 build-mobile.mjs 注入：header / tabbar / shell / mCard / ICO / UTM_SCRIPT
 */

const P = (code) => '/m/product/' + code;
const plat = (n) => '/m/category?cat=' + encodeURIComponent(n);

const ICONS = {
  coupon: '<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h13A2.5 2.5 0 0 1 21 8.5v1a2.5 2.5 0 0 0 0 5v1a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 15.5v-1a2.5 2.5 0 0 0 0-5v-1Z"/>',
  clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="m9 15 2 2 4-4"/>',
  bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
};

function ico(name) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + ICONS[name] + '</svg>';
}

export function renderHome(deps) {
  const { header, tabbar, shell, mCard, ICO, UTM_SCRIPT, catalog } = deps;

  const pick = (cat, n) => catalog.items.filter((x) => x.cat === cat && x.img).slice(0, n);
  const anyImg = (i) => {
    const all = catalog.items.filter((x) => x.img);
    return all[i] ? all[i].img : '';
  };
  const imgOf = (cat, i) => {
    const arr = pick(cat, i + 1);
    if (arr[i] && arr[i].img) return arr[i].img;
    return anyImg(i + 3);
  };

  const goodsSec = (title, cat, link) => {
    const items = pick(cat, 6);
    if (!items.length) return '';
    return [
      '<section class="m-sec">',
      '  <div class="m-sec__hd"><h2>' + title + '</h2>',
      '    <a class="more" href="' + link + '">看更多 ' + ICO.chev + '</a></div>',
      '  <div class="m-goods">' + items.map((p, k) => mCard(p, k)).join('') + '</div>',
      '</section>',
    ].join('\n');
  };

  const hotWords = ['iphone 17', '衛生紙', '行動電源', '除濕機', '面膜', '洗衣精', '空氣清淨機', '藍牙耳機'];

  const body = [
    header({ navCurrent: '首頁', cartCount: 3 }),

    // ── 双栏活动位：左 moPro，右 品牌聯盟 ──
    '<section class="m-duo">',
    '  <a class="m-duo__left" href="' + plat('保健/醫療') + '">',
    '    <div class="m-duo__brand">moPro</div>',
    '    <div class="m-duo__title">會員專屬價</div>',
    '    <div class="m-duo__sub">BRITA 濾芯 10 入</div>',
    '    <img src="' + imgOf('保健/醫療', 0) + '" alt="">',
    '    <div class="m-duo__price"><span class="m-duo__stamp">專屬價</span><b>$1,799</b><s>$3,558</s></div>',
    '  </a>',
    '  <div class="m-duo__right">',
    '    <div class="m-duo__rhd">品牌聯盟</div>',
    '    <div class="m-duo__grid">',
    '      <a href="' + plat('手機/相機') + '"><img src="' + imgOf('手機/相機', 0) + '" alt=""><span>iPhone<br>登記抽999</span></a>',
    '      <a href="' + plat('個人清潔') + '"><img src="' + imgOf('個人清潔', 0) + '" alt=""><span>高露潔<br>7折起</span></a>',
    '      <a href="' + plat('保健/醫療') + '"><img src="' + imgOf('保健/醫療', 1) + '" alt=""><span>好好生醫<br>滿額多重送</span></a>',
    '      <a href="' + plat('戶外') + '"><img src="' + imgOf('戶外', 0) + '" alt=""><span>TNF北面<br>全館5折up</span></a>',
    '    </div>',
    '  </div>',
    '</section>',

    // ── 22 限定價 圆形横滑 ──
    '<section class="m-limit">',
    '  <div class="m-limit__hd"><b>22</b><span>限定價</span><em>萬下殺</em></div>',
    '  <div class="m-limit__row">',
    '    <a href="' + plat('家具收納') + '"><i><img src="' + imgOf('家具收納', 0) + '" alt=""></i><b>家居生活</b><span>抽iPhone</span></a>',
    '    <a href="' + plat('旅遊/票券') + '"><i><img src="' + imgOf('旅遊/票券', 0) + '" alt=""></i><b>休閒旅遊</b><span>銅板價</span></a>',
    '    <a href="' + plat('母嬰/玩具') + '"><i><img src="' + imgOf('母嬰/玩具', 0) + '" alt=""></i><b>日用婦幼</b><span>抽iPhone</span></a>',
    '    <a href="' + plat('食品/飲料') + '"><i><img src="' + imgOf('食品/飲料', 0) + '" alt=""></i><b>熱銷爆品</b><span>抽年菜</span></a>',
    '    <a href="/m/category"><i><img src="' + imgOf('家電', 0) + '" alt=""></i><b>新品上市</b><span>搶先看</span></a>',
    '  </div>',
    '</section>',

    // ── 桃金日 整宽 ──
    '<a class="m-taojin" href="' + plat('家電') + '">',
    '  <div class="m-taojin__l"><b>moPro</b><span>專屬價48折</span></div>',
    '  <div class="m-taojin__c"><b>加碼送$1000</b><i>最後一天600</i></div>',
    '  <div class="m-taojin__r"><b>家電特賣</b><span>加碼送3150</span></div>',
    '</a>',

    // ── 訂閱 / 滿額送 两卡 ──
    '<section class="m-two">',
    '  <a href="/info/member-center"><b>訂閱moPro</b><span>直領<em>$1080</em></span></a>',
    '  <a href="' + plat('食品/飲料') + '"><b>滿額送</b><span>限量電子雞</span></a>',
    '</section>',

    // ── 图标行 ──
    '<nav class="m-ico-row">',
    '  <a href="/info/coupons"><span class="gi" style="color:#FF5A5F">' + ico('coupon') + '</span>領券</a>',
    '  <a href="/m/category"><span class="gi" style="color:#4C8DFF">' + ico('clock') + '</span>秒殺</a>',
    '  <a href="/info/member-center"><span class="gi" style="color:#FF8A3D">' + ico('cal') + '</span>簽到</a>',
    '  <a href="' + plat('家電') + '"><span class="gi" style="color:#FFC53D">' + ico('bolt') + '</span>限搶</a>',
    '  <a href="/m/category"><span class="gi" style="color:#8A8A8A">' + ico('search') + '</span>看更多</a>',
    '</nav>',

    goodsSec('限時搶購<span class="m-sec__count">02:07:03</span>', '家電', plat('家電')),
    goodsSec('11.11 降價好貨', '食品/飲料', plat('食品/飲料')),

    // ── 熱搜榜 ──
    '<section class="m-sec">',
    '  <div class="m-sec__hd"><h2>momo熱搜榜</h2><a class="more" href="/m/category">看全部 ' + ICO.chev + '</a></div>',
    '  <ol class="m-rank">',
    hotWords.map((k, i) => '    <li><span class="num">' + (i + 1) + '</span><a href="/m/category?kw=' + encodeURIComponent(k) + '">' + k + '</a><span class="hot">熱度' + (2736 - i * 397).toLocaleString('en-US') + '萬</span></li>').join('\n'),
    '  </ol>',
    '</section>',

    '<div class="m-safe"></div>',
    tabbar('首頁'),
  ].filter(Boolean).join('\n');

  return shell({ title: 'momo購物網 - 好評推薦 - 手機版', head: UTM_SCRIPT, body });
}
