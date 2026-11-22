import fs from 'node:fs';
import { renderHome } from './mobile-home.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(__dirname, '..');
const SITE = path.join(PROJ, 'site');
const M = path.join(SITE, 'm');
const products = JSON.parse(fs.readFileSync(path.join(PROJ, '_ref', 'products.json'), 'utf8'));
import { salePrice, origPrice } from '../lib/pricing.mjs';
const DISTRICTS = JSON.parse(fs.readFileSync(path.join(PROJ, '_ref', 'tw-districts.json'), 'utf8'));

const fmt = (n) => '$' + Number(n).toLocaleString('en-US');
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const PLACEHOLDER = '/assets/img1.momoshop.com.tw/ecm/img/online/10/998/00/000/bt_0_245_01/bt_0_245_01_P1_1_e2.png';
const LOGO = '/m/assets/img/logo.svg';

// 真實 momo 行動版首頁 banner / 圖文樓層（bt_7_* 區塊，抓自線上 CDN）
const H = '/assets/img1.momoshop.com.tw/ecm/img/online/81/998/00/000/mobile';
const H2 = '/assets/img2.momoshop.com.tw/ecm/img/online/81/998/00/000/mobile';
const H3 = '/assets/img3.momoshop.com.tw/ecm/img/online/81/998/00/000/mobile';
const H4 = '/assets/img4.momoshop.com.tw/ecm/img/online/81/998/00/000/mobile';

const BANNERS = [
  `${H}/bt_7_701_01/bt_7_701_01_e101__fa96d9dc.jpg`,
  `${H}/bt_7_701_01/bt_7_701_01_e111__8f6330b9.png`,
  `${H}/bt_7_701_01/bt_7_701_01_e131__369c7d34.jpg`,
  `${H}/bt_7_701_01/bt_7_701_01_e141__3651db8c.jpg`,
  `${H}/bt_7_701_01/bt_7_701_01_e151__bef00ee4.jpg`,
];

// 圖文樓層：每層 4 格（2x2）
const FLOORS = [
  {
    title: '今日秒殺',
    layout: 'icons',
    imgs: [
      `${H}/bt_7_702_01/bt_7_702_01_e12__6139b1bd.png`,
      `${H}/bt_7_702_01/bt_7_702_01_e22__b2892286.png`,
      `${H}/bt_7_702_01/bt_7_702_01_e32__4b975509.png`,
      `${H}/bt_7_702_01/bt_7_702_01_e42__03f21f65.png`,
    ],
  },
  {
    title: '全站加碼',
    layout: 'cards',
    imgs: [
      `${H2}/bt_7_703_01/bt_7_703_01_e12__7e52c708.png`,
      `${H2}/bt_7_703_01/bt_7_703_01_e22__36f4b11e.png`,
      `${H2}/bt_7_703_01/bt_7_703_01_e32__b69f018a.png`,
      `${H2}/bt_7_703_01/bt_7_703_01_e42__1073ede9.png`,
    ],
  },
  {
    title: '品牌旗艦',
    layout: 'banner',
    imgs: [
      `${H}/bt_7_706_01/bt_7_706_01_e12__0ceceb37.png`,
      `${H}/bt_7_706_01/bt_7_706_01_e22__6699f862.jpg`,
      `${H}/bt_7_706_01/bt_7_706_01_e32__5f9bc7b2.png`,
      `${H}/bt_7_706_01/bt_7_706_01_e42__ce60a695.jpg`,
    ],
  },
  {
    title: '限時優惠',
    layout: 'cards',
    imgs: [
      `${H3}/bt_7_708_01/bt_7_708_01_e32__38067ac4.png`,
      `${H3}/bt_7_708_01/bt_7_708_01_e42__b67b890b.png`,
      `${H4}/bt_7_708_01/bt_7_708_01_e12__44b67a9a.png`,
      `${H2}/bt_7_708_02/bt_7_708_02_e12__6f444d92.png`,
    ],
  },
];

// ───────────────────────── 图标 ─────────────────────────
const ICO = {
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
  cart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2.2l2.1 11.2a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 7H6"/><circle cx="9.5" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4"/></svg>`,
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/></svg>`,
  grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.4"/></svg>`,
  store: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9"/><path d="M3 9l1.6-4.2A1 1 0 0 1 5.5 4h13a1 1 0 0 1 .9.8L21 9z"/><path d="M9 20v-5h6v5"/></svg>`,
  check: `<svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M4 12.5 9.5 18 20 6.5" stroke="#d62872" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  chev: `<svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

// ───────────────────────── head 公共 ─────────────────────────
const UTM_SCRIPT = `<script>
(function(){
  var K=['utm_source','utm_medium','utm_campaign','utm_term','utm_content',
         'utm_id','fbclid','ttclid','gclid','adset_id','campaign_id',
         'sub1','sub2','sub3','sub4','sub5'];
  function grab(q){var o={},p=(q||'').replace(/^\\?/,'').split('&');for(var i=0;i<p.length;i++){
    var kv=p[i].split('=');if(kv.length<2)continue;try{var k=decodeURIComponent(kv[0]);
    if(K.indexOf(k)!==-1)o[k]=decodeURIComponent(kv.slice(1).join('='));}catch(e){}}return o;}
  function load(){try{return JSON.parse(sessionStorage.getItem('bp_utm')||'{}')}catch(e){return {}}}
  function save(o){try{sessionStorage.setItem('bp_utm',JSON.stringify(o))}catch(e){}
    try{var d=new Date();d.setTime(d.getTime()+7*864e5);
    document.cookie='bp_utm='+encodeURIComponent(JSON.stringify(o))+'; expires='+d.toUTCString()+'; path=/; SameSite=Lax';}catch(e){}}
  var cur=load(),add=false;
  var m=grab(location.search); for(var a in m){cur[a]=m[a];add=true}
  try{var n=performance.getEntriesByType&&performance.getEntriesByType('navigation')[0];
    if(n&&n.name){var mm=grab(n.name.split('?')[1]||'');for(var b in mm){cur[b]=mm[b];add=true}}}catch(e){}
  try{if(document.referrer){var mm2=grab((document.referrer.split('?')[1])||'');
    for(var c in mm2){if(!cur[c]){cur[c]=mm2[c];add=true}}}}catch(e){}
  if(add)save(cur);
  window.__BP_UTM__=cur;
})();
</script>`;

const CART_SKELETON = `<script>
  window.__BP_CART__ = {
    order_number: "", currency: "", total: 0, total_amount: "",
    items: [], locale: document.documentElement.lang || "en"
  };
</script>
<!-- 从购物车页带过来的真实商品，覆写骨架（否则会显示服务端兜底购物车） -->
<script>
(function(){
  try {
    var raw = sessionStorage.getItem('momo_checkout_cart');
    if (!raw) return;
    var c = JSON.parse(raw);
    if (!c || !c.items || !c.items.length) return;
    var b = window.__BP_CART__;
    b.items = c.items;
    b.total = c.total;
    b.total_amount = c.total_amount;
      var b = window.__BP_CART__;
      b.items = c.items;
      b.total = c.total;
      b.total_amount = c.total_amount;
      b.currency = 'TWD';
      b.locale = document.documentElement.lang || 'zh-TW';
      // 每笔结账生成独立单号，避免多笔订单撞同一个号（契约：单号复用，提交后不换）
      if (!b.order_number) {
        var d = new Date();
        var pad = function (n) { return String(n).padStart(2, '0'); };
        var rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
        b.order_number = 'ORD-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + rnd;
      }
  } catch (e) {}
})();
</script>`;

function shell({ title, head = '', bodyClass = 'm', body, extraHead = '' }) {
  return `<!doctype html>
<html lang="zh-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1">
<meta name="format-detection" content="telephone=no">
<meta name="theme-color" content="#d62872">
<title>${title}</title>
${head}
<link rel="stylesheet" href="/assets/image.momoshop.com.tw/ecm/font/theme-main.css">
<link rel="stylesheet" href="/m/assets/css/momo-mobile.css">
<link rel="stylesheet" href="/m/assets/css/mobile-home.css">
${extraHead}
</head>
<body class="${bodyClass}">
${body}
</body>
</html>`;
}

// ───────────────────────── header ─────────────────────────
const C = (n) => '/m/category?cat=' + encodeURIComponent(n);
const NAV = [
  { t: '首頁', href: '/m/', cur: true },
  { t: '限時搶購', href: '/m/category' },
  { t: 'mo店+', href: '/m/category' },
  { t: '品牌旗艦', href: C('精品/飾品') },
  { t: '3C', href: C('3C週邊') },
  { t: '家電', href: C('家電') },
  { t: '美粧', href: C('彩妝保養') },
  { t: '保健', href: C('保健/醫療') },
  { t: '食品', href: C('食品/飲料') },
  { t: '運動', href: C('運動/按摩') },
  { t: '親子', href: C('母嬰/玩具') },
  { t: '男裝', href: C('男時尚') },
  { t: '女裝', href: C('女時尚') },
];

function header({ navCurrent = '首頁', showNav = true, showSearch = true, cartCount = 0 } = {}) {
  return `
<header class="m-header">
  <div class="m-header__bar">
    <button class="m-header__ico" type="button" aria-label="選單">${ICO.menu}</button>
    <a class="m-header__logo" href="/m/">
      <img src="${LOGO}" alt="momo購物網" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <span class="m-header__slogan" style="display:none"><b style="font-size:15px;color:#d62872">momo</b><br>桃金日 就在每月22號</span>
    </a>
    <span class="m-header__slogan">桃金日<br>就在每月22號</span>
    <a class="m-header__ico m-header__cart" href="/m/cart" aria-label="購物車">
      ${ICO.cart}
      ${cartCount ? `<i class="m-header__badge">${cartCount > 99 ? '99+' : cartCount}</i>` : ''}
    </a>
  </div>
  ${showSearch ? `
  <div class="m-search">
    <form class="m-search__box" onsubmit="event.preventDefault();location.href='/m/category?kw='+encodeURIComponent(this.q.value)">
      <input name="q" type="search" placeholder="除濕機" aria-label="搜尋">
      <button class="m-search__btn" type="submit">搜尋</button>
    </form>
    <div class="m-search__hot">
      <b>猜你想搜</b>
      <span>雨傘王防曬傘</span><span>NIKE 童 學步鞋</span><span>酪梨油 3入</span>
    </div>
  </div>` : ''}
  ${showNav ? `
  <nav class="m-nav">
    ${NAV.map((n) => `<a href="${n.href}"${n.t === navCurrent ? ' aria-current="page"' : ''}>${n.t}</a>`).join('')}
  </nav>` : ''}
</header>`;
}

function tabbar(current = '首頁') {
  const items = [
    { t: '首頁', href: '/m/', ico: ICO.home },
    { t: '分類', href: '/m/category', ico: ICO.grid },
    { t: '限時搶購', href: '/m/category', ico: ICO.store },
    { t: '購物車', href: '/m/cart', ico: ICO.cart },
    { t: '會員', href: '/info/member-center', ico: ICO.user },
  ];
  return `
<nav class="m-tabbar">
  ${items.map((i) => `<a href="${i.href}"${i.t === current ? ' aria-current="page"' : ''}>${i.ico}<span>${i.t}</span></a>`).join('')}
</nav>`;
}

/* ── 手机版统一外壳（与首页 r-* 一致） ── */
function rHeader({ back = false, cartCount = 3, showSearch = false, title = '' } = {}) {
  const left = back
    ? '<a class="r-hd__menu" href="/m/" aria-label="返回"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg></a>'
    : '<button class="r-hd__menu" type="button" aria-label="選單"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>';
  const mid = title
    ? '<span class="r-hd__title">' + title + '</span>'
    : '<span class="r-hd__tag">新品<em>🔥</em></span>' +
      '<form class="r-hd__search" onsubmit="event.preventDefault();location.href=\'/m/category?kw=\'+encodeURIComponent(this.q.value)"><input name="q" type="search" placeholder="除濕機" aria-label="搜尋"></form>';
  return `
<header class="r-hd">
  ${left}
  ${mid}
  <a class="r-hd__ico" href="/m/cart" aria-label="購物車">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h2l2.2 10.2a1 1 0 0 0 1 .8h8.4a1 1 0 0 0 1-.8L19.5 8H6"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></svg>
    ${cartCount ? '<i class="r-hd__badge">' + cartCount + '</i>' : ''}
  </a>
</header>`;
}

function rTabbar(current = '首頁') {
  const items = [
    { t: '首頁', href: '/m/', ico: ICO.home },
    { t: '逛逛', href: '/m/category', ico: ICO.grid },
    { t: '追蹤清單', href: '/m/info/wishlist', ico: 'h' },
    { t: '購物車', href: '/m/cart', ico: ICO.cart },
    { t: '會員中心', href: '/m/info/member-center', ico: ICO.user },
  ];
  const heartSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.6-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.8C19 15.4 12 20 12 20Z"/></svg>';
  return '<nav class="r-tab">' + items.map((i) => {
    const ico = i.ico === 'h' ? heartSvg : i.ico;
    return `<a href="${i.href}"${i.t === current ? ' class="on"' : ''}>${ico}<span>${i.t}</span></a>`;
  }).join('') + '</nav>';
}

const crumb = (items) => `
<nav class="m-crumb">
  ${items.map((i, idx) => `${idx ? '<span>/</span>' : ''}<span>${i.href ? `<a href="${i.href}">${i.t}</a>` : i.t}</span>`).join('')}
</nav>`;

// ───────────────────────── 商品卡 ─────────────────────────
function card(p, i = 0) {
  const tags = ['今日限定', '滿額登記', '爆殺', '免運', '獨家'];
  return `
  <a class="m-card" href="/m/product/${p.code}">
    <div class="m-card__img">
      <img src="${p.img || PLACEHOLDER}" alt="${esc((p.name || p.texts[0]))}" loading="lazy">
      <span class="m-card__tag">${tags[i % tags.length]}</span>
    </div>
    <div class="m-card__body">
      <p class="m-card__name">${esc((p.name || p.texts[0]) || '')}</p>
      <div class="m-card__price">
        <span class="now"><small>$</small>${salePrice(p).toLocaleString('en-US')}</span>
        <span class="was">$${origPrice(p).toLocaleString('en-US')}</span>
      </div>
      <div class="m-card__meta"><span>已售 ${(i * 37 + 54) % 900 + 20} 組</span><i class="dot"></i><span>滿$490免運</span></div>
      <div class="m-card__buy">馬上買</div>
    </div>
  </a>`;
}

const GRID_NAV = [
  { t: '領券', href: '/info/coupons', ico: '<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h13A2.5 2.5 0 0 1 21 8.5v1a2.5 2.5 0 0 0 0 5v1a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 15.5v-1a2.5 2.5 0 0 0 0-5v-1Z"/><path d="M9 6v12" stroke-dasharray="2 2"/>', c: '#FF5A5F' },
  { t: '簽到', href: '/info/member-center', ico: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="m9 15 2 2 4-4"/>', c: '#FF8A3D' },
  { t: '必買', href: '/m/category?cat=' + encodeURIComponent('食品/飲料'), ico: '<path d="M6 7h12l-1 13H7L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/>', c: '#E8447A' },
  { t: '限搶', href: '/m/category?cat=' + encodeURIComponent('家電'), ico: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/>', c: '#FFC53D' },
  { t: '秒殺', href: '/m/category', ico: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>', c: '#4C8DFF' },
  { t: 'mo店+', href: '/m/category', ico: '<path d="M4 9h16l-1.2 11H5.2L4 9Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/>', c: '#7B61FF' },
  { t: '今日特賣', href: '/m/category', ico: '<path d="M12 3l2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8L12 3Z"/>', c: '#FF5A5F' },
  { t: '品牌', href: '/m/category?cat=' + encodeURIComponent('精品/飾品'), ico: '<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5 7 22l5-2.5L17 22l-1.5-8.5"/>', c: '#FFA53D' },
  { t: '折價券', href: '/info/coupons', ico: '<path d="M4 7h16v4a2 2 0 0 0 0 4v2H4v-2a2 2 0 0 0 0-4V7Z"/><path d="M12 8v8" stroke-dasharray="2 2"/>', c: '#E8447A' },
  { t: '更多', href: '/m/category', ico: '<circle cx="6" cy="6" r="1.6"/><circle cx="12" cy="6" r="1.6"/><circle cx="18" cy="6" r="1.6"/><circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/><circle cx="6" cy="18" r="1.6"/><circle cx="12" cy="18" r="1.6"/><circle cx="18" cy="18" r="1.6"/>', c: '#8A8A8A' },
];

const gridNavHTML = () => GRID_NAV.map(function (g) {
  return '<a href="' + g.href + '">' +
    '<span class="gi" style="color:' + g.c + '">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + g.ico + '</svg>' +
    '</span>' + g.t + '</a>';
}).join('');

// ───────────────────────── 首页 ─────────────────────────
function homePage() {
  return renderHome({
    header, tabbar, shell, mCard: card, ICO, UTM_SCRIPT,
    catalog: JSON.parse(fs.readFileSync(path.join(PROJ, 'site', 'data', 'catalog.json'), 'utf8')),
  });
}

// ───────────────────────── 分类页 ─────────────────────────
function categoryPage() {
  const body = `
${header({ navCurrent: '首頁', showSearch: true, cartCount: 3 })}
${crumb([{ t: '首頁', href: '/m/' }, { t: '全部商品' }])}
<section class="m-sec" style="margin-top:0">
  <div class="m-sec__hd">
    <h2>全部商品</h2>
    <span class="more">共 ${products.length} 件</span>
  </div>
  <div class="m-goods">
    ${products.map((p, i) => card(p, i)).join('')}
  </div>
</section>
<div class="m-safe"></div>
${tabbar('分類')}`;
  return shell({ title: '商品分類 - momo購物網', head: UTM_SCRIPT, body });
}

// ───────────────────────── 商品详情 ─────────────────────────
function productPage(p) {
  const name = (p.name || p.texts[0]) || 'momo 嚴選商品';
  const price = salePrice(p) || 495;
  const was = origPrice(p);
  const img = p.img || PLACEHOLDER;
  const body = `
${rHeader({ back: true, cartCount: 3 })}
${crumb([{ t: '首頁', href: '/m/' }, { t: '商品分類', href: '/m/category' }, { t: name }])}

<section class="m-pdp__hero">
  <img id="pdpImg" src="${img}" alt="${esc(name)}">
  <div class="m-pdp__dots">${[0, 1, 2, 3].map((i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('')}</div>
</section>

<div class="m-pdp__price">
  <div class="m-pdp__flags"><span>momo嚴選</span><span>今日限定</span><span>滿額登記送mo幣</span></div>
  <div class="row">
    <span class="now"><small>$</small>${Number(price).toLocaleString('en-US')}</span>
    <span class="was">$${was.toLocaleString('en-US')}</span>
    <span class="off">${Math.round((1 - price / was) * 100)}% OFF</span>
  </div>
</div>

<h1 class="m-pdp__title"><span class="tag">旗艦</span>${esc(name)}</h1>

<div class="m-row">
  <span class="m-row__k">數量</span>
  <span class="m-row__v">
    <span class="m-qty">
      <button type="button" data-q="-1">−</button>
      <input id="pdpQty" value="1" inputmode="numeric" aria-label="數量">
      <button type="button" data-q="1">+</button>
    </span>
  </span>
</div>
<div class="m-row">
  <span class="m-row__k">配送</span>
  <span class="m-row__v">賣家宅配／超商取貨　<span style="color:#d62872">滿 $490 免運</span></span>
  <span class="m-row__arrow">${ICO.chev}</span>
</div>
<div class="m-row">
  <span class="m-row__k">優惠</span>
  <span class="m-row__v" style="color:#d62872">滿 $1,500 送 $100 折價券</span>
  <span class="m-row__arrow">${ICO.chev}</span>
</div>

<section class="m-detail">
  <h3>商品詳情</h3>
  <p>${esc(name)}，momo 購物網正式授權經銷，商品皆為台灣公司貨，享原廠保固與售後服務。</p>
  <h3>商品規格</h3>
  <table class="spec">
    <tr><th>商品編號</th><td>${p.code}</td></tr>
    <tr><th>原價</th><td><s>${fmt(was)}</s></td></tr>
    <tr><th>5 折價</th><td style="color:#d62872;font-weight:700">${fmt(price)}</td></tr>
    <tr><th>產地</th><td>依原廠標示</td></tr>
    <tr><th>保固</th><td>原廠保固（非人為損壞）</td></tr>
    <tr><th>退換貨</th><td>10 天猶豫期，商品需完整包裝</td></tr>
  </table>
</section>

<div class="m-safe" style="height:72px"></div>

<div class="m-buybar">
  <a class="ico" href="/m/cart">${ICO.cart}<span>購物車</span></a>
  <div class="btns">
    <button type="button" class="cart" id="btnAdd">加入購物車</button>
    <button type="button" class="buy" id="btnBuy">立即購買</button>
  </div>
</div>

<div class="m-toast" id="toast"></div>

<script>
(function(){
  var price = ${price}, code = ${JSON.stringify(p.code)}, name = ${JSON.stringify(name)}, img = ${JSON.stringify(img)};
  var qty = document.getElementById('pdpQty');
  document.querySelectorAll('[data-q]').forEach(function(b){
    b.addEventListener('click', function(){
      qty.value = Math.max(1, Math.min(99, (parseInt(qty.value,10)||1) + Number(b.dataset.q)));
    });
  });
  qty.addEventListener('input', function(){ qty.value = qty.value.replace(/[^0-9]/g,''); });

  var KEY = 'momo_cart';
  function read(){ try { return JSON.parse(localStorage.getItem(KEY)||'[]'); } catch(e){ return []; } }
  function write(v){ try { localStorage.setItem(KEY, JSON.stringify(v)); } catch(e){} }
  function toast(t){
    var el = document.getElementById('toast');
    el.textContent = t; el.classList.add('on');
    clearTimeout(toast._t); toast._t = setTimeout(function(){ el.classList.remove('on'); }, 1600);
  }
  function add(){
    var n = Math.max(1, parseInt(qty.value,10)||1);
    var cart = read();
    var hit = cart.filter(function(i){ return i.code === code; })[0];
    if (hit) hit.qty += n; else cart.push({ code: code, name: name, price: price, qty: n, img: img });
    write(cart);
    return n;
  }
  document.getElementById('btnAdd').addEventListener('click', function(){ toast('已加入 ' + add() + ' 件'); });
  document.getElementById('btnBuy').addEventListener('click', function(){ add(); location.href = '/m/cart'; });
})();
</script>`;
  return shell({ title: `${esc(name)} - momo購物網`, head: UTM_SCRIPT, body });
}

// ───────────────────────── 购物车 ─────────────────────────
function cartPage() {
  const seed = products.slice(0, 3).map((p) => ({ code: p.code, name: (p.name || p.texts[0]), price: salePrice(p), qty: 1, img: p.img }));
  const body = `
${rHeader({ back: true, cartCount: 3 })}
${crumb([{ t: '首頁', href: '/m/' }, { t: '購物車' }])}

<div class="m-cart-hd">
  <label><input type="checkbox" id="checkAll" checked><span>全選</span></label>
  <span class="edit">編輯</span>
</div>

<div class="m-cart-shop">${ICO.store}<span>momo 直營　滿 $490 免運</span></div>

<div id="cartList"></div>
<div class="m-cart-empty" id="cartEmpty" style="display:none">購物車是空的，<a href="/m/">去逛逛</a></div>

<div class="m-safe" style="height:72px"></div>

<div class="m-cobar">
  <div class="m-cobar__amt">
    <span class="lb">合計 <span id="cartCount">0</span> 件</span>
    <span class="vl" id="cartTotal">$0</span>
  </div>
  <button type="button" id="goCheckout" style="flex:1;max-width:190px;height:42px;border-radius:21px;background:#d62872;color:#fff;font-size:15px;font-weight:700">前往結帳</button>
</div>

<script>
(function(){
  var KEY = 'momo_cart';
  var SEED = ${JSON.stringify(seed)};
  function read(){
    try { var v = JSON.parse(localStorage.getItem(KEY)||'null'); if (!v || !v.length) { localStorage.setItem(KEY, JSON.stringify(SEED)); return SEED.slice(); } return v; }
    catch(e){ return SEED.slice(); }
  }
  function write(v){ try { localStorage.setItem(KEY, JSON.stringify(v)); } catch(e){} }
  var fmt = function(n){ return '$' + Number(n).toLocaleString('en-US'); };

  function render(){
    var cart = read(), list = document.getElementById('cartList'), total = 0, count = 0;
    list.innerHTML = '';
    document.getElementById('cartEmpty').style.display = cart.length ? 'none' : 'block';
    cart.forEach(function(it, i){
      total += it.price * it.qty; count += it.qty;
      var d = document.createElement('div');
      d.className = 'm-cart-item';
      d.innerHTML =
        '<div class="m-cart-item__chk"><input type="checkbox" checked></div>' +
        '<div class="m-cart-item__img">' + (it.img ? '<img src="' + it.img + '" alt="">' : '<span class="cart-item__ph"></span>') + '</div>' +
        '<div class="m-cart-item__info">' +
          '<a class="m-cart-item__name" href="/m/product/' + it.code + '">' + it.name + '</a>' +
          '<span class="m-cart-item__spec">標準規格 ' + ICO_CHEV + '</span>' +
          '<div class="m-cart-item__btm">' +
            '<span class="m-cart-item__price">' + fmt(it.price) + '</span>' +
            '<span class="m-qty">' +
              '<button type="button" data-a="dec" data-i="' + i + '">−</button>' +
              '<input value="' + it.qty + '" readonly>' +
              '<button type="button" data-a="inc" data-i="' + i + '">+</button>' +
            '</span>' +
          '</div>' +
        '</div>';
      list.appendChild(d);
    });
    document.getElementById('cartTotal').textContent = fmt(total);
    document.getElementById('cartCount').textContent = count;
  }
  var ICO_CHEV = ${JSON.stringify(ICO.chev)};

  document.getElementById('cartList').addEventListener('click', function(e){
    var b = e.target.closest('[data-a]');
    if (!b) return;
    var cart = read(), i = Number(b.dataset.i);
    if (b.dataset.a === 'inc') cart[i].qty = Math.min(99, cart[i].qty + 1);
    if (b.dataset.a === 'dec') cart[i].qty = Math.max(1, cart[i].qty - 1);
    write(cart); render();
  });

  document.getElementById('goCheckout').addEventListener('click', function(){
    var cart = read();
    var total = cart.reduce(function(s, i){ return s + i.price * i.qty; }, 0);
    try { sessionStorage.setItem('momo_checkout_cart', JSON.stringify({ items: cart, total: total, total_amount: fmt(total) })); } catch(e){}
    location.href = '/m/checkout';
  });

  render();
})();
</script>`;
  return shell({ title: '購物車 - momo購物網', head: UTM_SCRIPT, body: body, bodyClass: 'm has-bottombar' });
}

// ───────────────────────── 结算页（访客 + 契约） ─────────────────────────
function checkoutPage() {
  const head = `${UTM_SCRIPT}
${CART_SKELETON}
<link rel="stylesheet" href="/bp/connector.css">
<script src="/bp/fb-pixel.js"></script>
<script defer src="/bp/connector.js"></script>`;

  const cityOptions = Object.keys(DISTRICTS).map((c) => `<option value="${c}">${c}</option>`).join('');

  const body = `
${rHeader({ back: true, cartCount: 3 })}
${crumb([{ t: '購物車', href: '/m/cart' }, { t: '結帳' }])}

<div class="m-guest-tabs">
  <button type="button" aria-selected="true" id="tabGuest">訪客結帳（免登入）</button>
  <button type="button" aria-selected="false">會員登入</button>
</div>

<div class="m-guest-note">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d62872" stroke-width="2" style="flex:none;margin-top:2px"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1" stroke-linecap="round"/></svg>
  <span>本次為<strong>訪客結帳</strong>，不需要加入會員。填寫收件資料即可完成訂購，之後可用同一個 Email 查詢訂單。</span>
</div>

<form id="bp-form" novalidate autocomplete="on">

  <!-- ① 收件資訊 -->
  <section class="m-co-sec">
    <div class="m-co-sec__hd"><h2>收件資訊</h2></div>
    <div class="m-co-sec__bd">
      <div class="m-co-row">
        <label for="t-name">收件人<span class="req">*</span></label>
        <input id="t-name" name="name" autocomplete="name" placeholder="請填寫真實姓名">
      </div>
      <div class="m-co-row">
        <label for="t-phone">手機號碼<span class="req">*</span></label>
        <input id="t-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" maxlength="10" placeholder="09xxxxxxxx">
      </div>
      <div class="m-co-row">
        <label for="t-email">電子郵件<span class="req">*</span></label>
        <input id="t-email" name="email" type="email" autocomplete="email" placeholder="order@example.com">
      </div>
      <div class="m-co-row">
        <label for="t-city">縣市<span class="req">*</span></label>
        <select id="t-city" name="city" autocomplete="address-level1">${cityOptions}</select>
      </div>
      <div class="m-co-row">
        <label for="t-district">鄉鎮區<span class="req">*</span></label>
        <select id="t-district" name="district" autocomplete="address-level2"></select>
      </div>
      <div class="m-co-row">
        <label for="t-zip">郵遞區號</label>
        <input id="t-zip" name="zip" inputmode="numeric" autocomplete="postal-code" maxlength="6" placeholder="110">
      </div>
      <div class="m-co-row m-co-row--stack">
        <label for="t-addr">詳細地址<span class="req">*</span></label>
        <input id="t-addr" name="addr" autocomplete="address-line1" placeholder="路名、段、巷、弄、號、樓">
      </div>
      <input type="hidden" id="t-country" name="country" value="TW">
    </div>
  </section>

  <!-- ② 配送方式 -->
  <section class="m-co-sec">
    <div class="m-co-sec__hd"><h2>配送方式</h2></div>
    <div class="m-paylist">
      <label class="m-pay">
        <input type="radio" name="ship" value="home" checked>
        <span class="nm">賣家宅配<span class="sub">1–3 個工作日到貨</span></span>
        <span class="icons">免運</span>
      </label>
      <label class="m-pay">
        <input type="radio" name="ship" value="cvs">
        <span class="nm">超商取貨<span class="sub">7-11／全家／萊爾富／OK</span></span>
        <span class="icons" style="color:#d62872;font-size:12px">運費 $60</span>
      </label>
    </div>
    <div class="m-store" id="storeRow" style="display:none">
      <span class="nm" id="storeName">尚未選擇取貨門市</span>
      <button type="button" id="pickStore">選擇門市</button>
    </div>
  </section>

  <!-- ③ 付款方式 -->
  <section class="m-co-sec">
    <div class="m-co-sec__hd"><h2>付款方式</h2></div>
    <div class="m-paylist">
      <label class="m-pay">
        <input type="radio" name="pay" value="card" checked>
        <span class="nm">信用卡一次付清</span>
        <span class="icons">
          <img src="/bp/3ds/img/visa.svg" alt="Visa">
          <img src="/bp/3ds/img/mastercard.svg" alt="Mastercard">
        </span>
      </label>
      <label class="m-pay">
        <input type="radio" name="pay" value="atm">
        <span class="nm">ATM 轉帳<span class="sub">訂單金額 $5,000（含）以下</span></span>
      </label>
      <label class="m-pay">
        <input type="radio" name="pay" value="cvs">
        <span class="nm">超商取貨付款<span class="sub">到店取貨時付款</span></span>
      </label>
      <label class="m-pay">
        <input type="radio" name="pay" value="linepay">
        <span class="nm">LINE Pay<span class="sub">回饋最高 5%</span></span>
      </label>
    </div>

    <!-- 卡片三字段：🔴 首屏就在 DOM 里，不做两步流程（契约 4.2） -->
    <div class="m-cardfields bp-card-fields" id="cardFields">
      <label class="f">
        <span>卡號 <i style="color:#dd2726">*</i></span>
        <input id="bp-card-number" name="card-number" type="text" inputmode="numeric"
               autocomplete="cc-number" maxlength="23" placeholder="1234 5678 9012 3456">
      </label>
      <div class="row2">
        <label class="f">
          <span>有效期限 <i style="color:#dd2726">*</i></span>
          <input id="bp-card-expiry" name="card-expiry" type="text" inputmode="numeric"
                 autocomplete="cc-exp" maxlength="7" placeholder="MM/YY">
        </label>
        <label class="f">
          <span>安全碼 <i style="color:#dd2726">*</i></span>
          <input id="bp-card-cvc" name="card-cvc" type="text" inputmode="numeric"
                 autocomplete="cc-csc" maxlength="4" placeholder="CVC">
        </label>
      </div>
    </div>

    <div id="bp-error" role="alert" aria-live="polite"></div>
  </section>

  <!-- ④ 發票 -->
  <section class="m-co-sec">
    <div class="m-co-sec__hd"><h2>發票</h2></div>
    <div class="m-paylist">
      <label class="m-pay">
        <input type="radio" name="inv" value="cloud" checked>
        <span class="nm">手機條碼載具<span class="sub">電子發票，自動對獎</span></span>
      </label>
      <label class="m-pay">
        <input type="radio" name="inv" value="member">
        <span class="nm">momo 會員載具</span>
      </label>
      <label class="m-pay">
        <input type="radio" name="inv" value="paper">
        <span class="nm">紙本發票</span>
      </label>
    </div>
    <div class="m-co-row" id="invRow" style="padding:9px 12px 14px">
      <label for="t-inv">載具編號</label>
      <input id="t-inv" name="inv" placeholder="/AB12345" maxlength="16">
    </div>
  </section>

  <!-- ⑤ 訂單明細 -->
  <section class="m-co-sec">
    <div class="m-co-sec__hd"><h2>訂單明細</h2><span class="hint" id="orderNoHint">—</span></div>
    <div class="m-ordersum">
      <div id="orderItems"></div>
      <div class="m-ordersum__line"><span>商品小計</span><strong id="sumSubtotal">$0</strong></div>
      <div class="m-ordersum__line"><span>運費</span><strong id="sumShip">$0</strong></div>
      <div class="m-ordersum__line"><span>折扣</span><strong>-$0</strong></div>
      <div class="m-ordersum__line m-ordersum__line--tot">
        <span>應付總額</span>
        <strong id="bp-total" data-amount="0" data-currency="TWD">$0</strong>
      </div>
    </div>
  </section>

  <div style="padding:12px;font-size:11.5px;color:#999;line-height:1.7">
    點擊「確認付款」即表示同意 momo 購物網《服務條款》與《隱私權政策》。<br>
    本筆交易採用 256-bit SSL 加密傳輸，卡片資料不會儲存於本站。
  </div>
</form>

<div class="m-safe" style="height:72px"></div>

<div class="m-cobar">
  <div class="m-cobar__amt">
    <span class="lb">合計</span>
    <span class="vl" id="barTotal">$0</span>
  </div>
  <button id="bp-submit" type="submit" form="bp-form">確認付款</button>
</div>

<div class="m-toast" id="toast"></div>

<script>
(function(){
  var D = ${JSON.stringify(DISTRICTS)};
  var city = document.getElementById('t-city');
  var dist = document.getElementById('t-district');

  function fillDistricts(){
    var list = D[city.value] || [];
    dist.innerHTML = list.map(function(d){ return '<option value="' + d + '">' + d + '</option>'; }).join('');
  }
  city.addEventListener('change', fillDistricts);
  fillDistricts();

  // 配送方式 → 门市选择
  document.querySelectorAll('input[name="ship"]').forEach(function(r){
    r.addEventListener('change', function(){
      document.getElementById('storeRow').style.display = r.value === 'cvs' ? 'flex' : 'none';
    });
  });

  // 门市选择（弹层简化版）
  var STORES = ['7-11 台北信義門市', '7-11 台大醫院門市', '全家 忠孝延吉店', '全家 松山文創店', '萊爾富 北市信義店', 'OK 超商 信義松德店'];
  document.getElementById('pickStore').addEventListener('click', function(){
    var pick = prompt('請輸入門市名稱或選擇編號（1-' + STORES.length + '）\\n' + STORES.map(function(s, i){ return (i+1) + '. ' + s; }).join('\\n'));
    if (!pick) return;
    var n = parseInt(pick, 10);
    var name = n >= 1 && n <= STORES.length ? STORES[n - 1] : pick;
    document.getElementById('storeName').textContent = name;
  });

  // 發票载具
  document.querySelectorAll('input[name="inv"]').forEach(function(r){
    r.addEventListener('change', function(){
      document.getElementById('invRow').style.display = r.value === 'cloud' ? 'flex' : 'none';
    });
  });

  // 付款方式 → 卡片区显隐（不做两步流程，仅切换视觉）
  document.querySelectorAll('input[name="pay"]').forEach(function(r){
    r.addEventListener('change', function(){
      document.getElementById('cardFields').style.display = r.value === 'card' ? 'grid' : 'none';
    });
  });

  // 手机号只允许数字
  var phone = document.getElementById('t-phone');
  phone.addEventListener('input', function(){ phone.value = phone.value.replace(/[^0-9]/g, '').slice(0, 10); });

  function toast(t){
    var el = document.getElementById('toast');
    el.textContent = t; el.classList.add('on');
    clearTimeout(toast._t); toast._t = setTimeout(function(){ el.classList.remove('on'); }, 1800);
  }


  // 兜底：connector 事件要是没来（或先于监听触发），直接拉一次购物车数据
  function applyCart(c) {
    if (!c) return;
    var sub = document.getElementById('sumSubtotal');
    if (sub) sub.textContent = c.total_amount || '$0';
    var bar = document.getElementById('barTotal');
    if (bar) bar.textContent = c.total_amount || '$0';
    var no = document.getElementById('orderNoHint');
    if (no) no.textContent = c.order_number || '—';
    var tot = document.getElementById('bp-total');
    if (tot) {
      tot.textContent = c.total_amount || '$0';
      tot.setAttribute('data-amount', String(c.total || 0));
    }
    var box = document.getElementById('orderItems');
    if (box) {
      box.innerHTML = (c.items || []).map(function(it){
        return '<div class="m-ordersum__item">' +
          '<div class="th">' + (it.img ? '<img src="' + it.img + '" alt="">' : '<span class="cart-item__ph"></span>') + '</div>' +
          '<div class="nm">' + (it.name || '') + '</div>' +
          '<div class="qt">x' + (it.qty || 1) + '</div>' +
        '</div>';
      }).join('');
    }
    var cc = document.getElementById('cartCount');
    if (cc) cc.textContent = (c.items || []).reduce(function(a, b){ return a + (b.qty || 1); }, 0);
  }
  applyCart.__ready = true;

  // 优先用本地购物车（与 /m/cart 同一份 localStorage），保证「购物车看到的金额 = 结账金额」
  function fromLocal() {
    var list = [];
    try { list = JSON.parse(localStorage.getItem('momo_cart') || '[]'); } catch (e) {}
    if (!list.length) return null;
    var total = list.reduce(function (a, b) { return a + Number(b.price || 0) * Number(b.qty || 1); }, 0);
    return {
      items: list.map(function (i) { return { name: i.name, price: i.price, qty: i.qty || 1, img: i.img }; }),
      total: total,
      total_amount: '$' + total.toLocaleString('en-US'),
      order_number: '',
    };
  }

  var localCart = fromLocal();
  if (localCart) {
    applyCart(localCart);
    fetch('/api/cart', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var no = document.getElementById('orderNoHint');
        if (no && j) no.textContent = j.order_number || '—';
      })
      .catch(function () {});
  } else {
    fetch('/api/cart', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(applyCart)
      .catch(function () {});
  }

  // 订单摘要：connector 会用 /api/cart 覆盖 #bp-total，
  // 只要有本地购物车，就以本地为准（保证与 /m/cart 金额一致）
  function reassertLocal(extra) {
    if (!localCart) return;
    var merged = Object.assign({}, localCart);
    if (extra && extra.order_number) merged.order_number = extra.order_number;
    applyCart(merged);
  }
  document.addEventListener('bp:cart-applied', function (e) {
    var d = e.detail || {};
    if (localCart) {
      reassertLocal(d);
      return;
    }
    applyCart(d);
  });
  // connector 的 fetch 可能在事件之后才回来，补两次兜底
  setTimeout(function () { reassertLocal(); }, 1200);
  setTimeout(function () { reassertLocal(); }, 3000);

  // 表单提交交给 connector；这里只做兜底提示
  document.getElementById('bp-form').addEventListener('submit', function(ev){
    if (!window.BP) { ev.preventDefault(); toast('結帳模組載入中，請稍候'); }
  });
})();
</script>`;
  return shell({ title: '結帳 - momo購物網', head, body, bodyClass: 'm has-bottombar' });
}

// ───────────────────────── 订单完成 ─────────────────────────
function orderPage() {
  const body = `
${rHeader({ back: true, cartCount: 0 })}
${crumb([{ t: '購物車', href: '/m/cart' }, { t: '結帳', href: '/m/checkout' }, { t: '完成訂購' }])}

<section class="m-done">
  <div class="m-done__ico">${ICO.check}</div>
  <h1>訂單已成立</h1>
  <p>感謝您的購買！我們已寄出訂單確認信，<br>商品將於 1–3 個工作日內出貨。</p>
  <div class="m-done__no">訂單編號 <b id="orderNo">—</b></div>
</section>

<div class="m-sep"></div>

<section class="m-co-sec" style="margin-top:0">
  <div class="m-co-sec__hd"><h2>訂單資訊</h2></div>
  <dl class="m-kv" style="padding:6px 12px 14px">
    <dt>訂單編號</dt><dd id="kvNo">—</dd>
    <dt>訂單金額</dt><dd id="kvAmount">—</dd>
    <dt>付款方式</dt><dd>信用卡一次付清</dd>
    <dt>配送方式</dt><dd>賣家宅配</dd>
    <dt>建立時間</dt><dd id="kvTime">—</dd>
  </dl>
</section>

<div class="m-sep"></div>

<div class="m-done__btns" style="padding-top:12px">
  <a class="ghost" href="/m/">回到首頁</a>
  <a class="solid" href="/m/category">繼續購物</a>
</div>

<div class="m-safe"></div>
${rTabbar('首頁')}

<script>
(function(){
  var no = decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() || '');
  document.getElementById('orderNo').textContent = no || '—';
  document.getElementById('kvNo').textContent = no || '—';
  fetch('/api/order/' + encodeURIComponent(no)).then(function(r){ return r.json(); }).then(function(d){
    if (d && d.ok && d.order) {
      document.getElementById('kvAmount').textContent = '$' + Number(d.order.amount).toLocaleString('en-US');
      document.getElementById('kvTime').textContent = new Date(d.order.created_at).toLocaleString('zh-TW');
    } else {
      document.getElementById('kvTime').textContent = new Date().toLocaleString('zh-TW');
    }
  }).catch(function(){
    document.getElementById('kvTime').textContent = new Date().toLocaleString('zh-TW');
  });
})();
</script>`;
  return shell({ title: '訂單完成 - momo購物網', head: UTM_SCRIPT, body });
}

// ───────────────────────── 写盘 ─────────────────────────
function write(rel, content) {
  const abs = path.join(M, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf8');
  console.log('  ✓ m/' + rel, (content.length / 1024).toFixed(1) + 'KB');
}

console.log('building mobile pages…');
write('index.html', homePage());
write('category/index.html', categoryPage());
write('cart/index.html', cartPage());
write('checkout/index.html', checkoutPage());
write('order/index.html', orderPage());
console.log('done. products:', products.length);
