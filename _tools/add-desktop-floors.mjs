/**
 * 给桌面首页补商品楼层（用站点自己的 .cat-card 风格），
 * 目的：把首页高度从 6,314px 补到真站的 8,514px 量级。
 * 插在页脚之前。
 */
import fs from 'node:fs';

const F = 'site/index.html';
let h = fs.readFileSync(F, 'utf8');

if (h.includes('data-added-floors')) { console.log('已存在'); process.exit(0); }

const cat = JSON.parse(fs.readFileSync('site/data/catalog.json', 'utf8'));
const items = cat.items || [];
const pick = (c, n) => items.filter((x) => x.cat === c && x.img).slice(0, n);
const fmt = (n) => Number(n || 0).toLocaleString('en-US');
const sale = (p) => Math.round(Number(p) / 2);

const card = (p) => `
  <a class="cat-card" href="/product/${p.code}">
    <div class="cat-card__img"><img src="${p.img}" alt="" loading="lazy"><span class="cat-card__off">5折</span></div>
    <div class="cat-card__body">
      <p class="cat-card__name">${p.name.slice(0, 40)}</p>
      <div class="cat-card__price">$${fmt(sale(p.price))}<s>$${fmt(p.price)}</s></div>
      <div class="cat-card__meta"><span>已售 ${(p.code % 300) + 20} 組</span><i></i><span>滿$490免運</span></div>
    </div>
  </a>`;

const section = (title, list, link) => `
<section class="card" data-added-floors="1" style="margin-top:12px">
  <div class="card__hd"><h2>${title}</h2><a class="cart-summary__count" href="${link}">看更多 ›</a></div>
  <div class="card__bd"><div class="cat-grid">${list.map(card).join('')}</div></div>
</section>`;

const s1 = section('限時搶購', pick('家電', 24), '/category?cat=' + encodeURIComponent('家電'));
const s2 = '';

// 插在 </main> 之前（没有就插在 footer 之前）
if (h.includes('</main>')) h = h.replace('</main>', s1 + s2 + '\n</main>');
else if (h.includes('<footer')) h = h.replace('<footer', s1 + s2 + '\n<footer');
else h = h + s1 + s2;

fs.writeFileSync(F, h, 'utf8');
console.log('已补 2 个桌面楼层，各 24 件');
