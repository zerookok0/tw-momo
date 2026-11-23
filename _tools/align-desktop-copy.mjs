/**
 * 桌面首页文案对齐真站：
 *   1. <title> 2025年10月 → 2026年11月
 *   2. 顶部导航补「分潤計劃」
 *   3. 猜你想搜关键词换成真站当前值
 *   4. 熱搜榜 9 条换成真站当前值（名称 + 热度）
 *   5. 底部关键词横滑换成真站当前值
 */
import fs from 'node:fs';
const F = 'site/index.html';
let h = fs.readFileSync(F, 'utf8');
const before = h;
let n = 0;

// 1) 标题
h = h.replace(/2025年10月/g, '2026年11月');

// 2) 顶部导航补「分潤計劃」（真站在 點點賺 后面）
if (!h.includes('分潤計劃') && h.includes('title="點點賺"')) {
  h = h.replace(
    /(<a href="[^"]*" title="點點賺"[^>]*><div class="flex items-center"><span>點點賺<\/span><\/div><\/a><\/li>)/,
    (m) => m + '<li class="relative m-0 cursor-pointer px-2.5 text-nav leading-10"><a href="/info/cooperation" title="分潤計劃" class="m-0 flex p-0 text-nav leading-10 text-momo-neutralStrong"><div class="flex items-center"><span>分潤計劃</span></div></a></li>'
  );
  n++;
}

// 3) 猜你想搜
const HOT_KW = ['皮卡丘', '不鏽鋼炒鍋', '小米行動電源', '雙人沙發', '扭扭樂'];
h = h.replace(/(<li data-keyword-item="true"[\s\S]*?<\/li>(\s*<li data-keyword-item="true"[\s\S]*?<\/li>)*)/, (block) => {
  const items = [...block.matchAll(/<li data-keyword-item="true"[\s\S]*?<\/li>/g)];
  if (!items.length) return block;
  let out = '';
  HOT_KW.forEach((kw, i) => {
    out += items[i % items.length][0].replace(/>([^<>]{1,20})</g, (m, inner, off) => {
      // 只替换文本节点（不动标签属性）
      return m;
    });
  });
  return block;
});

// 上面那种替换太脆，改成逐个关键字替换文本
const REPL = [
  ['雨傘王防曬傘', '皮卡丘'],
  ['NIKE 童 學步鞋', '不鏽鋼炒鍋'],
  ['NIKE童學步鞋', '不鏽鋼炒鍋'],
  ['酪梨油 3入', '小米行動電源'],
  ['酪梨油3入', '小米行動電源'],
];
for (const [from, to] of REPL) {
  if (h.includes(from)) { h = h.split(from).join(to); n++; }
}

// 4) 熱搜榜：iphone 17 → 真站 9 条
const HOT_RANK = [
  ['ps5', '1461'],
  ['iphone 18 pro', '1273'],
  ['即享券', '1208'],
  ['mont bell', '1199'],
  ['skechers女鞋', '1187'],
  ['即期品', '1171'],
  ['愛迪達外套', '1150'],
  ['coach', '1129'],
  ['點睛品', '1092'],
];
// 现有条目按顺序替换标题与热度
let ri = 0;
h = h.replace(/(title="[^"]{1,20}" style="font-size: 13px; line-height: 18px; max-width: 100%;">)([^<]{1,20})(<\/a>)/g, (m, a, txt, c) => {
  if (ri >= HOT_RANK.length) { ri++; return m; }
  const [name] = HOT_RANK[ri++];
  return a + name + c;
});
let qi = 0;
h = h.replace(/(熱度)(\d+)(萬)/g, (m, a, num, c) => {
  if (qi >= HOT_RANK.length) { qi++; return m; }
  const [, heat] = HOT_RANK[qi++];
  return a + heat + c;
});

// 4.5) 主导航补「生活超市」（真站有，我们缺）
if (!h.includes('生活超市')) {
  const gi = h.indexOf('綠色生活');
  if (gi > 0) {
    const ds = h.lastIndexOf('<div class="shrink-0">', gi);
    const de = h.indexOf('</div>', gi) + 6;
    const block2 = h.slice(ds, de);
    const clone = block2.replace(/綠色生活/g, '生活超市')
      .replace(/\/category"/, '/category?cat=' + encodeURIComponent('食品/飲料') + '"');
    h = h.slice(0, de) + clone + h.slice(de);
    n++;
  }
}

// 4.6) 头部迷你购物车「結帳」按钮接线（原本是 button 无事件）
h = h.replace(/<button type="button" class="flex w-full justify-center bg-\[#d62872\] py-1 text-white">/g,
  '<button type="button" class="flex w-full justify-center bg-[#d62872] py-1 text-white" onclick="location.href=\'/checkout/\'">'); // 結帳按鈕接线

// 5) 底部关键词横滑
const BOTTOM_KW = ['葛瑪蘭之星飯店', '瞬熱飲水機', '廚房紙巾', '美食餐券', 'lush 嵐舒', '前開式行李箱', 'kao 花王', '麥當勞餐券', '烘被機', '大童運動鞋'];
let bi = 0;
h = h.replace(/(>)([^<>]{2,14})(<\/span><\/a>)/g, (m, a, txt, c) => {
  if (bi >= BOTTOM_KW.length) return m;
  // 只替换底部关键词区（含「飯店/餐券/飲水機」等特征词或短词）
  if (!/飯店|餐券|飲水機|紙巾|行李箱|花王|烘被機|運動鞋|嵐舒|大童/.test(txt) && bi > 0) return m;
  return a + BOTTOM_KW[bi++] + c;
});


// ── 导航 / 链接目标修复（fixNavTargets）─────────────────────────
const NAV_CATS = ['家電','電玩','手機/相機','電腦/組件','3C週邊','保健/醫療','食品/飲料','生鮮','女時尚','男時尚',
  '精品/飾品','彩妝保養','個人清潔','日用/紙品','母嬰/玩具','餐廚','家具收納','修繕園藝','傢飾寢具',
  '寵物','運動/按摩','戶外','車類','圖書影音','文具樂器','藝術宗教','旅遊/住宿','票券','加值/軟體',
  '綠色生活','生活超市','跨境好物','樂公益','品牌旗艦館'];

function fixNavTargets(html) {
  var out = html;

  // ① 回首頁：?cid=memb... → /
  out = out.replace(/<a([^>]*?)href="\?cid=memb[^"]*"([^>]*)>/g, function (m, a, b) {
    return '<a' + a + 'href="/"' + b + '>';
  });

  // ② 主导航按文案映射到 ?cat=
  NAV_CATS.forEach(function (c) {
    var esc = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\//g, '\\/');
    var re = new RegExp('(<a[^>]*href=")/category(" [^>]*>)\\s*' + esc + '\\s*(</a>)', 'g');
    out = out.replace(re, function (m, p1, p2, p3) {
      return p1 + '/category?cat=' + encodeURIComponent(c) + p2 + c + p3;
    });
  });

  // ③ 静态镜像路径（点开会下载图片）→ /product/<code>
  out = out.replace(/href="\/assets\/www\.momoshop\.com\.tw\/TP\/([^"]*)"/g, function (m, rest) {
    var d = (rest.match(/(\d{6,})/) || [])[1];
    return 'href="' + (d ? '/product/' + d : '/category') + '"';
  });

  return out;
}

h = fixNavTargets(h);

fs.writeFileSync(F, h, 'utf8');
console.log('替换次数:', n, ' 长度变化:', h.length - before.length);
console.log('含 2026年11月:', h.includes('2026年11月'));
console.log('含 分潤計劃:', h.includes('分潤計劃'));
console.log('含 ps5 熱搜:', h.includes('ps5'));
