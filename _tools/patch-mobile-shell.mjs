/**
 * 手机版 购物车 / 结账 / 订单：外壳换成 r-*（头部与底栏），页面主体保留原类名
 * 之后再靠 CSS 把 m-cart / m-cobar / m-cardfields 等映射成 r-* 观感。
 */
import fs from 'node:fs';
const F = '_tools/build-mobile.mjs';
let s = fs.readFileSync(F, 'utf8');

if (s.includes('function rHeader(')) { console.log('已存在'); process.exit(0); }

// 1) 新增 rHeader / rTabbar（与首页同一套 markup）
const helpers = `
/* ── 手机版统一外壳（与首页 r-* 一致） ── */
function rHeader({ back = false, cartCount = 3, showSearch = false, title = '' } = {}) {
  const left = back
    ? '<a class="r-hd__menu" href="/m/" aria-label="返回"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg></a>'
    : '<button class="r-hd__menu" type="button" aria-label="選單"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>';
  const mid = title
    ? '<span class="r-hd__title">' + title + '</span>'
    : '<span class="r-hd__tag">新品<em>🔥</em></span>' +
      '<form class="r-hd__search" onsubmit="event.preventDefault();location.href=\\'/m/category?kw=\\'+encodeURIComponent(this.q.value)"><input name="q" type="search" placeholder="除濕機" aria-label="搜尋"></form>';
  return \`
<header class="r-hd">
  \${left}
  \${mid}
  <a class="r-hd__ico" href="/m/cart" aria-label="購物車">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h2l2.2 10.2a1 1 0 0 0 1 .8h8.4a1 1 0 0 0 1-.8L19.5 8H6"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></svg>
    \${cartCount ? '<i class="r-hd__badge">' + cartCount + '</i>' : ''}
  </a>
</header>\`;
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
    return \`<a href="\${i.href}"\${i.t === current ? ' class="on"' : ''}>\${ico}<span>\${i.t}</span></a>\`;
  }).join('') + '</nav>';
}
`;

// 插到 tabbar 函数后面
const marker = '\nconst crumb = (items) => `';
s = s.replace(marker, helpers + marker);

// 2) 三页外壳替换
s = s.replace(/\$\{header\(\{ showSearch: false, showNav: false, cartCount: 3 \}\)\}/g, '${rHeader({ back: true, cartCount: 3 })}');
s = s.replace(/\$\{header\(\{ showSearch: false, showNav: false \}\)\}/g, '${rHeader({ back: true, cartCount: 0 })}');
s = s.replace(/\$\{tabbar\('首頁'\)\}/g, '${rTabbar(\'首頁\')}');

fs.writeFileSync(F, s, 'utf8');
console.log('外壳已替换为 r-*');
