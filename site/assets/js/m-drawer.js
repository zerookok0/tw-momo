/**
 * 手机版侧边菜单抽屉
 *   绑定所有 .r-hd__menu 的 <button>（返回箭头是 <a>，不受影响）
 *   点开后从左侧滑出分类列表 + 快捷入口
 */
(function () {
  'use strict';
  if (window.__M_DRAWER__) return;
  window.__M_DRAWER__ = true;

  var CATS = [
    ['家電', '家電'], ['電玩', '電玩'], ['手機/相機', '手機/相機'], ['電腦/組件', '電腦/組件'],
    ['3C週邊', '3C週邊'], ['保健/醫療', '保健/醫療'], ['食品/飲料', '食品/飲料'], ['生鮮', '生鮮'],
    ['女時尚', '女時尚'], ['男時尚', '男時尚'], ['精品/飾品', '精品/飾品'], ['彩妝保養', '彩妝保養'],
    ['個人清潔', '個人清潔'], ['日用/紙品', '日用/紙品'], ['母嬰/玩具', '母嬰/玩具'], ['餐廚', '餐廚'],
    ['家具收納', '家具收納'], ['修繕園藝', '修繕園藝'], ['傢飾寢具', '傢飾寢具'], ['寵物', '寵物'],
    ['運動/按摩', '運動/按摩'], ['戶外', '戶外'], ['車類', '車類'], ['圖書影音', '圖書影音'],
    ['文具樂器', '文具樂器'], ['藝術宗教', '藝術宗教'], ['旅遊/住宿', '旅遊/住宿'], ['票券', '票券'],
    ['加值/軟體', '加值/軟體'], ['綠色生活', '綠色生活'], ['生活超市', '生活超市'], ['跨境好物', '跨境好物']
  ];

  function build() {
    var mask = document.createElement('div');
    mask.className = 'm-drawer__mask';
    mask.setAttribute('aria-hidden', 'true');

    var panel = document.createElement('aside');
    panel.className = 'm-drawer';
    panel.setAttribute('aria-label', '分類選單');

    var head = '<div class="m-drawer__hd">' +
      '<span class="m-drawer__logo">momo</span>' +
      '<button type="button" class="m-drawer__close" aria-label="關閉">✕</button>' +
      '</div>';

    var quick = '<div class="m-drawer__quick">' +
      '<a href="/m/">首頁</a><a href="/m/category">限時搶購</a>' +
      '<a href="/m/category">mo店+</a><a href="/info/member-center">會員中心</a>' +
      '</div>';

    var list = '<div class="m-drawer__body"><div class="m-drawer__t">商品分類</div><ul class="m-drawer__list">';
    for (var i = 0; i < CATS.length; i++) {
      list += '<li><a href="/m/category?cat=' + encodeURIComponent(CATS[i][1]) + '">' + CATS[i][0] + '</a></li>';
    }
    list += '</ul></div>';

    var foot = '<div class="m-drawer__foot">' +
      '<a href="/info/coupons">折價券</a><a href="/info/orders">查訂單</a>' +
      '<a href="/info/wishlist">追蹤清單</a><a href="/info/faq">常見問題</a>' +
      '</div>';

    panel.innerHTML = head + quick + list + foot;
    document.body.appendChild(mask);
    document.body.appendChild(panel);

    // 按分类分组显示（两列）
    var ul = panel.querySelector('.m-drawer__list');
    ul.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:0 8px;list-style:none;margin:0;padding:0';

    return { mask: mask, panel: panel };
  }

  var el = null;
  function open() {
    if (!el) el = build();
    el.mask.classList.add('on');
    el.panel.classList.add('on');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    if (!el) return;
    el.mask.classList.remove('on');
    el.panel.classList.remove('on');
    document.body.style.overflow = '';
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    // 关闭
    if (el && (t === el.mask || (t.closest && t.closest('.m-drawer__close')))) { e.preventDefault(); close(); return; }
    // 打开：只认 <button class="r-hd__menu">
    var btn = t.closest ? t.closest('button.r-hd__menu') : null;
    if (btn) { e.preventDefault(); open(); }
  }, false);

  // 点抽屉里的链接后关闭
  document.addEventListener('click', function (e) {
    if (!el) return;
    var a = e.target.closest ? e.target.closest('.m-drawer a') : null;
    if (a) setTimeout(close, 80);
  }, false);

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();
