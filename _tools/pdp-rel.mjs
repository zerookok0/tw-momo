/**
 * 桌面商品页：标题格式 + 推薦商品楼层（上次忘了写盘，这次补上）
 */
import fs from 'node:fs';
const F = 'lib/render.mjs';
let s = fs.readFileSync(F, 'utf8');
let n = 0;

// 1) 标题格式
const oldT = 'desktopShell({ title: `${name} - momo購物網`, body, head: UTM_SCRIPT });';
if (s.includes(oldT)) {
  s = s.replace(oldT, 'desktopShell({ title: `${name} - momo購物網 - 好評推薦 -${new Date().getFullYear()}年${new Date().getMonth() + 1}月`, body, head: UTM_SCRIPT });');
  n++;
}

// 2) relItems 变量
if (!s.includes('relItems')) {
  const anchor = '  const body = `\n<div class="wrap pdp2-wrap">';
  if (!s.includes(anchor)) { console.error('找不到 pdp2 body 锚点'); process.exit(1); }
  s = s.replace(anchor, '  const relItems = (allItems() || []).filter((x) => String(x.code) !== String(p.code) && x.img && x.cat === p.cat).slice(0, 12);\n\n' + anchor);
  n++;
}

// 3) 推薦商品楼层：插在 pdp2 结构结束之后、<script> 之前
if (!s.includes('pdp2__rel')) {
  const marker = '<div class="pdp2__actions">';
  const si = s.indexOf(marker);
  if (si < 0) { console.error('找不到 pdp2__actions'); process.exit(1); }
  // 找到 actions 之后的 </div>\n  </div>\n</div>
  const tail = '</div>\n  </div>\n</div>\n';
  const ti = s.indexOf(tail, si);
  if (ti < 0) { console.error('找不到结构结尾'); process.exit(1); }
  const rel = `</div>
  </div>
</div>

  <section class="card pdp2__rel" style="margin-top:14px">
    <div class="card__hd"><h2>推薦商品</h2><a class="cart-summary__count" href="/category">看更多 ›</a></div>
    <div class="card__bd"><div class="cat-grid">\${relItems.map((x) => \`
      <a class="cat-card" href="/product/\${x.code}">
        <div class="cat-card__img"><img src="\${x.img}" alt="" loading="lazy"><span class="cat-card__off">5折</span></div>
        <div class="cat-card__body">
          <p class="cat-card__name">\${esc(String(x.name).slice(0, 40))}</p>
          <div class="cat-card__price">$\${Math.round(Number(x.price) / 2).toLocaleString('en-US')}<s>$\${Number(x.price).toLocaleString('en-US')}</s></div>
        </div>
      </a>\`).join('')}</div></div>
  </section>
`;
  s = s.slice(0, ti) + rel + s.slice(ti + tail.length);
  n++;
}

fs.writeFileSync(F, s, 'utf8');
console.log('修改点:', n, ' 含 pdp2__rel:', s.includes('pdp2__rel'), ' 含 relItems:', s.includes('relItems'));
