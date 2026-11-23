/**
 * 桌面分类页筛选栏：用普通字符串拼 HTML（不用嵌套模板字面量，避免转义地狱）
 * 1) 在模块作用域加 catFilterSidebar(items) 函数
 * 2) 在 body 模板里 catBar 调用之后插入 ${catFilterSidebar(items)} 和 <div class="catflt__main">
 * 3) 在 pager 之前闭合两层 div
 */
import fs from 'node:fs';
const F = 'lib/render.mjs';
let s = fs.readFileSync(F, 'utf8');
if (s.includes('catflt__side')) { console.log('已存在'); process.exit(0); }

// ── 1) 模块级函数（普通字符串）──
const fn = `
/** 桌面分类页左侧筛选栏（品牌来自商品名【】里的词） */
export function catFilterSidebar(items) {
  const tally = {};
  for (const it of items || []) {
    const m = String(it.name || '').match(/【([^】]{2,12})】/);
    if (m) tally[m[1]] = (tally[m[1]] || 0) + 1;
  }
  const brands = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const li = (label, n) => '<li><label><input type="checkbox"> ' + esc(label) + ' <i>(' + n + ')</i></label></li>';
  const brandHtml = brands.map(([b, n]) => li(b, n)).join('') + '<li class="more">選更多</li>';
  const types = ['有線', '無線', '藍芽', '多合一', '其他'];
  const typeHtml = types.map((t, i) => li(t, Math.max(2, Math.round((items || []).length / (i + 3))))).join('') + '<li class="more">選更多</li>';
  const others = ['功能', '材質', '容量', '尺寸', '顏色', '款式'];
  const tagHtml = others.map((x) => '<span>' + x + '</span>').join('');

  return '<div class="catflt"><aside class="catflt__side">' +
    '<div class="catflt__grp"><h3>品牌</h3><ul>' + brandHtml + '</ul></div>' +
    '<div class="catflt__grp"><h3>類型</h3><ul>' + typeHtml + '</ul></div>' +
    '<div class="catflt__grp"><h3>其他選項</h3><div class="catflt__tags">' + tagHtml + '</div></div>' +
    '</aside><div class="catflt__main">' +
    '<div class="catflt__sort">' +
      '<div class="catflt__sortl"><a class="on" href="#">館長推薦</a><a href="#">月銷量</a><a href="#">新上市</a><a href="#">價格</a><a href="#">評價</a></div>' +
      '<div class="catflt__chips"><span>確認</span><span>momo速配</span><span>廠商出貨</span><span>跨境</span><span>現折</span><span>活動</span><span>折價券</span><span>快速到貨</span><span class="more">展開 ⌄</span></div>' +
    '</div>';
}
`;

// 插到 renderCategoryPage 之前
const anchorFn = 'export function renderCategoryPage(';
if (!s.includes(anchorFn)) { console.error('找不到 renderCategoryPage'); process.exit(1); }
s = s.replace(anchorFn, fn + '\n' + anchorFn);

// ── 2) body 里插入侧栏 ──
const marker = "  ${catBar(cats, cat, 'desktop')}";
if (!s.includes(marker)) { console.error('找不到 catBar 调用'); process.exit(1); }
s = s.replace(marker, marker + '\n\n  ${catFilterSidebar(items)}');

// ── 3) 找 pager 调用并在其前闭合 ──
const pagerRe = /\n(\s*)\$\{mPager\(page, pages, base\)\}/;
if (pagerRe.test(s)) {
  s = s.replace(pagerRe, '\n$1  </div>\n$1</div>\n$1${mPager(page, pages, base)}');
  console.log('已闭合两栏容器');
} else {
  // 桌面可能用 pager() 别的名字
  const alt = s.indexOf('pager(', s.indexOf('catFilterSidebar'));
  console.log('未匹配 mPager，附近内容:', s.slice(alt - 120, alt + 80).replace(/\n/g, ' | '));
}

fs.writeFileSync(F, s, 'utf8');
console.log('筛选栏已插入');
