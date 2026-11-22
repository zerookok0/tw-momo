/**
 * 给手机首页补 7 个楼层（用占位符避免模板转义问题）
 *   @@P(code)@@      → ${P(code)}
 *   @@sale(x)@@      → ${sale(x)}
 *   @@fmt(x)@@       → ${fmt(x)}
 *   @@img(a,b)@@     → ${img('a', b)}
 *   @@pick(a,b)@@    → pick('a', b)
 *   @@ICO.chev@@     → ${ICO.chev}
 */
import fs from 'node:fs';
const F = '_tools/mobile-home.mjs';
let s = fs.readFileSync(F, 'utf8');
if (s.includes('r-livebar')) { console.log('已存在'); process.exit(0); }

const raw = `
  <!-- 9. 直播条 -->
  <a class="r-livebar" href="/m/category">
    <span>直播下單滿額登記送<em>2%</em></span>
    <span class="r-livebar__more">直播大廳 @@ICO.chev@@</span>
  </a>

  <!-- 10. LIVE 短影音 横滑 -->
  <section class="r-live">
    <div class="r-live__row">
      <a class="r-live__card" href="/m/category">
        <div class="r-live__img"><img src="@@img(女時尚,2)@@" alt=""><span class="r-live__tag">LIVE</span></div>
        <b>【火熱榜單大公開】偷看大家的購物車</b>
        <span class="r-live__cta">精選搶購</span>
      </a>
      <a class="r-live__card r-live__card--blue" href="/m/category">
        <div class="r-live__img"><img src="@@img(彩妝保養,2)@@" alt=""><span class="r-live__date">11.1-11.30</span></div>
        <b>全月滿額登記贈<br>直播限定品</b>
        <span class="r-live__cta r-live__cta--blue">點我看更多</span>
      </a>
      <a class="r-live__card" href="/m/category">
        <div class="r-live__img"><img src="@@img(食品/飲料,2)@@" alt=""></div>
        <b>全程冷鏈 涼感直送</b>
        <span class="r-live__cta">立即看</span>
      </a>
    </div>
  </section>

  <!-- 11. 商品行：分次配限定 -->
  <section class="r-sec">
    <div class="r-sec__hd"><h2>分次配限定天天享優惠價</h2><a href="/m/category">看更多 @@ICO.chev@@</a></div>
    <div class="r-row2">
      <a class="r-row2__lead" href="/info/fast-delivery">
        <b>分次配</b><span>首單滿額送<br><em>5%</em></span><i>立即下單</i>
      </a>
@@ROW2_A@@
    </div>
  </section>

  <!-- 12. 商品行：横滑 -->
  <section class="r-sec">
    <div class="r-sec__hd"><h2>$499 起</h2><a href="/m/category">看更多 @@ICO.chev@@</a></div>
    <div class="r-row2">
@@ROW2_B@@
    </div>
  </section>

  <!-- 13. momo全站滿額回饋 -->
  <section class="r-rebate">
    <div class="r-rebate__hd"><span>momo</span>全站滿額回饋<i>回饋</i></div>
    <div class="r-rebate__grid">
      <div class="r-rebate__col">
        <div class="r-rebate__item"><b>今日</b>累積滿5千<em>送$200</em></div>
        <div class="r-rebate__item"><b>今日</b>累積滿1.2萬<em>送$400</em></div>
        <div class="r-rebate__item"><b>今日</b>累積滿3.5萬<em>送$900</em></div>
      </div>
      <div class="r-rebate__col">
        <div class="r-rebate__item"><b>momo卡</b>今日單筆分期滿<em>送$200</em></div>
        <div class="r-rebate__item"><b>新會員</b>辦升級 筆筆<em>3%回饋</em></div>
      </div>
    </div>
  </section>

  <!-- 14. 防詐騙提示 -->
  <a class="r-warn" href="/info/anti-fraud">
    <span class="r-warn__ico">⚠️</span>
    <span>當心「發票中獎」假信件！請勿點擊不明連結</span>
    <em>了解詳情</em>
  </a>

  <!-- 15. 猜你想搜 + 品牌词横滑 -->
  <section class="r-sec">
    <div class="r-sec__hd"><h2>猜你想搜</h2><a href="/m/category">看更多 @@ICO.chev@@</a></div>
    <div class="r-brands">
@@BRANDS@@
    </div>
  </section>

  \${floor('限時搶購'`;

// 生成商品行片段（在补丁脚本里算好，直接内联成最终代码）
const row2 = (cat, n) => `      ` + `\${pick('${cat}', ${n}).map((p) => \`` + '\n' +
  `        <a class="r-row2__item" href="\${P(p.code)}">` + '\n' +
  `          <img src="\${p.img}" alt="" loading="lazy">` + '\n' +
  `          <b>\${p.name.slice(0, 8)}</b>` + '\n' +
  `          <span><em>$\${fmt(sale(p.price))}</em><s>$\${fmt(p.price)}</s></span>` + '\n' +
  `        </a>` + '\n' +
  `      \`).join('')}`;

const brands = `      ` + `\${['LUSH 嵐舒', '歐舒丹護手霜', 'Aesop', '雅詩蘭黛', '蘭蔻', '資生堂'].map((t, i) => \`` + '\n' +
  `        <a href="/m/category?kw=\${encodeURIComponent(t)}"><i><img src="\${img(['彩妝保養','個人清潔','保健/醫療'][i % 3], i + 1)}" alt=""></i><b>\${t}</b></a>` + '\n' +
  `      \`).join('')}`;

let block = raw
  .replace('@@ROW2_A@@', row2('食品/飲料', 3))
  .replace('@@ROW2_B@@', row2('保健/醫療', 4))
  .replace('@@BRANDS@@', brands)
  .replace(/@@img\(([^,]+),(\d+)\)@@/g, (m, a, b) => '${img(\'' + a + '\', ' + b + ')}')
  .replace('@@ICO.chev@@', '${ICO.chev}');

const anchor = "  ${floor('限時搶購'";
if (!s.includes(anchor)) { console.error('找不到锚点'); process.exit(1); }
s = s.replace(anchor, block);
fs.writeFileSync(F, s, 'utf8');
console.log('已补入 7 个楼层');
