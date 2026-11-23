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

/** 从 _L.jpg 派生真站的三张图：R（主图）/ O / OL */
function galleryOf(img) {
  if (!img) return [];
  const base = String(img).replace(/_[A-Z]{1,2}\.(jpg|webp)$/i, "");
  return ['_R.jpg', '_O.jpg', '_OL.jpg'].map((suf) => base + suf);
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
<script src="/assets/js/cat-carousel.js" defer></script>
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


/** 手机版顶部导航：与真站一致，全部 39 个分类横向滑动 */
export function mobileNav() {
  return `<nav class="r-nav">
    <a class="on" href="/m/">首頁</a>
    <a href="/m/category">限時搶購</a>
    <a href="/m/category">直播</a>
    <a href="/m/category">mo店+</a>
    <a href="/m/category">看看買</a>
    <a href="/m/category?cat=%E5%AE%B6%E9%9B%BB">家電</a>
    <a href="/m/category?cat=%E9%9B%BB%E7%8E%A9">電玩</a>
    <a href="/m/category?cat=%E6%89%8B%E6%A9%9F%2F%E7%9B%B8%E6%A9%9F">手機/相機</a>
    <a href="/m/category?cat=%E9%9B%BB%E8%85%A6%2F%E7%B5%84%E4%BB%B6">電腦/組件</a>
    <a href="/m/category?cat=3C%E9%80%B1%E9%82%8A">3C週邊</a>
    <a href="/m/category?cat=%E4%BF%9D%E5%81%A5%2F%E9%86%AB%E7%99%82">保健/醫療</a>
    <a href="/m/category?cat=%E9%A3%9F%E5%93%81%2F%E9%A3%B2%E6%96%99">食品/飲料</a>
    <a href="/m/category?cat=%E7%94%9F%E9%AE%AE">生鮮</a>
    <a href="/m/category?cat=%E5%A5%B3%E6%99%82%E5%B0%9A">女時尚</a>
    <a href="/m/category?cat=%E7%94%B7%E6%99%82%E5%B0%9A">男時尚</a>
    <a href="/m/category?cat=%E7%B2%BE%E5%93%81%2F%E9%A3%BE%E5%93%81">精品/飾品</a>
    <a href="/m/category?cat=%E5%BD%A9%E5%A6%9D%E4%BF%9D%E9%A4%8A">彩妝保養</a>
    <a href="/m/category?cat=%E5%80%8B%E4%BA%BA%E6%B8%85%E6%BD%94">個人清潔</a>
    <a href="/m/category?cat=%E6%97%A5%E7%94%A8%2F%E7%B4%99%E5%93%81">日用/紙品</a>
    <a href="/m/category?cat=%E6%AF%8D%E5%AC%B0%2F%E7%8E%A9%E5%85%B7">母嬰/玩具</a>
    <a href="/m/category?cat=%E9%A4%90%E5%BB%9A">餐廚</a>
    <a href="/m/category?cat=%E5%AE%B6%E5%85%B7%E6%94%B6%E7%B4%8D">家具收納</a>
    <a href="/m/category?cat=%E4%BF%AE%E7%B9%95%E5%9C%92%E8%97%9D">修繕園藝</a>
    <a href="/m/category?cat=%E5%82%A2%E9%A3%BE%E5%AF%A2%E5%85%B7">傢飾寢具</a>
    <a href="/m/category?cat=%E5%AF%B5%E7%89%A9">寵物</a>
    <a href="/m/category?cat=%E9%81%8B%E5%8B%95%2F%E6%8C%89%E6%91%A9">運動/按摩</a>
    <a href="/m/category?cat=%E6%88%B6%E5%A4%96">戶外</a>
    <a href="/m/category?cat=%E8%BB%8A%E9%A1%9E">車類</a>
    <a href="/m/category?cat=%E5%9C%96%E6%9B%B8%E5%BD%B1%E9%9F%B3">圖書影音</a>
    <a href="/m/category?cat=%E6%96%87%E5%85%B7%E6%A8%82%E5%99%A8">文具樂器</a>
    <a href="/m/category?cat=%E8%97%9D%E8%A1%93%E5%AE%97%E6%95%99">藝術宗教</a>
    <a href="/m/category?cat=%E6%97%85%E9%81%8A%2F%E4%BD%8F%E5%AE%BF">旅遊/住宿</a>
    <a href="/m/category?cat=%E7%A5%A8%E5%88%B8">票券</a>
    <a href="/m/category?cat=%E5%8A%A0%E5%80%BC%2F%E8%BB%9F%E9%AB%94">加值/軟體</a>
    <a href="/m/category?cat=%E7%B6%A0%E8%89%B2%E7%94%9F%E6%B4%BB">綠色生活</a>
    <a href="/m/category?cat=%E7%94%9F%E6%B4%BB%E8%B6%85%E5%B8%82">生活超市</a>
    <a href="/m/category?cat=%E8%B7%A8%E5%A2%83%E5%A5%BD%E7%89%A9">跨境好物</a>
    <a href="/info/insurance">momo富立保險</a>
    <a href="/m/category?cat=%E6%A8%82%E5%85%AC%E7%9B%8A">樂公益</a>
    <a href="/m/category?cat=%E5%93%81%E7%89%8C%E6%97%97%E8%89%A6%E9%A4%A8">品牌旗艦館</a>
  </nav>`;
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
.cat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
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
    // 手机商品页：对照真站 m 版结构
    const body = `
<header class="r-hd r-hd--pdp">
  <a class="r-hd__menu" href="/m/" aria-label="返回"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg></a>
  <button class="r-hd__menu" type="button" aria-label="選單"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
  <span class="r-hd__logo">momo</span>
  <span class="r-hd__tag">新品<em>🔥</em></span>
  <form class="r-hd__search" onsubmit="event.preventDefault();location.href='/m/category?kw='+encodeURIComponent(this.q.value)">
    <input name="q" type="search" placeholder="${esc(name.slice(0, 8))}" aria-label="搜尋">
  </form>
  <a class="r-hd__ico" href="/m/category" aria-label="足跡"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/></svg></a>
</header>

<nav class="r-crumb2">
  <a href="/m/">首頁</a><i>›</i>
  <a href="/m/category?cat=${encodeURIComponent(p.cat || '全部商品')}">${esc(p.cat || '全部商品')}</a><i>›</i>
  <span>精選品牌推薦</span><i>›</i>
  <span>${esc((name.match(/【([^】]+)】/) || [0, name.slice(0, 8)])[1])}</span>
</nav>

<main class="r-main r-pdp">
  <section class="r-pdp__hero">
    <img id="pdpImg" src="${esc(galleryOf(img)[0] || img)}" alt="${esc(name)}">
    <span class="r-pdp__idx">1/2</span>
  </section>

  <div class="r-pdp__promo">
    <span class="r-pdp__promo-tag">今日限定</span>
    <span class="r-pdp__promo-txt">全站加碼登記送<em>$900</em></span>
  </div>

  <section class="r-pdp__info">
    <div class="r-pdp__slogan">
      <span>享受療癒美人湯的輕旅度假</span>
      <span class="code">品號：${esc(p.code)}</span>
    </div>
    <h1 class="r-pdp__name">${esc(name)}</h1>
    <div class="r-pdp__priceline">
      <span class="now"><small>$</small>${price.toLocaleString('en-US')}</span>
      <span class="tag">限時折後價</span>
      <span class="sold">總銷量>${((Number(p.code) % 9) + 1)},000</span>
    </div>
    <div class="r-pdp__wasline">
      <span><b>$${Math.round(price * 1.045).toLocaleString('en-US')}</b> 促銷價</span>
      <span><s>$${was.toLocaleString('en-US')}</s> 市售價</span>
    </div>
    <div class="r-pdp__discount">
      <span class="chip">現折</span>
      <span class="txt">滿1件折121元</span>
      <a class="more" href="/m/category">活動賣場 ›</a>
    </div>
    <a class="r-pdp__rank" href="/m/category"><span class="ico">🔥</span> 入圍 飯店 熱銷排行 <em>查看 ›</em></a>
  </section>

  <nav class="r-pdp__tabs" id="pdpTabs">
    <a class="on" href="#sec-goods">商品</a>
    <a href="#sec-review">評價</a>
    <a href="#sec-detail">詳情</a>
    <a href="#sec-spec">規格</a>
    <a href="#sec-recommend">推薦</a>
  </nav>

  <section class="r-pdp__rows" id="sec-goods">
    <div class="r-pdp__row"><span class="k">訂閱 moPro</span><span class="v">加入moPro會員享專屬權益</span></div>
    <div class="r-pdp__row"><span class="k">折價券</span><span class="v">特惠商品，不適用折價券</span></div>
    <div class="r-pdp__row"><span class="k">規格</span><span class="v" id="pdpSkusM">${skuChips(p, 'mobile')}</span></div>
    <div class="r-pdp__row"><span class="k">數量</span><span class="v"><span class="r-qty"><button type="button" data-q="-1">−</button><input id="pdpQty" value="1" inputmode="numeric"><button type="button" data-q="1">＋</button></span></span></div>
    <div class="r-pdp__row"><span class="k">配送</span><span class="v">賣家宅配／超商取貨　<span class="pink">滿 $490 免運</span></span></div>
  </section>

  <section class="r-pdp__detail" id="sec-detail">
    <h3>商品詳情</h3>
    <p>${esc(name)}，momo 購物網正式授權經銷，商品皆為台灣公司貨，享原廠保固與售後服務。</p>
    <div class="r-pdp__imgs">${galleryOf(img).map((u) => `<img src="${esc(u)}" alt="" loading="lazy">`).join('')}</div>
  </section>

  <section class="r-pdp__detail" id="sec-spec">
    <h3>規格說明</h3>
    <table class="r-spec">
      <tr><th>商品編號</th><td>${esc(p.code)}</td></tr>
      <tr><th>商品分類</th><td>${esc(p.cat || '其他')}</td></tr>
      <tr><th>原價</th><td><s>${fmt(was)}</s></td></tr>
      <tr><th>5 折價</th><td class="pink">${fmt(price)}</td></tr>
      <tr><th>產地</th><td>依原廠標示</td></tr>
      <tr><th>保固</th><td>原廠保固（非人為損壞）</td></tr>
    </table>
  </section>

  <section class="r-pdp__detail" id="sec-review">
    <h3>商品評價</h3>
    <div class="r-pdp__rate">
      <span class="score">${p.rating || '4.6'}</span>
      <span class="stars">★★★★★</span>
      <span class="cnt">共 ${((Number(p.code) % 50) + 3)} 則評價</span>
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
      ${(allItems() || []).filter((x) => x.code !== p.code && x.img && x.cat === p.cat).slice(0, 6).map((x) => `
        <a class="r-pdp__rec" href="/m/product/${x.code}">
          <img src="${x.img}" alt="" loading="lazy">
          <b>${esc(String(x.name).slice(0, 12))}</b>
          <span>${Math.round(Number(x.price) / 2).toLocaleString('en-US')}</span>
        </a>`).join('')}
    </div>
  </section>

  <section class="r-pdp__rows r-pdp__rows--bordered">
    <div class="r-pdp__row r-pdp__row--link"><span class="k">付款方式</span><span class="v">信用卡 | 無卡分期 | 行動支付 | 超商付...<br><span class="pink">刷mo卡享3%，回饋上限翻倍至2千</span></span><i>›</i></div>
    <div class="r-pdp__row r-pdp__row--link"><span class="k">配送方式</span><span class="v">廠商宅配</span><i>›</i></div>
    <div class="r-pdp__row r-pdp__row--link"><span class="k">品牌名稱</span><span class="v">${esc((name.match(/【([^】]+)】/) || [0, 'momo'])[1])}．<a class="link" href="/m/category">追蹤</a></span><i>›</i></div>
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
    <h3>看更多「${esc(p.cat || '全部商品')}」熱門商品</h3>
    <div class="r-pdp__tags">
      ${['#礁溪溫泉住宿', '#宜蘭', '#早餐', '#溫泉飯店', '#親子住宿'].map((t) => `<a href="/m/category?kw=${encodeURIComponent(t.replace('#', ''))}">${t}</a>`).join('')}
    </div>
  </section>

  <section class="r-pdp__recommend">
    <h3>熱門推薦</h3>
    <div class="r-pdp__recs2">
      ${(allItems() || []).filter((x) => x.code !== p.code && x.img).slice(0, 8).map((x) => `
        <a class="r-pdp__rec2" href="/m/product/${x.code}">
          <img src="${x.img}" alt="" loading="lazy">
          <b>${esc(String(x.name).slice(0, 14))}</b>
          <span>${Math.round(Number(x.price) / 2).toLocaleString('en-US')}</span>
        </a>`).join('')}
    </div>
  </section>

  <div class="r-pdp__ship">訂單確認後，商品預計${new Date(Date.now() + 864e5).getFullYear()}/${new Date(Date.now() + 864e5).getMonth() + 1}/${new Date(Date.now() + 864e5).getDate()}出貨</div>
</main>

<div class="r-buybar r-buybar--pdp">
  <a class="r-buybar__mini" href="/m/info/wishlist"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.6-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.8C19 15.4 12 20 12 20Z"/></svg><span>追蹤</span></a>
  <a class="r-buybar__mini" href="/m/info/wishlist"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.6-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.8C19 15.4 12 20 12 20Z"/></svg><span>追蹤清單</span></a>
  <a class="r-buybar__mini" href="/m/cart"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h2l2.2 10.2a1 1 0 0 0 1 .8h8.4a1 1 0 0 0 1-.8L19.5 8H6"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></svg><span>購物車</span></a>
  <button type="button" class="r-buybar__add" id="btnAdd">加入購物車</button>
  <button type="button" class="r-buybar__buy" id="btnBuy">直接購買</button>
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
    return mobileShell({ title: `${name} - momo購物網 - 好評推薦 -${new Date().getFullYear()}年${new Date().getMonth() + 1}月`, head: UTM_SCRIPT, body });
  }

  const relItems = (allItems() || []).filter((x) => String(x.code) !== String(p.code) && x.img && x.cat === p.cat).slice(0, 12);

  const body = `
<div class="wrap pdp2-wrap">
  <nav class="crumb"><a href="/">首頁</a><span class="sep">/</span><a href="/category">商品分類</a><span class="sep">/</span><a href="/category?cat=${encodeURIComponent(p.cat || "全部商品")}">${esc(p.cat || "全部商品")}</a><span class="sep">/</span><span>${esc(name.slice(0, 20))}</span></nav>

  <div class="pdp2">
    <aside class="pdp2__side">
      <div class="pdp2__sidehd">${esc(p.cat || "全部商品")}</div>
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
        <div class="pdp2__imgbox"><img id="pdpImg" src="${esc(galleryOf(img)[0] || img)}" alt="${esc(name)}"></div>
        <div class="pdp2__thumbs">
          ${galleryOf(img).map((u, i) => `<button type="button" data-src="${esc(u)}" aria-selected="${i === 0}"><img src="${esc(u)}" alt=""></button>`).join("")}
        </div>
      </div>

      <div class="pdp2__info">
        <p class="pdp2__slogan">享受療癒美人湯的輕旅度假</p>
        <h1 class="pdp2__title">${esc(name)}</h1>

        <div class="pdp2__promo">
          <div class="pdp2__promoline">10/31~11/30 11月限定<span>▼再降價</span></div>
          <div class="pdp2__promoline2">滿1件折121元 <em>(說明)</em></div>
        </div>

        <ul class="pdp2__sell">
          <li>免費體驗溫泉魚泡腳</li>
          <li>加贈溫泉套票550折價券</li>
          <li>距離礁溪轉運站走路五分鐘</li>
        </ul>
        <div class="pdp2__code">品號：${esc(p.code)}</div>

        <div class="pdp2__prices">
          <div class="row1"><span class="lb">限時折後價</span><span class="big">$${price.toLocaleString("en-US")}</span><span class="unit">元</span><span class="vip">貴賓通鑑</span></div>
          <div class="row2"><span>促銷價 <b>${Math.round(price * 1.045).toLocaleString("en-US")}</b> 元</span><span>市售價 <s>$${was.toLocaleString("en-US")}</s> 元</span></div>
        </div>

        <dl class="pdp2__attrs">
          <dt>品牌名稱</dt><dd>${esc((name.match(/【([^】]+)】/) || [, "momo"])[1])} <i class="fav">♡</i></dd>
          <dt>結帳方式</dt><dd>信用卡／無卡分期／行動支付／超商付款／ATM／銀聯卡<br><span class="pink">刷mo卡享3%，回饋上限翻倍至2千</span></dd>
          <dt>分期/紅利</dt><dd><select class="pdp2__sel"><option>24期</option><option>12期</option><option>6期</option></select> 每期 $${Math.round(price / 24).toLocaleString("en-US")} 元 <a href="#" class="more">更多</a></dd>
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
    </div>
  </div>
</div>

  <section class="card pdp2__detail" style="margin-top:14px">
    <div class="card__hd"><h2>商品詳情</h2></div>
    <div class="card__bd pdp2__detailbd">
      <p class="pdp2__lead">${esc(name)}，momo 購物網正式授權經銷，商品皆為台灣公司貨，享原廠保固與售後服務。</p>
      <h3>商品特色</h3>
      <ul class="pdp2__feat">
        <li>原廠公司貨，附發票與保固卡</li>
        <li>嚴選品質，出貨前逐件品檢</li>
        <li>支援多元付款：信用卡、ATM、超商取貨付款</li>
        <li>全館滿 $490 免運，未滿收取運費 $80</li>
      </ul>
      <div class="pdp2__detailimgs">
        ${[0, 1, 2].map(() => `<div class="pdp2__detailimg"><img src="${esc(img)}" alt=""></div>`).join('')}
      </div>
      <h3>規格說明</h3>
      <table class="spec-table">
        <tr><th>商品編號</th><td>${esc(p.code)}</td></tr>
        <tr><th>商品分類</th><td>${esc(p.cat || '其他')}</td></tr>
        <tr><th>原價</th><td><s>${fmt(was)}</s></td></tr>
        <tr><th>5 折價</th><td style="color:#d62872;font-weight:700">${fmt(price)}</td></tr>
        <tr><th>產地</th><td>依原廠標示</td></tr>
        <tr><th>保固</th><td>原廠保固（非人為損壞）</td></tr>
        <tr><th>退換貨</th><td>10 天猶豫期，商品需完整包裝</td></tr>
      </table>
    </div>
  </section>

  <section class="card pdp2__rel" style="margin-top:14px">
    <div class="card__hd"><h2>推薦商品</h2><a class="cart-summary__count" href="/category">看更多 ›</a></div>
    <div class="card__bd"><div class="cat-grid">${relItems.map((x) => `
      <a class="cat-card" href="/product/${x.code}">
        <div class="cat-card__img"><img src="${x.img}" alt="" loading="lazy"><span class="cat-card__off">5折</span></div>
        <div class="cat-card__body">
          <p class="cat-card__name">${esc(String(x.name).slice(0, 40))}</p>
          <div class="cat-card__price">$${Math.round(Number(x.price) / 2).toLocaleString('en-US')}<s>$${Number(x.price).toLocaleString('en-US')}</s></div>
        </div>
      </a>`).join('')}</div></div>
  </section>
<script>
(function(){

  // 缩略图点击切换主图（真站行为）
  document.querySelectorAll('.pdp2__thumbs button').forEach(function (b) {
    b.addEventListener('click', function () {
      var u = b.getAttribute('data-src');
      var main = document.querySelector('.pdp2__imgbox img');
      if (u && main) main.src = u;
      document.querySelectorAll('.pdp2__thumbs button').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
    });
  });
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
  return desktopShell({ title: `${name} - momo購物網 - 好評推薦 -${new Date().getFullYear()}年${new Date().getMonth() + 1}月`, body, head: UTM_SCRIPT });
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


/** 桌面分类页左侧筛选栏（品牌来自商品名【】里的词） */
export function catFilterSidebar(items) {
  const tally = {};
  for (const it of items || []) {
    const m = String(it.name || '').match(/【([^】]{2,12})】/);
    if (m) tally[m[1]] = (tally[m[1]] || 0) + 1;
  }
  const brands = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const li = (label, n) => '<li><label><input type="checkbox"> ' + esc(label) + ' <i>(' + n + ')</i></label></li>';
  const brandHtml = brands.map(([b, n]) => li(b, n)).join('') + '<li class="more">選更多</li>';
  const types = ['有線', '無線', '藍芽', '多合一', '其他'];
  const typeHtml = types.map((t, i) => li(t, Math.max(2, Math.round((items || []).length / (i + 3))))).join('') + '<li class="more">選更多</li>';
  const others = ['功能', '材質', '容量', '尺寸', '顏色', '款式'];
  const tagHtml = others.map((x) => '<span>' + x + '</span>').join('');

  return '<div class="catflt"><aside class="catflt__side">' +
    '<div class="catflt__grp"><h3>品牌</h3><ul>' + brandHtml + '</ul></div>' +
    '<div class="catflt__grp"><h3>類型</h3><ul>' + typeHtml + '</ul></div>' +
    '<div class="catflt__grp"><h3>其他選項</h3><div class="catflt__tags">' + tagHtml + '</div></div>' +
    '</aside><div class="catflt__main">' +
    '<div class="catflt__sort">' +
      '<div class="catflt__sortl"><a class="on" href="#">館長推薦</a><a href="#">月銷量</a><a href="#">新上市</a><a href="#">價格</a><a href="#">評價</a></div>' +
      '<div class="catflt__chips"><span>確認</span><span>momo速配</span><span>廠商出貨</span><span>跨境</span><span>現折</span><span>活動</span><span>折價券</span><span>快速到貨</span><span class="more">展開 ⌄</span></div>' +
    '</div>';
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

${mobileNav()}

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
    return mobileShell({ title: (kw ? `${kw}` : (cat || '商品分類')) + ' - momo購物網 - 好評推薦 - ' + new Date().getFullYear() + '年' + (new Date().getMonth() + 1) + '月', head: UTM_SCRIPT, body });
  }

  const body = `
<div class="wrap">
  <nav class="crumb"><a href="/">首頁</a><span class="sep">/</span><span>${kw ? `搜尋「${esc(kw)}」` : (catName ? esc(catName) : '商品分類')}</span></nav>

  <section class="catpage-pills">
    <a class="pill on" href="${base}">館長推薦</a>
    <a class="pill" href="${base}">☆雙11最優惠看這週☆</a>
    <a class="pill" href="${base}">mo幣加碼專區</a>
    <a class="pill" href="${base}">找價一目了然</a>
    <a class="pill" href="${base}">品牌(A-G)</a>
    <a class="pill" href="${base}">品牌(H-O)</a>
    <a class="pill" href="${base}">品牌(P-Z)</a>
    <a class="pill" href="${base}">專業電競★玩家體驗</a>
    <a class="pill" href="${base}">關鍵字</a>
  </section>

  <section class="catpage-banner" id="catBanner">
    <button class="catpage-banner__nav prev" type="button" aria-label="上一張">‹</button>
    <div class="catpage-banner__view">
      <div class="catpage-banner__track" id="catTrack">
        ${[0, 1, 2].map((i) => `<div class="catpage-banner__slide"><img src="${(allItems()[i * 11] || {}).img || ''}" alt=""></div>`).join('')}
      </div>
    </div>
    <button class="catpage-banner__nav next" type="button" aria-label="下一張">›</button>
    <div class="catpage-banner__dots" id="catDots">${[0, 1, 2].map((i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('')}</div>
  </section>

  <section class="catpage-kw">
    <h2>音訊關鍵字</h2>
    <div class="catpage-kw__row">
      ${['耳塞式', '耳罩式', '真無線', '藍牙喇叭', '運動耳機', '降噪耳機', '電競耳機', '有線耳機', '麥克風', '收音'].map((t, i) => `
        <a href="/category?kw=${encodeURIComponent(t)}"><i><img src="${((allItems()[i * 7] || {}).img) || ''}" alt=""></i><b>${t}</b></a>
      `).join('')}
    </div>
  </section>
  <div class="card">
    <div class="card__hd"><h2>${kw ? `搜尋「${esc(kw)}」` : (catName ? esc(catName) : '全部商品')}</h2><span class="cart-summary__count">共 ${total.toLocaleString('en-US')} 件</span></div>
    <div class="card__bd">
      ${catBar(cats, cat, 'desktop')}

  ${catFilterSidebar(items)}
      <div class="cat-grid">${items.map((p) => dCard(p)).join('')}</div>
        </div>
      </div>
      ${mPager(page, pages, base)}
    </div>
  </div>
</div>
${CAT_GRID_CSS}`;
  return desktopShell({ title: (kw ? `${kw}` : (cat || '全部商品')) + ' - momo購物網 - 好評推薦 - ' + new Date().getFullYear() + '年' + (new Date().getMonth() + 1) + '月', body, head: UTM_SCRIPT });
}
