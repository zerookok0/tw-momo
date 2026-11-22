/**
 * 分类页 Banner 轮播接线：3 张图、左右箭头、自动切换
 * 修掉静态检测报的「‹ › 死按钮」
 */
import fs from 'node:fs';
const F = 'lib/render.mjs';
let s = fs.readFileSync(F, 'utf8');
if (s.includes('catpage-banner__track')) { console.log('已存在'); process.exit(0); }

const oldBan = `  <section class="catpage-banner">
    <button class="catpage-banner__nav prev" type="button" aria-label="上一張">‹</button>
    <div class="catpage-banner__view">
      <img src="\${(allItems()[0] || {}).img || ''}" alt="">
    </div>
    <button class="catpage-banner__nav next" type="button" aria-label="下一張">›</button>
  </section>`;

const neuBan = `  <section class="catpage-banner" id="catBanner">
    <button class="catpage-banner__nav prev" type="button" aria-label="上一張">‹</button>
    <div class="catpage-banner__view">
      <div class="catpage-banner__track" id="catTrack">
        \${[0, 1, 2].map((i) => \`<div class="catpage-banner__slide"><img src="\${(allItems()[i * 11] || {}).img || ''}" alt=""></div>\`).join('')}
      </div>
    </div>
    <button class="catpage-banner__nav next" type="button" aria-label="下一張">›</button>
    <div class="catpage-banner__dots" id="catDots">
      \${[0, 1, 2].map((i) => \`<i class="\${i === 0 ? 'on' : ''}"></i>\`).join('')}
    </div>
  </section>`;

if (!s.includes(oldBan)) { console.error('找不到 banner 片段'); process.exit(1); }
s = s.replace(oldBan, neuBan);

// 插入轮播脚本（放在分类页 body 的末尾 script 之前）
const scriptAnchor = 'return desktopShell({ title: (kw ? `${kw}` : (cat || \'全部商品\'))';
const idx = s.indexOf(scriptAnchor);
if (idx < 0) { console.error('找不到 desktopShell 调用'); process.exit(1); }
const script = `<script>
(function(){
  var track = document.getElementById('catTrack');
  var dots = document.getElementById('catDots');
  var box = document.getElementById('catBanner');
  if (!track || !box) return;
  var n = track.children.length, cur = 0;
  function go(i) {
    cur = (i + n) % n;
    track.style.transform = 'translateX(' + (-cur * 100) + '%)';
    if (dots) [].forEach.call(dots.children, function (d, k) { d.className = k === cur ? 'on' : ''; });
  }
  var prev = box.querySelector('.prev'), next = box.querySelector('.next');
  if (prev) prev.addEventListener('click', function () { go(cur - 1); });
  if (next) next.addEventListener('click', function () { go(cur + 1); });
  if (dots) [].forEach.call(dots.children, function (d, k) { d.addEventListener('click', function () { go(k); }); });
  setInterval(function () { go(cur + 1); }, 4000);
})();
</script>
\`;
`;

// 在分类页 body 模板结束的 ` 前插入 script
const bodyEnd = s.lastIndexOf("`;\n  return desktopShell({ title: (kw ? `${kw}`", idx + 4000);
// 更稳的方式：找到 desktopShell 调用前一行的 `;`
let k = s.lastIndexOf('`;', idx);
if (k < 0) { console.error('找不到 body 结束'); process.exit(1); }
s = s.slice(0, k) + script + s.slice(k);

fs.writeFileSync(F, s, 'utf8');
console.log('轮播已接线');
