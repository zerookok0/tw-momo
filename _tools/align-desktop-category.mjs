/**
 * 桌面分类页对齐真站：
 *   1. 标题格式 `{分类},{顶级} - momo購物網 - 好評推薦 - 2026年11月`
 *   2. 顶部胶囊 chip 行（真站两行胶囊）
 *   3. Banner 轮播（3 张）
 *   4. 「音訊關鍵字」圆形图标横排
 *   5. 参考图：_ref/real/category-desktop.jpg
 */
import fs from 'node:fs';

// ── A. render.mjs：分类页桌面分支改造 ──
const F = 'lib/render.mjs';
let s = fs.readFileSync(F, 'utf8');

// 1) 标题
const oldTitle = "return desktopShell({ title: (kw ? `${kw} - ` : '') + '商品分類 - momo購物網', body, head: UTM_SCRIPT });";
if (s.includes(oldTitle)) {
  s = s.replace(oldTitle,
    "return desktopShell({ title: (kw ? `${kw}` : (cat || '全部商品')) + ' - momo購物網 - 好評推薦 - ' + new Date().getFullYear() + '年' + (new Date().getMonth() + 1) + '月', body, head: UTM_SCRIPT });");
  console.log('分类页标题已改');
}

// 2) 在桌面分类页 body 开头插入 胶囊行 + banner + 关键字
const catBodyAnchor = `  const body = \`
<div class="wrap">
  <nav class="crumb"><a href="/">首頁</a><span class="sep">/</span><span>\${kw ? \`搜尋「\${esc(kw)}」\` : '商品分類'}</span></nav>`;
if (!s.includes('catpage-pills') && s.includes(catBodyAnchor)) {
  const inject = `  const body = \`
<div class="wrap">
  <nav class="crumb"><a href="/">首頁</a><span class="sep">/</span><span>\${kw ? \`搜尋「\${esc(kw)}」\` : (catName ? esc(catName) : '商品分類')}</span></nav>

  <section class="catpage-pills">
    <a class="pill on" href="\${base}">館長推薦</a>
    <a class="pill" href="\${base}">☆雙11最優惠看這週☆</a>
    <a class="pill" href="\${base}">mo幣加碼專區</a>
    <a class="pill" href="\${base}">找價一目了然</a>
    <a class="pill" href="\${base}">品牌(A-G)</a>
    <a class="pill" href="\${base}">品牌(H-O)</a>
    <a class="pill" href="\${base}">品牌(P-Z)</a>
    <a class="pill" href="\${base}">專業電競★玩家體驗</a>
    <a class="pill" href="\${base}">關鍵字</a>
  </section>

  <section class="catpage-banner">
    <button class="catpage-banner__nav prev" type="button" aria-label="上一張">‹</button>
    <div class="catpage-banner__view">
      <img src="\${(allItems()[0] || {}).img || ''}" alt="">
    </div>
    <button class="catpage-banner__nav next" type="button" aria-label="下一張">›</button>
  </section>

  <section class="catpage-kw">
    <h2>音訊關鍵字</h2>
    <div class="catpage-kw__row">
      \${['耳塞式', '耳罩式', '真無線', '藍牙喇叭', '運動耳機', '降噪耳機', '電競耳機', '有線耳機', '麥克風', '收音'].map((t, i) => \`
        <a href="/category?kw=\${encodeURIComponent(t)}"><i><img src="\${((allItems()[i * 7] || {}).img) || ''}" alt=""></i><b>\${t}</b></a>
      \`).join('')}
    </div>
  </section>`;
  s = s.replace(catBodyAnchor, inject);
  console.log('分类页胶囊/banner/关键字已插入');
}

fs.writeFileSync(F, s, 'utf8');
console.log('写入完成');
