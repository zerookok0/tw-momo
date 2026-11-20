/**
 * 首页链接接线
 *
 * 问题：首页是从线上抓的渲染后 DOM，抓取时把 momo 的绝对链接统一改写成了
 *      `href="#" data-orig-href="原始URL"`，结果整页 242 个链接全是死链。
 *
 * 本脚本把 data-orig-href 还原成站内路由：
 *   GoodsDetail.jsp?i_code=NNN   → /product/NNN        （商品详情）
 *   LgrpCategory.jsp?l_code=NNN  → /category           （分类 → 全量列表）
 *   searchShop.jsp?keyword=X     → /category?kw=X      （站内搜索）
 *   cmmedm.jsp / edm.momo        → /category           （活动页 → 全量列表）
 *   cart / CartList              → /cart
 *   main / Main.jsp              → /
 *   其余（会员、订单、客服）      → 保持 #（本站没有对应页面）
 *
 * 另外注入搜索交互：首页搜索框回车/点「搜尋」直接跳 /category?kw=
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(__dirname, '..');

const SEARCH_JS = `
<script>
/* 首页搜索接线：把它接到站内 /category?kw= */
(function () {
  function go(q) {
    q = String(q || '').trim();
    if (!q) return;
    location.href = '/category?kw=' + encodeURIComponent(q);
  }
  function findInput() {
    return document.querySelector('input[type="search"], input[placeholder]');
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var t = e.target;
    if (!t || t.tagName !== 'INPUT') return;
    e.preventDefault();
    go(t.value);
  }, true);
  document.addEventListener('click', function (e) {
    var el = e.target.closest('button, a, div[role="button"]');
    if (!el) return;
    var txt = (el.textContent || '').trim();
    if (txt !== '搜尋' && txt !== '搜索' && txt !== '搜') return;
    var inp = findInput();
    e.preventDefault();
    if (inp) go(inp.value);
  }, true);
})();
</script>
`;

function mapHref(raw) {
  const u = raw.replace(/&amp;/g, '&');
  let m;

  if ((m = u.match(/GoodsDetail\.jsp\?[^#]*i_code=(\d+)/))) return `/product/${m[1]}`;
  if ((m = u.match(/(?:^|\/)goods\.momo\?[^#]*i_code=(\d+)/))) return `/m/product/${m[1]}`;

  if (/LgrpCategory\.jsp/.test(u)) return '/category';
  if (/searchShop\.jsp/.test(u)) {
    const kw = (u.match(/keyword=([^&]*)/) || [])[1];
    if (kw) {
      let decoded = kw;
      try { decoded = decodeURIComponent(kw.replace(/\+/g, ' ')); } catch {}
      return '/category?kw=' + encodeURIComponent(decoded);
    }
    return '/category';
  }
  if (/cmmedm\.jsp|edm\.momo|addHtml\.momo/.test(u)) return '/category';
  if (/(^|\/)(cart\/CartList\.jsp|cart)(\?|$)/.test(u)) return '/cart';
  if (/main\/Main\.jsp|momoshop\.com\.tw\/?$/.test(u)) return '/';
  return null;
}

function relink(file, { mobile = false } = {}) {
  if (!fs.existsSync(file)) {
    console.log('  跳过（不存在）:', path.relative(PROJ, file));
    return;
  }
  let html = fs.readFileSync(file, 'utf8');
  const before = (html.match(/data-orig-href=/g) || []).length;

  const stats = { product: 0, category: 0, search: 0, cart: 0, home: 0, kept: 0 };

  html = html.replace(/href="#"\s+data-orig-href="([^"]*)"/g, (full, url) => {
    let href = mapHref(url);
    if (!href) { stats.kept++; return full; }
    if (mobile && href.startsWith('/product/')) href = '/m' + href;
    if (mobile && href.startsWith('/category')) href = '/m' + href;
    if (mobile && href === '/cart') href = '/m/cart';
    if (href.startsWith('/product/')) stats.product++;
    else if (href.includes('/category')) stats.category++;
    else if (href === '/cart' || href === '/m/cart') stats.cart++;
    else if (href === '/' ) stats.home++;
    return `href="${href}" data-orig-href="${url}"`;
  });

  // 顶部「購物車」是 JS 驱动的元素，原站没有 href —— 接上站内购物车
  html = html.replace(/<a id="TopCart"([^>]*)>/g, (full, attrs) => {
    if (/href=/.test(attrs)) return `<a id="TopCart"${attrs.replace(/href="[^"]*"/, `href="${mobile ? '/m/cart' : '/cart'}"`)}>`;
    stats.cart++;
    return `<a id="TopCart" href="${mobile ? '/m/cart' : '/cart'}"${attrs}>`;
  });

  // 搜索交互注入（只对桌面首页；行动版自带表单）
  if (!mobile && !html.includes('首页搜索接线') && html.includes('</body>')) {
    html = html.replace('</body>', SEARCH_JS + '</body>');
  }

  fs.writeFileSync(file, html, 'utf8');
  console.log(`  ${path.relative(PROJ, file)}: ${before} 个链接 → 商品 ${stats.product} / 分类·搜索·活动 ${stats.category} / 购物车 ${stats.cart} / 保留 # ${stats.kept}`);
}

console.log('首页链接接线…');
relink(path.join(PROJ, 'site', 'index.html'));
relink(path.join(PROJ, 'site', 'm', 'index.html'), { mobile: true });
console.log('完成。');
