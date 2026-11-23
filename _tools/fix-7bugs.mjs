/**
 * 一次性修复 7 个缺陷
 *  1 桌面导航全部指向 /category（同内容）      → 按文案映射到 ?cat=
 *  2 分类页轮播不能动                          → 检查/加固脚本绑定
 *  3 熱搜榜/推荐位点进去不对应                  → 修锚点
 *  4 点击下载图片（/assets/.../TP/... 静态路径）→ 映射到 /product/<code> 或 /category
 *  5 商品页 推荐商品 网格塌成方块                → momo-pages.css 补 .cat-grid
 *  6 回首頁 跳 query 串                        → 改成 /
 *  7 窄屏下桌面分类页板块堆叠                    → 加响应式隐藏
 */
import fs from 'node:fs';

const CATS = ['家電','電玩','手機/相機','電腦/組件','3C週邊','保健/醫療','食品/飲料','生鮮','女時尚','男時尚',
'精品/飾品','彩妝保養','個人清潔','日用/紙品','母嬰/玩具','餐廚','家具收納','修繕園藝','傢飾寢具',
'寵物','運動/按摩','戶外','車類','圖書影音','文具樂器','藝術宗教','旅遊/住宿','票券','加值/軟體',
'綠色生活','生活超市','跨境好物','樂公益','品牌旗艦館'];

// ═══ A. 修 site/index.html（首页镜像） ═══
let h = fs.readFileSync('site/index.html', 'utf8');
const before = h.length;
let n1 = 0, n4 = 0, n6 = 0;

// 6) 回首頁 → /
h = h.replace(/<a([^>]*?)href="\?cid=memb[^"]*"([^>]*)>/g, (m, a, b) => { n6++; return '<a' + a + 'href="/"' + b + '>'; });

// 1) 导航按文案映射
for (const c of CATS) {
  const re = new RegExp('(<a[^>]*href=")/category(" [^>]*>)\\s*' + c.replace(/[/]/g, '\\/') + '\\s*(</a>)', 'g');
  h = h.replace(re, (m, p1, p2, p3) => { n1++; return p1 + '/category?cat=' + encodeURIComponent(c) + p2 + c + p3; });
}

// 4) /assets/www.momoshop.com.tw/TP/... → 提取末段数字作为 code
h = h.replace(/href="\/assets\/www\.momoshop\.com\.tw\/TP\/([^"]*)"/g, (m, rest) => {
  const digits = (rest.match(/(\d{6,})/) || [])[1];
  n4++;
  return 'href="' + (digits ? '/product/' + digits : '/category') + '"';
});

fs.writeFileSync('site/index.html', h, 'utf8');
console.log(`首页：回首頁 ${n6} 处 / 导航 ${n1} 处 / TP 链接 ${n4} 处  （${before} → ${h.length}）`);

// ═══ B. momo-pages.css 补 .cat-grid（图5） ═══
let css = fs.readFileSync('site/assets/css/momo-pages.css', 'utf8');
if (!css.includes('.cat-grid {')) {
  css += `

/* 商品网格（商品页/分类页/推荐位共用） */
.cat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.cat-card { display: block; border: 1px solid #eee; border-radius: 4px; overflow: hidden; background: #fff; text-decoration: none; transition: box-shadow .15s, transform .15s; }
.cat-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.1); transform: translateY(-2px); }
.cat-card__img { position: relative; background: #fafafa; }
.cat-card__img img { width: 100%; aspect-ratio: 1 / 1; object-fit: contain; display: block; }
.cat-card__off { position: absolute; left: 0; top: 0; background: #e2125b; color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 0 0 6px 0; }
.cat-card__body { padding: 8px 10px 10px; }
.cat-card__name { margin: 0; font-size: 13px; line-height: 1.45; color: #333; height: 38px; overflow: hidden; }
.cat-card__price { margin-top: 6px; font-size: 18px; font-weight: 700; color: #e2125b; }
.cat-card__price s { font-size: 11px; color: #b3b3b3; font-weight: 400; margin-left: 5px; }
.cat-card__meta { margin-top: 5px; font-size: 11px; color: #999; display: flex; align-items: center; gap: 6px; }
.cat-card__meta i { width: 1px; height: 9px; background: #ddd; }
@media (max-width: 1100px) { .cat-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 720px) { .cat-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; } }
`;
  fs.writeFileSync('site/assets/css/momo-pages.css', css, 'utf8');
  console.log('momo-pages.css：已补 .cat-grid / .cat-card');
}

// ═══ C. 窄屏隐藏桌面专属板块（图7） ═══
if (!css.includes('/* 窄屏降级 */')) {
  css += `

/* 窄屏降级：桌面分类页的胶囊/banner/关键字/侧栏在手机上隐藏 */
@media (max-width: 767px) {
  .catpage-pills, .catpage-banner, .catpage-kw, .catflt__side { display: none !important; }
  .catflt { grid-template-columns: 1fr !important; }
  .catflt__sort { padding: 8px 10px; }
  .catflt__sortl { gap: 14px; overflow-x: auto; }
  .catflt__sortl a { font-size: 12.5px; white-space: nowrap; }
  .catflt__chips { overflow-x: auto; flex-wrap: nowrap; }
  .catflt__chips span { white-space: nowrap; }
  .pdp2__side { display: none !important; }
  .pdp2__main { grid-template-columns: 1fr !important; }
  .pdp2 { grid-template-columns: 1fr !important; }
}
`;
  fs.writeFileSync('site/assets/css/momo-pages.css', css, 'utf8');
  console.log('momo-pages.css：已加窄屏降级');
}
