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
    (m) => m + '<li class="relative m-0 cursor-pointer px-2.5 text-nav leading-10"><a href="/info/points" title="分潤計劃" class="m-0 flex p-0 text-nav leading-10 text-momo-neutralStrong"><div class="flex items-center"><span>分潤計劃</span></div></a></li>'
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

// 5) 底部关键词横滑
const BOTTOM_KW = ['葛瑪蘭之星飯店', '瞬熱飲水機', '廚房紙巾', '美食餐券', 'lush 嵐舒', '前開式行李箱', 'kao 花王', '麥當勞餐券', '烘被機', '大童運動鞋'];
let bi = 0;
h = h.replace(/(>)([^<>]{2,14})(<\/span><\/a>)/g, (m, a, txt, c) => {
  if (bi >= BOTTOM_KW.length) return m;
  // 只替换底部关键词区（含「飯店/餐券/飲水機」等特征词或短词）
  if (!/飯店|餐券|飲水機|紙巾|行李箱|花王|烘被機|運動鞋|嵐舒|大童/.test(txt) && bi > 0) return m;
  return a + BOTTOM_KW[bi++] + c;
});

fs.writeFileSync(F, h, 'utf8');
console.log('替换次数:', n, ' 长度变化:', h.length - before.length);
console.log('含 2026年11月:', h.includes('2026年11月'));
console.log('含 分潤計劃:', h.includes('分潤計劃'));
console.log('含 ps5 熱搜:', h.includes('ps5'));
