/**
 * 桌面分类页补：左侧筛选栏（品牌/類型/其他選項）+ 顶部排序栏
 * 真站实测：
 *   侧栏  品牌 SONY 索尼(386) Anker soundcore(37) ... 「選更多」
 *         類型 有線(1532) 無線(1551) ...  尺寸 ... 其他選項 功能/材質/容量...
 *   排序  館長推薦 月銷量 新上市 價格 評價 + 篩選 chips（確認/momo速配/廠商出貨/現折/活動/折價券/快速到貨/展開）
 */
import fs from 'node:fs';
const F = 'lib/render.mjs';
let s = fs.readFileSync(F, 'utf8');
if (s.includes('catflt')) { console.log('已存在'); process.exit(0); }

// 1) 在桌面分类页 body 里，把商品网格包进两栏布局
const anchor = '  <section class="catpage-kw">';
if (!s.includes(anchor)) { console.error('找不到 catpage-kw 锚点'); process.exit(1); }

// 找到 catBar 与 grid 的位置：在 catBar 之后插入 排序栏 + 侧栏 + 网格容器
const marker = '  ${catBar(cats, cat, \'desktop\')}';
if (!s.includes(marker)) { console.error('找不到 catBar 调用'); process.exit(1); }

const inject = `  ${catBar(cats, cat, 'desktop')}

  ${(() => {
    // 从本页商品名里抽【品牌】做左侧筛选
    const tally = {};
    for (const it of items) {
      const m = String(it.name || '').match(/【([^】]{2,12})】/);
      if (m) tally[m[1]] = (tally[m[1]] || 0) + 1;
    }
    const brands = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const types = ['有線', '無線', '藍芽', '多合一', '其他'];
    const others = ['功能', '材質', '容量', '尺寸', '顏色', '款式'];
    return \`
  <div class="catflt">
    <aside class="catflt__side">
      <div class="catflt__grp">
        <h3>品牌</h3>
        <ul>
          \${brands.map(([b2, n2]) => \`<li><label><input type="checkbox"> \${esc(b2)} <i>(\${n2})</i></label></li>\`).join('')}
          <li class="more">選更多</li>
        </ul>
      </div>
      <div class="catflt__grp">
        <h3>類型</h3>
        <ul>
          \${types.map((t2, i) => \`<li><label><input type="checkbox"> \${t2} <i>(\${(items.length / (i + 3)) | 0})</i></label></li>\`).join('')}
          <li class="more">選更多</li>
        </ul>
      </div>
      <div class="catflt__grp">
        <h3>其他選項</h3>
        <div class="catflt__tags">\${others.map((x2) => \`<span>\${x2}</span>\`).join('')}</div>
      </div>
    </aside>

    <div class="catflt__main">
      <div class="catflt__sort">
        <div class="catflt__sortl">
          <a class="on" href="#">館長推薦</a>
          <a href="#">月銷量</a>
          <a href="#">新上市</a>
          <a href="#">價格</a>
          <a href="#">評價</a>
        </div>
        <div class="catflt__chips">
          <span>確認</span><span>momo速配</span><span>廠商出貨</span>
          <span>跨境</span><span>現折</span><span>活動</span>
          <span>折價券</span><span>快速到貨</span><span class="more">展開 ⌄</span>
        </div>
      </div>`;
  })()}`;

s = s.replace(marker, inject);

// 2) 在分页器之前闭合两栏容器
const closeAnchor = '  ${mPager(page, pages, base)}';
if (s.includes(closeAnchor)) {
  s = s.replace(closeAnchor, `    </div>
  </div>

${closeAnchor}`);
} else {
  // 桌面分页器名可能不同，找 pager 调用
  const pagerIdx = s.indexOf('pager', s.indexOf('catflt'));
  console.log('未找到分页器锚点，需手工确认，pager 位置:', pagerIdx);
}

fs.writeFileSync(F, s, 'utf8');
console.log('分类页筛选栏已插入');
