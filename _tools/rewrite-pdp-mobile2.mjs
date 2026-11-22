/**
 * 重写手机商品页（行级替换，保留原 script 段）
 * 真站 m 版结构：头部 → 面包屑 → 主图 → 红色今日限定条 → 信息区 → 行列表 → 详情 → 橙条 → 底部 5 按钮
 */
import fs from 'node:fs';
const F = 'lib/render.mjs';
const lines = fs.readFileSync(F, 'utf8').split('\n');

const START = 267;   // 0-based：第 268 行 "if (kind === 'mobile') {"
const END = 353;     // 0-based：第 354 行 return mobileShell(...)
if (!lines[START].includes("if (kind === 'mobile')")) { console.error('起点不符:', lines[START]); process.exit(1); }
if (!lines[END].includes('return mobileShell({ title:')) { console.error('终点不符:', lines[END]); process.exit(1); }

// 原 script 段（从 <script> 到 </script>`）
let scriptFrom = -1, scriptTo = -1;
for (let i = START; i < END; i++) {
  if (lines[i].includes('<script>') && scriptFrom < 0) scriptFrom = i;
  if (lines[i].includes('</script>`;') && scriptFrom >= 0) { scriptTo = i; break; }
}
if (scriptFrom < 0 || scriptTo < 0) { console.error('找不到 script 段'); process.exit(1); }
const scriptLines = lines.slice(scriptFrom, scriptTo + 1);
console.log('保留 script 段:', scriptFrom + 1, '-', scriptTo + 1, `(${scriptLines.length} 行)`);

const body = `  if (kind === 'mobile') {
    // 手机商品页：对照真站 m 版结构
    const body = \`
<header class="r-hd r-hd--pdp">
  <a class="r-hd__menu" href="/m/" aria-label="返回"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg></a>
  <button class="r-hd__menu" type="button" aria-label="選單"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
  <span class="r-hd__logo">momo</span>
  <span class="r-hd__tag">新品<em>🔥</em></span>
  <form class="r-hd__search" onsubmit="event.preventDefault();location.href='/m/category?kw='+encodeURIComponent(this.q.value)">
    <input name="q" type="search" placeholder="\${esc(name.slice(0, 8))}" aria-label="搜尋">
  </form>
  <a class="r-hd__ico" href="/m/category" aria-label="足跡"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/></svg></a>
</header>

<nav class="r-crumb2">
  <a href="/m/">首頁</a><i>›</i>
  <a href="/m/category?cat=\${encodeURIComponent(p.cat || '全部商品')}">\${esc(p.cat || '全部商品')}</a><i>›</i>
  <span>精選品牌推薦</span><i>›</i>
  <span>\${esc((name.match(/【([^】]+)】/) || [0, name.slice(0, 8)])[1])}</span>
</nav>

<main class="r-main r-pdp">
  <section class="r-pdp__hero">
    <img id="pdpImg" src="\${esc(img)}" alt="\${esc(name)}">
    <span class="r-pdp__idx">1/2</span>
  </section>

  <div class="r-pdp__promo">
    <span class="r-pdp__promo-tag">今日限定</span>
    <span class="r-pdp__promo-txt">全站加碼登記送<em>$900</em></span>
  </div>

  <section class="r-pdp__info">
    <div class="r-pdp__slogan">
      <span>享受療癒美人湯的輕旅度假</span>
      <span class="code">品號：\${esc(p.code)}</span>
    </div>
    <h1 class="r-pdp__name">\${esc(name)}</h1>
    <div class="r-pdp__priceline">
      <span class="now"><small>$</small>\${price.toLocaleString('en-US')}</span>
      <span class="tag">限時折後價</span>
      <span class="sold">總銷量>\${((Number(p.code) % 9) + 1)},000</span>
    </div>
    <div class="r-pdp__wasline">
      <span><b>$\${Math.round(price * 1.045).toLocaleString('en-US')}</b> 促銷價</span>
      <span><s>$\${was.toLocaleString('en-US')}</s> 市售價</span>
    </div>
    <div class="r-pdp__discount">
      <span class="chip">現折</span>
      <span class="txt">滿1件折121元</span>
      <a class="more" href="/m/category">活動賣場 ›</a>
    </div>
    <a class="r-pdp__rank" href="/m/category"><span class="ico">🔥</span> 入圍 飯店 熱銷排行 <em>查看 ›</em></a>
  </section>

  <section class="r-pdp__rows">
    <div class="r-pdp__row"><span class="k">訂閱 moPro</span><span class="v">加入moPro會員享專屬權益</span></div>
    <div class="r-pdp__row"><span class="k">折價券</span><span class="v">特惠商品，不適用折價券</span></div>
    <div class="r-pdp__row"><span class="k">規格</span><span class="v" id="pdpSkusM">\${skuChips(p, 'mobile')}</span></div>
    <div class="r-pdp__row"><span class="k">數量</span><span class="v"><span class="r-qty"><button type="button" data-q="-1">−</button><input id="pdpQty" value="1" inputmode="numeric"><button type="button" data-q="1">＋</button></span></span></div>
    <div class="r-pdp__row"><span class="k">配送</span><span class="v">賣家宅配／超商取貨　<span class="pink">滿 $490 免運</span></span></div>
  </section>

  <section class="r-pdp__detail">
    <h3>商品詳情</h3>
    <p>\${esc(name)}，momo 購物網正式授權經銷，商品皆為台灣公司貨，享原廠保固與售後服務。</p>
    <div class="r-pdp__imgs">\${[0, 1, 2].map(() => \`<img src="\${esc(img)}" alt="" loading="lazy">\`).join('')}</div>
    <h3>規格說明</h3>
    <table class="r-spec">
      <tr><th>商品編號</th><td>\${esc(p.code)}</td></tr>
      <tr><th>商品分類</th><td>\${esc(p.cat || '其他')}</td></tr>
      <tr><th>原價</th><td><s>\${fmt(was)}</s></td></tr>
      <tr><th>5 折價</th><td class="pink">\${fmt(price)}</td></tr>
      <tr><th>產地</th><td>依原廠標示</td></tr>
      <tr><th>保固</th><td>原廠保固（非人為損壞）</td></tr>
    </table>
  </section>

  <div class="r-pdp__ship">訂單確認後，商品預計\${new Date(Date.now() + 864e5).getFullYear()}/\${new Date(Date.now() + 864e5).getMonth() + 1}/\${new Date(Date.now() + 864e5).getDate()}出貨</div>
</main>

<div class="r-buybar r-buybar--pdp">
  <a class="r-buybar__mini" href="/m/info/wishlist"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.6-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.8C19 15.4 12 20 12 20Z"/></svg><span>追蹤</span></a>
  <a class="r-buybar__mini" href="/m/info/wishlist"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.6-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.8C19 15.4 12 20 12 20Z"/></svg><span>追蹤清單</span></a>
  <a class="r-buybar__mini" href="/m/cart"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h2l2.2 10.2a1 1 0 0 0 1 .8h8.4a1 1 0 0 0 1-.8L19.5 8H6"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></svg><span>購物車</span></a>
  <button type="button" class="r-buybar__add" id="btnAdd">加入購物車</button>
  <button type="button" class="r-buybar__buy" id="btnBuy">直接購買</button>
</div>
<div class="m-toast" id="toast"></div>`.split('\n');

const out = [
  ...body,
  ...scriptLines,
  '    return mobileShell({ title: `${name} - momo購物網 - 好評推薦 -${new Date().getFullYear()}年${new Date().getMonth() + 1}月`, head: UTM_SCRIPT, body });',
  '  }',
];

lines.splice(START, END - START + 1, ...out);
fs.writeFileSync(F, lines.join('\n'), 'utf8');
console.log('替换完成，新行数:', lines.length);
