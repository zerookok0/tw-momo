/**
 * 目錄驅動渲染器（Node 與 Cloudflare Workers 共用）
 *
 * 纯函数设计：不直接读磁盘。
 *   - Node：`configureFromDisk()` 从 site/ 读 header/footer/catalog
 *   - Workers：`configure({ header, footer, utmScript })` + `setCatalog(json)`
 *
 * 导出：
 *   configure({ header, footer, utmScript })
 *   setCatalog(catalogJson) / getProduct(code) / allItems()
 *   renderProductPage(kind, product)   kind = 'desktop' | 'mobile'
 *   renderCategoryPage(kind, opts)     opts = { items, page, pageSize, total, kw }
 */
import { origPrice, salePrice, discountLabel } from './pricing.mjs';
export { origPrice, salePrice };
export const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-US');
export const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const NO_IMG = '/assets/img1.momoshop.com.tw/ecm/img/online/10/998/00/000/bt_0_245_01/bt_0_245_01_P1_1_e2.png';

// ───────────────────────── 目录 ─────────────────────────
let CATALOG = { items: [], count: 0 };
let BY_CODE = new Map();

/** 注入目录（Workers 用 fetch 拿 JSON 后调用；Node 用 loadCatalog） */
export function setCatalog(json) {
  CATALOG = json && Array.isArray(json.items) ? json : { items: [], count: 0 };
  BY_CODE = new Map(CATALOG.items.map((i) => [String(i.code), i]));
  return CATALOG;
}

export const getProduct = (code) => BY_CODE.get(String(code)) || null;
export const allItems = () => CATALOG.items;
export const catalogCount = () => CATALOG.items.length;

/** 注入页面外壳片段（默认来自自动生成的 lib/shell.mjs，Node 与 Workers 通用） */
import { HEADER_HTML, FOOTER_HTML, UTM_SCRIPT as UTM_DEFAULT } from './shell.mjs';

let HEADER = HEADER_HTML;
let FOOTER = FOOTER_HTML;
let UTM_SCRIPT = UTM_DEFAULT;
export function configure({ header, footer, utmScript } = {}) {
  if (typeof header === 'string') HEADER = header;
  if (typeof footer === 'string') FOOTER = footer;
  if (typeof utmScript === 'string') UTM_SCRIPT = utmScript;
}

// ───────────────────────── 共享资源 ─────────────────────────
const DESKTOP_CSS = [
  '/assets/www.momoshop.com.tw/search/_next/static/css/b36616395eb7bd31.css',
  '/assets/www.momoshop.com.tw/search/_next/static/css/62f82080ec5074dd.css',
  '/assets/www.momoshop.com.tw/search/_next/static/css/046394d9bcfe3529.css',
  '/assets/image.momoshop.com.tw/ecm/font/theme-main.css',
  '/assets/css/momo-pages.css',
];

const ICO = {
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>`,
  cart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2.2l2.1 11.2a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 7H6"/><circle cx="9.5" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4"/></svg>`,
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/></svg>`,
  grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.4"/></svg>`,
  store: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9"/><path d="M3 9l1.6-4.2A1 1 0 0 1 5.5 4h13a1 1 0 0 1 .9.8L21 9z"/><path d="M9 20v-5h6v5"/></svg>`,
  chev: `<svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

// ───────────────────────── 页面外壳 ─────────────────────────
function desktopShell({ title, body, head = '' }) {
  return `<!doctype html>
<html lang="zh-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=0">
<title>${esc(title)}</title>
${head}
${DESKTOP_CSS.map((h) => `<link rel="stylesheet" href="${h}">`).join('\n')}
</head>
<body class="momo-page">
${HEADER}
${body}
${FOOTER}
</body>
</html>`;
}

const M_CAT = (n) => '/m/category?cat=' + encodeURIComponent(n);

const M_NAV = [
  { t: '首頁', href: '/m/' },
  { t: '限時搶購', href: '/m/category', badge: '11:00' },
  { t: 'mo店+', href: '/m/category' },
  { t: '品牌旗艦', href: M_CAT('精品/飾品') },
  { t: '3C', href: M_CAT('3C週邊') },
  { t: '家電', href: M_CAT('家電') },
  { t: '美粧', href: M_CAT('彩妝保養') },
  { t: '保健', href: M_CAT('保健/醫療') },
  { t: '食品', href: M_CAT('食品/飲料') },
  { t: '運動', href: M_CAT('運動/按摩') },
  { t: '親子', href: M_CAT('母嬰/玩具') },
  { t: '男裝', href: M_CAT('男時尚') },
  { t: '女裝', href: M_CAT('女時尚') },
];

function mobileHeader(navCurrent = '首頁') {
  return `
<header class="m-header">
  <div class="m-header__bar">
    <button class="m-header__ico" type="button" aria-label="選單">${ICO.menu}</button>
    <a class="m-header__logo" href="/m/"><img src="/m/assets/img/logo.svg" alt="momo購物網"></a>
    <span class="m-header__slogan">桃金日<br>就在每月22號</span>
    <a class="m-header__ico m-header__cart" href="/m/cart" aria-label="購物車">${ICO.cart}<i class="m-header__badge">3</i></a>
  </div>
  <div class="m-search">
    <form class="m-search__box" onsubmit="event.preventDefault();location.href='/m/category?kw='+encodeURIComponent(this.q.value)">
      <input name="q" type="search" placeholder="除濕機" aria-label="搜尋">
      <button class="m-search__btn" type="submit">搜尋</button>
    </form>
    <div class="m-search__hot"><b>猜你想搜</b><span>雨傘王防曬傘</span><span>NIKE 童 學步鞋</span><span>酪梨油 3入</span></div>
  </div>
  <nav class="m-nav">
    ${M_NAV.map((n) => `<a href="${n.href}"${n.t === navCurrent ? ' aria-current="page"' : ''}>${n.t}</a>`).join('')}
  </nav>
</header>`;
}

function mobileTabbar(current = '首頁') {
  const items = [
    { t: '首頁', href: '/m/', ico: ICO.home },
    { t: '分類', href: '/m/category', ico: ICO.grid },
    { t: '限時搶購', href: '/m/category', ico: ICO.store },
    { t: '購物車', href: '/m/cart', ico: ICO.cart },
    { t: '會員', href: '/info/member-center', ico: ICO.user },
  ];
  return `<nav class="m-tabbar">${items
    .map((i) => `<a href="${i.href}"${i.t === current ? ' aria-current="page"' : ''}>${i.ico}<span>${i.t}</span></a>`)
    .join('')}</nav>`;
}

function mobileShell({ title, body, head = '', bodyClass = 'm' }) {
  return `<!doctype html>
<html lang="zh-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1">
<meta name="format-detection" content="telephone=no">
<meta name="theme-color" content="#d62872">
<title>${esc(title)}</title>
${head}
<link rel="stylesheet" href="/assets/image.momoshop.com.tw/ecm/font/theme-main.css">
<link rel="stylesheet" href="/m/assets/css/momo-mobile.css">
<link rel="stylesheet" href="/m/assets/css/mobile-home.css">
</head>
<body class="${bodyClass}">
${body}
</body>
</html>`;
}

const crumbMobile = (items) => `
<nav class="m-crumb">
  ${items.map((i, idx) => `${idx ? '<span>/</span>' : ''}<span>${i.href ? `<a href="${i.href}">${i.t}</a>` : i.t}</span>`).join('')}
</nav>`;

// ───────────────────────── 商品卡 ─────────────────────────
const TAGS = ['今日限定', '滿額登記', '爆殺', '免運', '獨家', '限時'];
// 全站统一：展示价 = round(原价 / 2)，划线价 = 原价
const cardPrice = (p) => salePrice(p);
const cardOrig = (p) => origPrice(p);

function mCard(p, i = 0) {
  const price = cardPrice(p);
  return `
  <a class="m-card" href="/m/product/${p.code}">
    <div class="m-card__img">
      <img src="${esc(p.img || NO_IMG)}" alt="${esc(p.name)}" loading="lazy">
      <span class="m-card__tag">${TAGS[i % TAGS.length]}</span>
    </div>
    <div class="m-card__body">
      <p class="m-card__name">${esc(p.name)}</p>
      <div class="m-card__price">
        <span class="now"><small>$</small>${price.toLocaleString('en-US')}</span>
        <span class="was">$${cardOrig(p).toLocaleString('en-US')}</span>
      </div>
      <div class="m-card__meta"><span>已售 ${((i * 37 + 54) % 900) + 20} 組</span><i class="dot"></i><span>滿$490免運</span></div>
      <div class="m-card__buy">馬上買</div>
    </div>
  </a>`;
}

function dCard(p) {
  const price = cardPrice(p);
  const orig = cardOrig(p);
  return `
  <a class="cat-card" href="/product/${p.code}">
    <div class="cat-card__img"><img src="${esc(p.img || NO_IMG)}" alt="${esc(p.name)}" loading="lazy"><span class="cat-card__off">5折</span></div>
    <div class="cat-card__name">${esc(p.name)}</div>
    <div class="cat-card__price">${fmt(price)}<s>${fmt(orig)}</s></div>
  </a>`;
}

const CAT_GRID_CSS = `<style>
.cat-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:14px}
.cat-card{display:block;border:1px solid #eee;border-radius:4px;overflow:hidden;background:#fff;transition:box-shadow .15s,transform .15s}
.cat-card:hover{box-shadow:0 4px 14px rgba(0,0,0,.1);transform:translateY(-2px)}
.cat-card__img{aspect-ratio:1/1;background:#fafafa;display:flex;align-items:center;justify-content:center}
.cat-card__img img{width:100%;height:100%;object-fit:contain}
.cat-card__name{padding:8px 8px 4px;font-size:13px;line-height:1.4;height:54px;overflow:hidden;color:#4d4d4d}
.cat-card__price{padding:0 8px 10px;font-family:var(--font-price);font-size:17px;font-weight:700;color:#d62872;display:flex;align-items:baseline;gap:6px}
.cat-card__price s{font-family:var(--font-price);font-size:11px;font-weight:400;color:#bbb}
.cat-card__off{position:absolute;left:0;top:0;background:#dd2726;color:#fff;font-size:11px;font-weight:700;padding:2px 6px;border-radius:0 0 4px 0;z-index:1}
.cat-card__img{position:relative}
.pager{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;padding:20px 0 8px}
.pager a,.pager span{min-width:36px;height:36px;padding:0 10px;display:inline-flex;align-items:center;justify-content:center;border:1px solid #e6e6e6;border-radius:4px;font-size:13px;color:#4d4d4d;background:#fff;font-family:var(--font-price)}
.pager a:hover{border-color:#d62872;color:#d62872}
.pager .on{background:#d62872;border-color:#d62872;color:#fff}
.pager .gap{border:0;background:none}
@media(max-width:1100px){.cat-grid{grid-template-columns:repeat(4,1fr)}}
@media(max-width:720px){.cat-grid{grid-template-columns:repeat(2,1fr)}}
</style>`;

function mPager(page, pages, base) {
  const mk = (p, label, cls) => `<a href="${base}${base.includes('?') ? '&' : '?'}page=${p}" class="${cls || ''}">${label}</a>`;
  let out = '';
  if (page > 1) out += mk(page - 1, '‹ 上一頁');
  const start = Math.max(1, page - 2);
  const end = Math.min(pages, page + 2);
  if (start > 1) out += mk(1, '1');
  if (start > 2) out += '<span class="gap">…</span>';
  for (let p = start; p <= end; p++) out += p === page ? `<span class="on">${p}</span>` : mk(p, String(p));
  if (end < pages - 1) out += '<span class="gap">…</span>';
  if (end < pages) out += mk(pages, String(pages));
  if (page < pages) out += mk(page + 1, '下一頁 ›');
  return `<div class="pager">${out}</div>`;
}

// ───────────────────────── 商品详情 ─────────────────────────
/** 规格选择器：有真实多规格时出 chip（显示 5 折价），否则出「標準規格」 */
function skuChips(p, kind) {
  const has = Array.isArray(p.skus) && p.skus.length > 1;
  if (!has) {
    return kind === 'mobile'
      ? '標準規格'
      : '<button type="button" class="btn btn--ghost" style="height:38px;padding:0 16px;font-size:13px">標準規格</button>';
  }
  const sel = p.skus.some((s) => s.code === p.code) ? p.code : p.skus[0].code;
  return p.skus.map((s, i) => {
    const on = s.code === sel ? ' on' : '';
    const label = esc(s.label || s.name.slice(0, 12));
    const sale = Math.round(Number(s.price) / 2).toLocaleString('en-US');
    const cls = kind === 'mobile' ? 'm-sku-chip' : 'sku-chip';
    return `<button type="button" class="${cls}${on}" data-i="${i}">${label}<i>$${sale}</i></button>`;
  }).join('');
}

export function renderProductPage(kind, p) {
  const name = p.name || 'momo 嚴選商品';
  const price = cardPrice(p) || 495;      // 5 折后的展示价
  const was = cardOrig(p) || 990;         // 原价（划线价）
  const img = p.img || NO_IMG;
  const off = 50;                          // 全站固定 5 折

  if (kind === 'mobile') {
    // 手机商品页：与首页同一套 r-* 体系
    const body = `
<header class="r-hd">
  <a class="r-hd__menu" href="/m/" aria-label="返回"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg></a>
  <span class="r-hd__tag">新品<em>🔥</em></span>
  <form class="r-hd__search" onsubmit="event.preventDefault();location.href='/m/category?kw='+encodeURIComponent(this.q.value)">
    <input name="q" type="search" placeholder="${esc(name.slice(0, 10))}" aria-label="搜尋">
  </form>
  <a class="r-hd__ico" href="/m/cart" aria-label="購物車"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h2l2.2 10.2a1 1 0 0 0 1 .8h8.4a1 1 0 0 0 1-.8L19.5 8H6"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></svg></a>
</header>

<main class="r-main r-pdp">
  <section class="r-pdp__hero">
    <img id="pdpImg" src="${esc(img)}" alt="${esc(name)}">
    <div class="r-pdp__dots"><i class="on"></i><i></i><i></i><i></i></div>
  </section>

  <section class="r-pdp__box">
    <div class="r-pdp__flags"><span>momo嚴選</span><span>今日限定</span><span>滿額登記送mo幣</span></div>
    <div class="r-pdp__price">
      <span class="now"><small>$</small>${price.toLocaleString('en-US')}</span>
      <span class="was">$${was.toLocaleString('en-US')}</span>
      <span class="off">${off}% OFF</span>
    </div>
    <h1 class="r-pdp__title"><span class="tag">旗艦</span>${esc(name)}</h1>
  </section>

  <section class="r-pdp__box">
    <div class="r-row"><span class="k">規格</span><span class="v" id="pdpSkusM">${skuChips(p, 'mobile')}</span></div>
    <div class="r-row"><span class="k">數量</span><span class="v"><span class="r-qty"><button type="button" data-q="-1">−</button><input id="pdpQty" value="1" inputmode="numeric"><button type="button" data-q="1">＋</button></span></span></div>
    <div class="r-row"><span class="k">配送</span><span class="v">賣家宅配／超商取貨　<span style="color:#e2125b">滿 $490 免運</span></span></div>
    <div class="r-row"><span class="k">優惠</span><span class="v" style="color:#e2125b">滿 $1,500 送 $100 折價券</span></div>
  </section>

  <section class="r-pdp__box r-pdp__detail">
    <h3>商品詳情</h3>
    <p>${esc(name)}，momo 購物網正式授權經銷，商品皆為台灣公司貨，享原廠保固與售後服務。</p>
    <h3>商品規格</h3>
    <table class="r-spec">
      <tr><th>商品編號</th><td>${esc(p.code)}</td></tr>
      <tr><th>原價</th><td><s>${fmt(was)}</s></td></tr>
      <tr><th>5 折價</th><td class="pink">${fmt(price)}</td></tr>
      <tr><th>產地</th><td>依原廠標示</td></tr>
      <tr><th>保固</th><td>原廠保固（非人為損壞）</td></tr>
      <tr><th>退換貨</th><td>10 天猶豫期，商品需完整包裝</td></tr>
    </table>
  </section>
</main>

<div class="r-buybar">
  <a class="r-buybar__cart" href="/m/cart"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h2l2.2 10.2a1 1 0 0 0 1 .8h8.4a1 1 0 0 0 1-.8L19.5 8H6"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></svg><span>購物車</span></a>
  <button type="button" class="r-buybar__add" id="btnAdd">加入購物車</button>
  <button type="button" class="r-buybar__buy" id="btnBuy">立即購買</button>
</div>
<div class="m-toast" id="toast"></div>
<script>
(function(){
  var price=${price}, code=${JSON.stringify(p.code)}, name=${JSON.stringify(name)}, img=${JSON.stringify(img)};
  var SKUS=${JSON.stringify(p.skus && p.skus.length > 1 ? p.skus : [])}, cur=0;
  (function(){ for(var i=0;i<SKUS.length;i++) if(SKUS[i].code===code) cur=i; })();
  function applySku(i){
    if(!SKUS.length) return;
    cur=i; var s=SKUS[i];
    code=s.code; name=s.name; price=Math.round(Number(s.price)/2); if(s.img) img=s.img;
    var chips=document.querySelectorAll('#pdpSkusM .m-sku-chip');
    for(var k=0;k<chips.length;k++) chips[k].classList.toggle('on', Number(chips[k].getAttribute('data-i'))===i);
    var nowEl=document.querySelector('.r-pdp__price .now');
    if(nowEl) nowEl.innerHTML='<small>$</small>'+price.toLocaleString('en-US');
    var wasEl=document.querySelector('.r-pdp__price .was');
    if(wasEl) wasEl.textContent='$'+Number(s.price).toLocaleString('en-US');
    var imgEl=document.getElementById('pdpImg'); if(imgEl && s.img) imgEl.src=s.img;
  }
  document.querySelectorAll('#pdpSkusM .m-sku-chip').forEach(function(b){ b.addEventListener('click',function(){ applySku(Number(b.getAttribute('data-i'))); }); });
  var qty=document.getElementById('pdpQty');
  document.querySelectorAll('[data-q]').forEach(function(b){ b.addEventListener('click',function(){ qty.value=Math.max(1,Math.min(99,(parseInt(qty.value,10)||1)+Number(b.dataset.q))); }); });
  qty.addEventListener('input',function(){ qty.value=qty.value.replace(/[^0-9]/g,''); });
  var KEY='momo_cart';
  function read(){ try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return []} }
  function write(v){ try{localStorage.setItem(KEY,JSON.stringify(v))}catch(e){} }
  function toast(t){ var el=document.getElementById('toast'); el.textContent=t; el.classList.add('on'); clearTimeout(toast._t); toast._t=setTimeout(function(){ el.classList.remove('on'); },1800); }
  function add(){ var n=Math.max(1,parseInt(qty.value,10)||1); var c=read(); var h=c.filter(function(i){return i.code===code})[0]; if(h){ h.qty=(h.qty||1)+n; } else { c.push({code:code,name:name,price:price,img:img,qty:n}); } write(c); return n; }
  document.getElementById('btnAdd').addEventListener('click',function(){ toast('已加入 '+add()+' 件'); });
  document.getElementById('btnBuy').addEventListener('click',function(){ add(); location.href='/m/cart'; });
})();
</script>`;
    return mobileShell({ title: `${name} - momo購物網`, head: UTM_SCRIPT, body });
  }

  const body = `
<div class="wrap">
  <nav class="crumb"><a href="/">首頁</a><span class="sep">/</span><a href="/category">商品分類</a><span class="sep">/</span><span>${esc(name)}</span></nav>
  <div class="pdp">
    <div class="pdp__gallery">
      <div class="pdp__main"><img src="${esc(img)}" alt="${esc(name)}"></div>
      <div class="pdp__thumbs">${[0, 1, 2, 3].map((i) => `<button type="button" aria-selected="${i === 0}"><img src="${esc(img)}" alt=""></button>`).join('')}</div>
    </div>
    <div class="pdp__info">
      <h1 class="pdp__title">${esc(name)}</h1>
      <div class="pdp__sub"><span class="tag">momo嚴選</span><span>商品編號 ${esc(p.code)}</span><span>｜</span><span>賣家宅配／超商取貨</span></div>
      <div class="price-box">
        <div class="now"><span class="cur">$</span><span class="val">${price.toLocaleString('en-US')}</span><span class="was">${fmt(was)}</span></div>
        <div class="badges"><span>今日限定</span><span>滿額登記送 mo 幣</span><span>刷卡分期 0 利率</span></div>
      </div>
      <div class="opt-row" style="border-top:0"><div class="opt-row__label">規格</div><div class="opt-row__body" id="pdpSkus">${skuChips(p, 'desk')}</div></div>
      <div class="opt-row"><div class="opt-row__label">數量</div><div class="opt-row__body"><div class="qty"><button type="button" data-qty="-1">−</button><input type="text" value="1" inputmode="numeric" id="pdp-qty" aria-label="數量"><button type="button" data-qty="1">+</button></div></div></div>
      <div class="pdp__actions">
        <button type="button" class="btn btn--gray btn--lg" id="btn-add-cart">加入購物車</button>
        <button type="button" class="btn btn--primary btn--lg" id="btn-buy-now">直接結帳</button>
      </div>
      <ul class="pdp__notes">
        <li>全館滿 $490 免運，未滿收取運費 $80</li>
        <li>結帳後 1–3 個工作日內出貨，偏遠地區恕不配送</li>
        <li>依消費者保護法規定，享有 10 天猶豫期之權益</li>
      </ul>
    </div>
  </div>
  <div class="card" style="margin-top:12px">
    <div class="tabs" role="tablist"><button type="button" role="tab" aria-selected="true">商品詳情</button><button type="button" role="tab" aria-selected="false">規格說明</button><button type="button" role="tab" aria-selected="false">退換貨須知</button></div>
    <div class="tab-panel">
      <p>${esc(name)}，momo 購物網正式授權經銷，商品皆為台灣公司貨，享原廠保固與售後服務。</p>
      <h3>商品特色</h3>
      <ul><li>原廠公司貨，附發票與保固卡</li><li>嚴選品質，出貨前逐件品檢</li><li>支援多元付款：信用卡、ATM、超商取貨付款</li></ul>
      <h3>規格</h3>
      <table class="spec-table">
        <tr><th>商品編號</th><td>${esc(p.code)}</td></tr>
        <tr><th>原價</th><td><s>${fmt(was)}</s></td></tr>
        <tr><th>5 折價</th><td style="color:#d62872;font-weight:700">${fmt(price)}</td></tr>
        <tr><th>產地</th><td>依原廠標示</td></tr>
        <tr><th>保固</th><td>原廠保固（非人為損壞）</td></tr>
      </table>
    </div>
  </div>
</div>
<script>
(function(){
  var price=${price}, code=${JSON.stringify(p.code)}, name=${JSON.stringify(name)}, img=${JSON.stringify(img)};
  var SKUS=${JSON.stringify(p.skus && p.skus.length > 1 ? p.skus : [])}, cur=0;
  (function(){ for(var i=0;i<SKUS.length;i++) if(SKUS[i].code===code) cur=i; })();
  function applySku(i){
    if(!SKUS.length) return;
    cur=i; var s=SKUS[i];
    code=s.code; name=s.name; price=Math.round(Number(s.price)/2); if(s.img) img=s.img;
    var chips=document.querySelectorAll('#pdpSkus .sku-chip');
    for(var k=0;k<chips.length;k++) chips[k].classList.toggle('on', Number(chips[k].getAttribute('data-i'))===i);
    var valEl=document.querySelector('.price-box .val');
    if(valEl) valEl.textContent=price.toLocaleString('en-US');
    var wasEl=document.querySelector('.price-box .was');
    if(wasEl) wasEl.textContent='$'+Number(s.price).toLocaleString('en-US');
    var imgEl=document.querySelector('.pdp__main img'); if(imgEl && s.img) imgEl.src=s.img;
    // 规格表里的原价/5折价/商品编号跟着变
    document.querySelectorAll('.spec-table tr').forEach(function(tr){
      var th=tr.querySelector('th'), td=tr.querySelector('td');
      if(!th||!td) return;
      var t=th.textContent.trim();
      if(t==='原價') td.innerHTML='<s>$'+Number(s.price).toLocaleString('en-US')+'</s>';
      if(t==='5 折價') td.textContent='$'+price.toLocaleString('en-US');
      if(t==='商品編號') td.textContent=s.code;
    });
  }
  document.querySelectorAll('#pdpSkus .sku-chip').forEach(function(b){ b.addEventListener('click',function(){ applySku(Number(b.getAttribute('data-i'))); }); });
  document.querySelectorAll('.pdp__thumbs button').forEach(function(b){ b.addEventListener('click',function(){ document.querySelectorAll('.pdp__thumbs button').forEach(function(x){x.setAttribute('aria-selected','false')}); b.setAttribute('aria-selected','true'); }); });
  var qty=document.getElementById('pdp-qty');
  document.querySelectorAll('[data-qty]').forEach(function(b){ b.addEventListener('click',function(){ qty.value=Math.max(1,Math.min(99,(parseInt(qty.value,10)||1)+Number(b.dataset.qty))); }); });
  qty.addEventListener('input',function(){ qty.value=qty.value.replace(/[^0-9]/g,''); });
  var KEY='momo_cart';
  function read(){ try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return []} }
  function write(v){ try{localStorage.setItem(KEY,JSON.stringify(v))}catch(e){} }
  function add(){ var n=Math.max(1,parseInt(qty.value,10)||1); var c=read(); var h=c.filter(function(i){return i.code===code})[0]; if(h)h.qty+=n; else c.push({code:code,name:name,price:price,qty:n,img:img}); write(c); return n; }
  document.getElementById('btn-add-cart').addEventListener('click',function(){ var n=add(); this.textContent='已加入 '+n+' 件'; var s=this; setTimeout(function(){s.textContent='加入購物車'},1200); });
  document.getElementById('btn-buy-now').addEventListener('click',function(){ add(); location.href='/cart'; });
})();
</script>`;
  return desktopShell({ title: `${name} - momo購物網`, body, head: UTM_SCRIPT });
}

// ───────────────────────── 分类列表 ─────────────────────────


const CATBAR_CSS = `<style>
.cat-bar{display:flex;flex-wrap:wrap;gap:8px;padding:0 0 16px;margin:0 0 18px;border-bottom:1px solid #f0f0f0}
.cat-tab{display:inline-flex;align-items:baseline;gap:6px;height:34px;padding:0 14px;border-radius:17px;background:#f7f7f7;color:#4d4d4d;font-size:13px;line-height:34px;text-decoration:none;white-space:nowrap;transition:background .15s,color .15s}
.cat-tab span{font-size:11px;color:#b3b3b3}
.cat-tab:hover{background:#fdf0f6;color:#d62872}
.cat-tab.on{background:#d62872;color:#fff;font-weight:700}
.cat-tab.on span{color:rgba(255,255,255,.75)}
@media(max-width:600px){.cat-bar{flex-wrap:nowrap;overflow-x:auto;padding-bottom:12px}.cat-bar::-webkit-scrollbar{display:none}}
</style>`;

/** 分类导航条（桌面 + 行动共用） */
function catBar(cats, cur, kind) {
  if (!Array.isArray(cats) || !cats.length) return '';
  const base = kind === 'mobile' ? '/m/category' : '/category';
  const all = `<a class="cat-tab${!cur ? ' on' : ''}" href="${base}">全部<span>${cats.reduce((a, b) => a + b.count, 0).toLocaleString('en-US')}</span></a>`;
  const items = cats.map((c) => `<a class="cat-tab${c.name === cur ? ' on' : ''}" href="${base}?cat=${encodeURIComponent(c.name)}">${esc(c.name)}<span>${c.count.toLocaleString('en-US')}</span></a>`).join('');
  return CATBAR_CSS + `<div class="cat-bar">${all}${items}</div>`;
}

export function renderCategoryPage(kind, { items, page, pageSize, total, kw, cat, l, cats, catName }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const qs = [kw && `kw=${encodeURIComponent(kw)}`, cat && `cat=${encodeURIComponent(cat)}`, l && `l=${encodeURIComponent(l)}`].filter(Boolean).join('&');
  const base = qs ? `/category?${qs}` : '/category';
  const baseM = qs ? `/m/category?${qs}` : '/m/category';

  if (kind === 'mobile') {
    // 手机分类页：与首页同一套 r-* 体系（真机版式），不再用旧的 m-* 组件
    const title = kw ? `搜尋「${esc(kw)}」` : (catName ? esc(catName) : '全部商品');
    const chips = (cats || []).slice(0, 14).map((c) => {
      const href = `${baseM}${baseM.includes('?') ? '&' : '?'}cat=${encodeURIComponent(c.name)}`;
      return `<a class="r-chip${c.name === cat ? ' on' : ''}" href="${href}">${esc(c.name)}<i>${c.count.toLocaleString('en-US')}</i></a>`;
    }).join('');

    const body = `
<header class="r-hd">
  <button class="r-hd__menu" type="button" aria-label="選單"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
  <span class="r-hd__tag">新品<em>🔥</em></span>
  <form class="r-hd__search" onsubmit="event.preventDefault();location.href='/m/category?kw='+encodeURIComponent(this.q.value)">
    <input name="q" type="search" placeholder="${kw ? esc(kw) : '除濕機'}" aria-label="搜尋">
  </form>
  <a class="r-hd__ico" href="/m/category" aria-label="足跡"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/></svg></a>
  <a class="r-hd__ico" href="/info/contact" aria-label="消息"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H8l-4 3V5Z"/></svg></a>
</header>

<nav class="r-nav">
  <a href="/m/">首頁</a>
  <a href="/m/category">限時搶購</a>
  <a href="/m/category">直播</a>
  <a href="/m/category">mo店+</a>
  <a href="/m/category">看看買</a>
  <a class="r-nav__more" href="/m/category"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg></a>
</nav>

<main class="r-main">
  <section class="r-catbar">
    <div class="r-catbar__hd"><h2>${title}</h2><span>共 ${total.toLocaleString('en-US')} 件</span></div>
    <div class="r-chips">${chips}</div>
  </section>

  <section class="r-sec" style="margin-top:0">
    <div class="r-grid">${items.map((p) => {
      const s = Math.round(Number(p.price) / 2);
      return `<a class="r-card" href="/m/product/${p.code}">
        <img src="${p.img}" alt="" loading="lazy">
        <b>${esc(p.name.slice(0, 24))}</b>
        <span class="r-card__price">$${s.toLocaleString('en-US')}<s>$${Number(p.price).toLocaleString('en-US')}</s></span>
        <span class="r-card__btn">馬上買</span>
      </a>`;
    }).join('')}</div>
    ${mPager(page, pages, baseM)}
  </section>
</main>

<nav class="r-tab">
  <a href="/m/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8Z"/></svg><span>首頁</span></a>
  <a class="on" href="/m/category"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h16l-1.2 11.5a1 1 0 0 1-1 .9H6.2a1 1 0 0 1-1-.9L4 8Z"/><path d="M8.5 8V6a3.5 3.5 0 0 1 7 0v2"/></svg><span>逛逛</span></a>
  <a href="/info/wishlist"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.6-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.8C19 15.4 12 20 12 20Z"/></svg><span>追蹤清單</span></a>
  <a href="/m/cart"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h2l2.2 10.2a1 1 0 0 0 1 .8h8.4a1 1 0 0 0 1-.8L19.5 8H6"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></svg><span>購物車</span></a>
  <a href="/info/member-center"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.3-3.6 4-5.4 7.5-5.4s6.2 1.8 7.5 5.4"/></svg><span>會員中心</span></a>
</nav>`;
    return mobileShell({ title: (kw ? `${kw} - ` : (cat ? `${cat} - ` : '')) + '商品分類 - momo購物網', head: UTM_SCRIPT, body });
  }

  const body = `
<div class="wrap">
  <nav class="crumb"><a href="/">首頁</a><span class="sep">/</span><span>${kw ? `搜尋「${esc(kw)}」` : '商品分類'}</span></nav>
  <div class="card">
    <div class="card__hd"><h2>${kw ? `搜尋「${esc(kw)}」` : (catName ? esc(catName) : '全部商品')}</h2><span class="cart-summary__count">共 ${total.toLocaleString('en-US')} 件</span></div>
    <div class="card__bd">
      ${catBar(cats, cat, 'desktop')}
      <div class="cat-grid">${items.map((p) => dCard(p)).join('')}</div>
      ${mPager(page, pages, base)}
    </div>
  </div>
</div>
${CAT_GRID_CSS}`;
  return desktopShell({ title: (kw ? `${kw} - ` : (cat ? `${cat} - ` : '')) + '商品分類 - momo購物網', body, head: UTM_SCRIPT });
}
