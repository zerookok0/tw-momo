/**
 * 修裂图：galleryOf() 只对 _L.jpg 这种标准路径派生 R/O/OL
 * TP 路径（TP000/.../xxx_O.webp）派生出来的 _R.jpg 根本不存在
 * 另外给主图加 onerror 兜底
 */
import fs from 'node:fs';
const F = 'lib/render.mjs';
let s = fs.readFileSync(F, 'utf8');

// 1) galleryOf 加路径判定
const oldFn = `function galleryOf(img) {
  if (!img) return [];
  const base = String(img).replace(/_[A-Z]{1,2}\\.(jpg|webp)$/i, "");
  return ['_R.jpg', '_O.jpg', '_OL.jpg'].map((suf) => base + suf);
}`;
const newFn = `function galleryOf(img) {
  if (!img) return [];
  const u = String(img);
  // 只有 .../<code>_L.jpg 这种标准路径才有 R/O/OL 变体
  // TP 路径（TP000/.../xxx_O.webp）没有，强行派生会裂图
  if (!/_L\\.jpg$/i.test(u)) return [u];
  const base = u.replace(/_L\\.jpg$/i, '');
  return ['_R.jpg', '_O.jpg', '_OL.jpg'].map((suf) => base + suf);
}`;
if (!s.includes(oldFn)) { console.error('galleryOf 未匹配'); process.exit(1); }
s = s.replace(oldFn, newFn);
console.log('galleryOf 已加路径判定');

// 2) 手机版主图加 onerror 兜底
s = s.replace(
  '<img id="pdpImg" src="${esc(galleryOf(img)[0] || img)}" alt="${esc(name)}">',
  '<img id="pdpImg" src="${esc(galleryOf(img)[0] || img)}" data-orig="${esc(img)}" onerror="this.onerror=null;if(this.dataset.orig&&this.src!==this.dataset.orig)this.src=this.dataset.orig;" alt="${esc(name)}">'
);

// 3) 桌面版主图同样兜底
s = s.replace(
  '<div class="pdp2__imgbox"><img id="pdpImg" src="${esc(galleryOf(img)[0] || img)}" alt="${esc(name)}"></div>',
  '<div class="pdp2__imgbox"><img id="pdpImg" src="${esc(galleryOf(img)[0] || img)}" data-orig="${esc(img)}" onerror="this.onerror=null;if(this.dataset.orig&&this.src!==this.dataset.orig)this.src=this.dataset.orig;" alt="${esc(name)}"></div>'
);

// 4) 详情大图加 onerror 隐藏
s = s.replace(
  '<div class="r-pdp__imgs">${galleryOf(img).map((u) => `<img src="${esc(u)}" alt="" loading="lazy">`).join(\'\')}</div>',
  '<div class="r-pdp__imgs">${galleryOf(img).map((u) => `<img src="${esc(u)}" data-orig="${esc(img)}" onerror="this.onerror=null;if(this.dataset.orig&&this.src!==this.dataset.orig&&!this.dataset.retried){this.dataset.retried=1;this.src=this.dataset.orig;}else{this.style.display=\'none\'}" alt="" loading="lazy">`).join(\'\')}</div>'
);

fs.writeFileSync(F, s, 'utf8');
console.log('主图/详情图已加 onerror 兜底');
