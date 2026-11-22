/**
 * 给 /info/* 生成手机版页面
 *
 * 问题：追蹤清單/會員中心这些 /info/* 是桌面模板（1260px 宽 + 桌面 header），
 *      手机点进去就被压成一团。
 * 做法：复用同一份 PAGES 内容与交互脚本，套手机 r-* 外壳，输出到 site/m/info/<slug>.html
 *      交互脚本直接从已生成的桌面页 HTML 里抽取，不重复维护。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(__dirname, '..');
const F = path.join(PROJ, '_tools', 'build-info-pages.mjs');
let s = fs.readFileSync(F, 'utf8');

if (s.includes('function pageMobile')) {
  console.log('pageMobile 已存在，跳过');
  process.exit(0);
}

// 1) 在 page() 之后插入 pageMobile
const anchor = '\nfunction write(rel, content) {';
const mobileFn = `
/** 手机版站内页：r-* 外壳 + 同一份内容与交互脚本 */
function pageMobile(pg, scriptHtml) {
  const body = \`
<header class="r-hd">
  <button class="r-hd__menu" type="button" aria-label="選單"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
  <span class="r-hd__tag">新品<em>🔥</em></span>
  <form class="r-hd__search" onsubmit="event.preventDefault();location.href='/m/category?kw='+encodeURIComponent(this.q.value)">
    <input name="q" type="search" placeholder="除濕機" aria-label="搜尋">
  </form>
  <a class="r-hd__ico" href="/m/category" aria-label="足跡"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/></svg></a>
  <a class="r-hd__ico" href="/m/info/contact" aria-label="消息"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H8l-4 3V5Z"/></svg></a>
</header>

<nav class="r-nav">
  <a href="/m/">首頁</a>
  <a href="/m/category">限時搶購</a>
  <a href="/m/category">直播</a>
  <a href="/m/category">mo店+</a>
  <a href="/m/category">看看買</a>
  <a class="r-nav__more" href="/m/category"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg></a>
</nav>

<main class="r-main r-info">
  <nav class="r-crumb"><a href="/m/">首頁</a><span>/</span><span>\${esc(pg.title)}</span></nav>
  <section class="r-info__card">
    <div class="r-info__hd"><h1>\${esc(pg.title)}</h1></div>
    <div class="r-info__bd info-body">
      <p class="info-intro">\${esc(pg.intro)}</p>
      \${renderSections(pg)}
    </div>
  </section>
</main>

<nav class="r-tab">
  <a href="/m/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8Z"/></svg><span>首頁</span></a>
  <a href="/m/category"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h16l-1.2 11.5a1 1 0 0 1-1 .9H6.2a1 1 0 0 1-1-.9L4 8Z"/><path d="M8.5 8V6a3.5 3.5 0 0 1 7 0v2"/></svg><span>逛逛</span></a>
  <a href="/m/info/wishlist"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.6-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.8C19 15.4 12 20 12 20Z"/></svg><span>追蹤清單</span></a>
  <a href="/m/cart"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h2l2.2 10.2a1 1 0 0 0 1 .8h8.4a1 1 0 0 0 1-.8L19.5 8H6"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></svg><span>購物車</span></a>
  <a href="/m/info/member-center"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.3-3.6 4-5.4 7.5-5.4s6.2 1.8 7.5 5.4"/></svg><span>會員中心</span></a>
</nav>\`;

  return \`<!doctype html>
<html lang="zh-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1">
<title>\${esc(pg.title)} - momo購物網</title>
\${UTM}
<link rel="stylesheet" href="/assets/image.momoshop.com.tw/ecm/font/theme-main.css">
<link rel="stylesheet" href="/m/assets/css/momo-mobile.css">
<link rel="stylesheet" href="/m/assets/css/mobile-home.css">
<link rel="stylesheet" href="/assets/css/momo-info.css">
</head>
<body class="m r-page">
\${body}
\${scriptHtml || ''}
</body>
</html>\`;
}
`;
if (!s.includes(anchor)) { console.error('找不到插入点'); process.exit(1); }
s = s.replace(anchor, mobileFn + anchor);

// 2) 生成循环：同时产出手机版，脚本从桌面页里抽
s = s.replace(
`for (const [slug, pg] of Object.entries(PAGES)) {
  write(path.join('info', slug + '.html'), page(slug, pg));
}`,
`for (const [slug, pg] of Object.entries(PAGES)) {
  const desktop = page(slug, pg);
  write(path.join('info', slug + '.html'), desktop);
  const m = desktop.match(/<script>[\\s\\S]*?<\\/script>/);
  write(path.join('m', 'info', slug + '.html'), pageMobile(pg, m ? m[0] : ''));
}`
);

fs.writeFileSync(F, s, 'utf8');
console.log('已加入 pageMobile 与手机版生成');
