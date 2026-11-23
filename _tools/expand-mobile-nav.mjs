/**
 * 手机版导航补全：真站 m 版顶部导航是全部 39 个分类横向滑动
 * （首頁 限時搶購 直播 mo店+ 看看買 家電 電玩 手機/相機 … 品牌旗艦館）
 * 我们原来只有 5 个 + 更多箭头。
 *
 * 做法：在 render.mjs 加 mobileNav() helper，替换各手机模板里硬编码的 5 项导航。
 */
import fs from 'node:fs';

const NAV = [
  ['首頁', '/m/'], ['限時搶購', '/m/category'], ['直播', '/m/category'], ['mo店+', '/m/category'], ['看看買', '/m/category'],
  ...['家電', '電玩', '手機/相機', '電腦/組件', '3C週邊', '保健/醫療', '食品/飲料', '生鮮', '女時尚', '男時尚',
     '精品/飾品', '彩妝保養', '個人清潔', '日用/紙品', '母嬰/玩具', '餐廚', '家具收納', '修繕園藝', '傢飾寢具',
     '寵物', '運動/按摩', '戶外', '車類', '圖書影音', '文具樂器', '藝術宗教', '旅遊/住宿', '票券', '加值/軟體',
     '綠色生活', '生活超市', '跨境好物', '樂公益', '品牌旗艦館'].map((c) => [c, '/m/category?cat=' + c]),
];

const F = 'lib/render.mjs';
let s = fs.readFileSync(F, 'utf8');
if (s.includes('function mobileNav')) { console.log('已存在'); process.exit(0); }

const items = NAV.map(([t, h], i) => `    <a class="${i === 0 ? 'on' : ''}" href="${h}">${t}</a>`).join('\n');

const fn = `
/** 手机版顶部导航：与真站一致，全部 39 个分类横向滑动 */
export function mobileNav() {
  return \`<nav class="r-nav">
${items}
  </nav>\`;
}
`;

// 插到 mobileShell 之前
const anchor = 'function mobileShell(';
if (!s.includes(anchor)) { console.error('找不到 mobileShell'); process.exit(1); }
s = s.replace(anchor, fn + '\n' + anchor);

// 替换模板里硬编码的 5 项导航
const oldNav = /<nav class="r-nav">[\s\S]*?<\/nav>/g;
let n = 0;
s = s.replace(oldNav, () => { n++; return '${mobileNav()}'; });

fs.writeFileSync(F, s, 'utf8');
console.log('导航替换:', n, '处');
