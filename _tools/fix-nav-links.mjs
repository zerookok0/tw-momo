/**
 * 导航/页脚接线：把 href="#" 的占位链接接到真实页面
 *
 * 抓取时把 momo 的绝对链接改写成了 href="#"，导致页头页脚几十个链接点不动。
 * 这里按原始 URL 映射到：
 *   ① 站内实体页 /info/<slug>（由 build-info-pages.mjs 生成）
 *   ② 真实外链（Facebook / Instagram / LINE / 104 …）
 *   ③ 站内既有路由（/、/m、/cart、/category）
 *
 * 幂等：已接好的（href 不是 #）不会重复处理。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(__dirname, '..');
const SITE = path.join(PROJ, 'site');


// ── 文案锚点补 href ──
const TEXTLINKS = [
  [/^登入$/, '/info/login'],
  [/^註冊$/, '/info/login'],
  [/^會員中心$/, '/info/member-center'],
  [/^查訂單$/, '/info/orders'],
  [/^追蹤清單$/, '/info/wishlist'],
  [/^折價券$/, '/info/coupons'],
  [/^客服回覆$/, '/info/contact'],
  [/^購物車/, '/cart'],
  [/^首頁$/, '/'],
];

function linkifyTextAnchors(html) {
  return html.replace(/<a\b([^>]*)>([^<]{1,8})<\/a>/g, (all, attrs, text) => {
    if (/\bhref=/.test(attrs)) return all;
    const t = text.trim();
    for (const [re, to] of TEXTLINKS) {
      if (re.test(t)) return '<a' + attrs + ' href="' + to + '">' + text + '</a>';
    }
    return all;
  });
}

// ── 搜索按钮接线（原本没有 form，点了没反应）──
function wireSearchButton(html) {
  return html.replace(/<button\b([^>]*)>搜尋<\/button>/g, (all, attrs) => {
    if (/onclick=/.test(attrs)) return all;
    const fn = "var w=this.parentElement.querySelector('input[name=search-input],input[type=text],input');" +
               "if(w&&w.value.trim()){location.href='/category?kw='+encodeURIComponent(w.value.trim())}";
    return '<button' + attrs + ' onclick="' + fn + '">搜尋</button>';
  });
}

// ── 原始 URL → 目标 ──
const MAP = [
  // 会员 / 账号
  [/CustomerInput\.jsp/i, '/info/login'],
  [/[?&]func=18\b/i, '/info/login'],
  [/oid=mcenter/i, '/info/member-center'],
  [/oid=checkorders/i, '/info/orders'],
  [/oid=wishlist/i, '/info/wishlist'],
  [/oid=coupon/i, '/info/coupons'],

  // 分类 / 品牌 / APP
  // 分类页带着 l_code，直接映射到真实分类筛选
  [/LgrpCategory\.jsp\?l_code=(\d{8,12})/i, '/category?l=%LCODE%'],
  [/DgrpCategory\.jsp/i, '/category'],
  [/brand\/Main\.jsp/i, '/category'],
  [/appRedirect\.jsp|lpn=Nzpe4YTLgeM/i, '/info/app'],

  // 会员中心各功能（func=NN）
  [/[?&]func=00\b/i, '/info/orders'],
  [/[?&]func=01\b/i, '/info/returns'],
  [/[?&]func=02\b/i, '/info/wishlist'],
  [/[?&]func=04\b/i, '/info/address'],
  [/[?&]func=14\b/i, '/info/coupons'],
  [/[?&]func=30\b/i, '/info/coupons'],
  [/[?&]func=32\b/i, '/info/terms'],
  [/[?&]func=33\b/i, '/info/privacy'],
  [/[?&]func=36\b/i, '/info/fast-delivery'],
  [/[?&]func=37\b/i, '/info/faq'],
  [/autoXiao=1/i, '/info/contact'],
  [/[?&]func=2[0-9]\b/i, '/info/contact'],

  // 活动页 → 落地到能用的页面
  [/npn=1vEHfuNNoYpw/i, '/info/anti-fraud'],   // 防詐騙宣導

  // 外部真实站点
  [/facebook\.com\/groups/i, 'https://www.facebook.com/groups/momoshoppinggo/'],
  [/facebook\.com\/momofans/i, 'https://www.facebook.com/momofans'],
  [/instagram\.com/i, 'https://www.instagram.com/momoshopping_/'],
  [/line\.me/i, 'https://line.me/ti/p/@momoshop'],
  [/momo5188|fuli\/redirect/i, 'https://www.momo5188.com/'],
  [/104\.com\.tw/i, 'https://www.104.com.tw/company/ckkyqvc'],
  [/corp\.momo\.com\.tw\/supplier/i, '/info/supplier'],
  [/corp\.momo\.com\.tw/i, '/info/about'],

  // 站内既有路由
  [/m\.momoshop\.com\.tw/i, '/m'],
  [/main\/Main\.jsp/i, '/'],
  // 兜底：其他活动页一律落到分类页（比 href="#" 强）
  [/cmmedm\.jsp|edm\.momo/i, '/category'],
];

// 没有 href 的 <button>（页脚里的标章）按文案接线
const BUTTONS = [
  [/網路安全標章/, '/info/security'],
  [/包裝減量標章/, '/info/packaging'],
  [/碳足跡/, '/info/carbon'],
  [/防詐騙宣導/, '/info/anti-fraud'],
  [/碳足跡標籤/, '/info/carbon'],
];

function targetFor(rawUrl) {
  const u = rawUrl.replace(/&amp;/g, '&');

  // 站内搜索：把 keyword 带到 /category?kw=
  const sm = u.match(/searchShop\.jsp\?[^#]*keyword=([^&]*)/i);
  if (sm) {
    let kw = sm[1];
    try { kw = decodeURIComponent(kw.replace(/\+/g, ' ')); } catch (e) {}
    return '/category?kw=' + encodeURIComponent(kw);
  }

  for (const [re, to] of MAP) {
    const m = u.match(re);
    if (m) return to.replace('%LCODE%', m[1] || '');
  }
  return null;
}

function fixFile(rel) {
  const f = path.join(SITE, rel);
  if (!fs.existsSync(f)) return;
  let html = fs.readFileSync(f, 'utf8');
  let changed = 0;
  const miss = [];

  // ① href="#" data-orig-href="…"
  html = html.replace(/href="#"\s+data-orig-href="([^"]*)"/g, (full, url) => {
    const to = targetFor(url);
    if (!to) { miss.push(url.replace(/&amp;/g, '&').slice(0, 60)); return full; }
    changed++;
    return `href="${to}" data-orig-href="${url}"`;
  });

  // ①b 还残留着的绝对外链（抓取时没被改写成 # 的那批）
  html = html.replace(/(?<![-\w])href="(https?:\/\/(?:www\.)?(?:momoshop\.com\.tw|m\.momoshop\.com\.tw|corp\.momo\.com\.tw|facebook\.com|www\.facebook\.com|instagram\.com|www\.instagram\.com|line\.me|www\.104\.com\.tw|[^"]*momo5188\.com)[^"]*)"/g, (full, url) => {
    const to = targetFor(url);
    if (!to) return full;
    changed++;
    return `href="${to}"`;   // 锚点已带 data-orig-href 的不再重复追加
  });

  // href="" 视为空链接，按文案补
  html = html.replace(/<a\b([^>]*?)\bhref=""([^>]*)>/g, (all, a, b) => {
    const seg = all;
    if (/首頁/.test(seg)) return '<a' + a + ' href="/"' + b + '>';
    if (/購物車/.test(seg)) return '<a' + a + ' href="/cart/"' + b + '>';
    if (/結帳/.test(seg)) return '<a' + a + ' href="/checkout/"' + b + '>';
    return all;
  });

  html = linkifyTextAnchors(html);
  html = wireSearchButton(html);

  // ② 页脚里没 href 的 button → 变成链接
  for (const [re, to] of BUTTONS) {
    const re2 = new RegExp(`<button\\b([^>]*)>(${re.source})</button>`, 'g');
    html = html.replace(re2, (all, attrs, label) => {
      changed++;
      const cls = (attrs.match(/class="([^"]*)"/) || [])[1] || '';
      return `<a href="${to}" class="${cls}" data-linkified="1">${label}</a>`;
    });
  }

  // ③ 修历史遗留的错误目标
  const before = html;
  html = html.replace(/href="\/info\/coffee"/g, 'href="/info/carbon"');
  if (html !== before) changed++;

  // ③b 被抓成静态资源的第三方页面 → 改指站内页或真实外链
  //     （/assets/corp.momo.com.tw/... 是抓下来的裸 HTML，没有样式，点开是残页）
  const ASSET_MAP = [
    [/^\/assets\/corp\.momo\.com\.tw\/supplier/i, '/info/supplier'],
    [/^\/assets\/corp\.momo\.com\.tw/i, '/info/about'],
    [/^\/assets\/www\.104\.com\.tw/i, 'https://www.104.com.tw/company/ckkyqvc'],
    [/^\/assets\/www\.instagram\.com/i, 'https://www.instagram.com/momoshopping_/'],
    [/^\/assets\/line\.me/i, 'https://line.me/ti/p/@momoshop'],
    [/^\/assets\/www\.momo5188\.com/i, 'https://www.momo5188.com/'],
    [/^\/assets\/www\.facebook\.com/i, 'https://www.facebook.com/momofans'],
  ];
  html = html.replace(/(?<![-\w])href="(\/assets\/[^"]+)"/g, (full, u) => {
    for (const [re, to] of ASSET_MAP) {
      if (re.test(u)) { changed++; return `href="${to}"`; }
    }
    return full;
  });

  if (changed) fs.writeFileSync(f, html, 'utf8');
  console.log(`  ${rel.replace(/\\/g, '/')}: 接线 ${changed} 个${miss.length ? `，未映射 ${miss.length}` : ''}`);
  if (miss.length) console.log('    未映射样例:', [...new Set(miss)].slice(0, 6));
}

console.log('导航/页脚接线…');
fixFile('index.html');
fixFile(path.join('_partials', 'header.html'));
fixFile(path.join('_partials', 'footer.html'));
console.log('完成。');
