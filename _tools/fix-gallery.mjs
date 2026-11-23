/**
 * 商品图集重做：
 *   ① galleryOf 统一归一到 img1.momoshop.com.tw，派生 _R/_O/_OL 三张
 *      （实测 10/10 商品四个变体全 200；TP 路径不派生）
 *   ② 手机版主图改成可滑动的 scroll-snap 画廊，索引指示实时更新
 */
import fs from 'node:fs';
const F = 'lib/render.mjs';
let s = fs.readFileSync(F, 'utf8');

// ── ① galleryOf 重写 ──
const oldFn = `function galleryOf(img) {
  if (!img) return [];
  const u = String(img);
  // 只有 .../<code>_L.jpg 这种标准路径才有 R/O/OL 变体
  // TP 路径（TP000/.../xxx_O.webp）没有，强行派生会裂图
  if (!/_L\\.jpg(\\?.*)?$/i.test(u)) return [u];
  const base = u.replace(/_L\\.jpg(\\?.*)?$/i, '');
  return ['_R.jpg', '_O.jpg', '_OL.jpg'].map((suf) => base + suf);
}`;

const newFn = `function galleryOf(img) {
  if (!img) return [];
  const u = String(img);

  // TP 路径（/goodsimg/TP000/.../xxx_O.webp）没有 R/O/OL 变体
  if (/\\/TP\\d+\\//i.test(u)) return [u];

  // 标准路径：/goodsimg/0007/108/072/7108072_L.jpg
  // 统一归一到 img1 域（实测 _L/_R/_O/_OL 全在），去掉时间戳前缀与 query
  const m = u.match(/goodsimg\\/(\\d{4}\\/\\d{3}\\/\\d{3})\\/(\\d+)_[A-Z]{1,2}\\.(?:jpg|webp)/i);
  if (!m) return [u];
  const base = 'https://img1.momoshop.com.tw/goodsimg/' + m[1] + '/' + m[2];
  return ['_R.jpg', '_O.jpg', '_OL.jpg'].map((suf) => base + suf);
}`;

if (!s.includes(oldFn)) { console.error('galleryOf 未匹配'); process.exit(1); }
s = s.replace(oldFn, newFn);
console.log('galleryOf 已重写');

// ── ② 手机版主图改成滑动画廊 ──
const oldHero = `  <section class="r-pdp__hero">
    <img id="pdpImg" src="\${esc(galleryOf(img)[0] || img)}" data-orig="\${esc(img)}" onerror="this.onerror=null;if(this.dataset.orig&&this.src!==this.dataset.orig)this.src=this.dataset.orig;" alt="\${esc(name)}">
    <span class="r-pdp__idx">1/2</span>
  </section>`;

const newHero = `  <section class="r-pdp__hero" id="pdpHero">
    <div class="r-pdp__track" id="pdpTrack">
      \${galleryOf(img).map((u, i) => \`<img class="r-pdp__slide" data-i="\${i}" src="\${esc(u)}" data-orig="\${esc(img)}" onerror="this.onerror=null;if(this.dataset.orig&&this.src!==this.dataset.orig){this.src=this.dataset.orig;}else{this.style.visibility='hidden'}" alt="\${esc(name)}">\`).join('')}
    </div>
    \${galleryOf(img).length > 1 ? \`<span class="r-pdp__idx" id="pdpIdx">1/\${galleryOf(img).length}</span>\` : ''}
  </section>`;

if (!s.includes(oldHero)) { console.error('hero 未匹配'); process.exit(1); }
s = s.replace(oldHero, newHero);
console.log('手机主图已改成画廊');

// ── ③ 画廊脚本：滚动/触摸更新索引 ──
const scriptAnchor = '<div class="m-toast" id="toast"></div>';
if (!s.includes('pdpTrack') === false) {
  // 插到 m-toast 之后
  const extra = `<div class="m-toast" id="toast"></div>
<script>
(function(){
  var track = document.getElementById('pdpTrack');
  var idx = document.getElementById('pdpIdx');
  if (!track || !idx) return;
  var n = track.children.length;
  if (n < 2) return;
  function sync() {
    var w = track.clientWidth || 1;
    var i = Math.round(track.scrollLeft / w);
    i = Math.max(0, Math.min(n - 1, i));
    idx.textContent = (i + 1) + '/' + n;
  }
  track.addEventListener('scroll', function () {
    clearTimeout(track._t);
    track._t = setTimeout(sync, 60);
  }, { passive: true });
  sync();
})();
</script>`;
  if (!s.includes("document.getElementById('pdpTrack')")) {
    s = s.replace(scriptAnchor, extra);
    console.log('画廊脚本已插入');
  }
}

fs.writeFileSync(F, s, 'utf8');
console.log('done');
