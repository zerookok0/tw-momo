/**
 * 把「限時搶購」楼层改成真站的粉底商品墙（倒计时 + 角标 + 促销条）
 */
import fs from 'node:fs';
const F = '_tools/mobile-home.mjs';
let s = fs.readFileSync(F, 'utf8');

if (s.includes('r-wall')) { console.log('已存在'); process.exit(0); }

// 1) 替换调用
const oldCall = "${floor('限時搶購', '家電', plat('家電'), '<span class=\"r-sec__cd\">02:07:03</span>', 20)}";
if (!s.includes(oldCall)) { console.error('找不到限時搶購调用'); process.exit(1); }
s = s.replace(oldCall, '${seckillWall()}');

// 2) 插入 seckillWall 实现（放在 floor 函数之前）
const impl = `
  /** 真站那种粉底商品墙：倒计时 + 角标 + 促销条 + 播放按钮 */
  function seckillWall() {
    const list = pick('家電', 20);
    if (!list.length) return '';
    const badges = ['東芝官方<br>NO.1 好評熱銷', '限時售完<br>-55折', '今日爆款<br>TOP 1', '限時特惠<br>-42折'];
    const promos = ['升級QLED★省$1,989', '買60ml送126ml', '登記抽$1,000', '滿$990折$100'];
    const tags = ['今日限定', '11/23限定', '今日限定', '11/23限定'];
    return \`
  <section class="r-wall">
    <div class="r-wall__hd">
      <h2>🔥 限時搶購</h2>
      <span class="r-wall__cd"><i>04</i>:<i>24</i>:<i>24</i></span>
      <a class="r-wall__more" href="\${plat('家電')}">\${ICO.chev}</a>
    </div>
    <div class="r-wall__grid">
      \${list.map((p, i) => {
        const s2 = sale(p.price);
        return \`<a class="r-wall__card" href="\${P(p.code)}">
        <span class="r-wall__badge">\${badges[i % 4]}</span>
        <div class="r-wall__img">
          <img src="\${p.img}" alt="" loading="lazy">
          <span class="r-wall__play"></span>
          <span class="r-wall__tag">\${tags[i % 4]}</span>
        </div>
        <span class="r-wall__promo">\${promos[i % 4]}</span>
        <b>\${p.name.slice(0, 22)}</b>
        <span class="r-wall__price">限搶價<em>$\${fmt(s2)}</em><s>$\${fmt(p.price)}</s></span>
      </a>\`;
      }).join('')}
    </div>
  </section>\`;
  }

`;

s = s.replace("  function floor(title, cat, link, badge, count = 6) {", impl + "  function floor(title, cat, link, badge, count = 6) {");

fs.writeFileSync(F, s, 'utf8');
console.log('限時搶購墙已替换');
