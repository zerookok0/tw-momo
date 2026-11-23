/**
 * 把首页的三项修复固化进 align-desktop-copy.mjs（build 时执行，不会被 restore-home 冲掉）
 *   1) 回首頁 query 链接 → /
 *   2) 主导航 33 项按文案映射到 /category?cat=
 *   3) /assets/.../TP/... 静态镜像链接 → /product/<code>
 */
import fs from 'node:fs';

const F = '_tools/align-desktop-copy.mjs';
let s = fs.readFileSync(F, 'utf8');
if (s.includes('fixNavTargets')) { console.log('已存在'); process.exit(0); }

const block = `
// ── 导航 / 链接目标修复（fixNavTargets）─────────────────────────
const NAV_CATS = ['家電','電玩','手機/相機','電腦/組件','3C週邊','保健/醫療','食品/飲料','生鮮','女時尚','男時尚',
  '精品/飾品','彩妝保養','個人清潔','日用/紙品','母嬰/玩具','餐廚','家具收納','修繕園藝','傢飾寢具',
  '寵物','運動/按摩','戶外','車類','圖書影音','文具樂器','藝術宗教','旅遊/住宿','票券','加值/軟體',
  '綠色生活','生活超市','跨境好物','樂公益','品牌旗艦館'];

function fixNavTargets(html) {
  var out = html;

  // ① 回首頁：?cid=memb... → /
  out = out.replace(/<a([^>]*?)href="\\?cid=memb[^"]*"([^>]*)>/g, function (m, a, b) {
    return '<a' + a + 'href="/"' + b + '>';
  });

  // ② 主导航按文案映射到 ?cat=
  NAV_CATS.forEach(function (c) {
    var esc = c.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&').replace(/\\//g, '\\\\/');
    var re = new RegExp('(<a[^>]*href=")/category(" [^>]*>)\\\\s*' + esc + '\\\\s*(</a>)', 'g');
    out = out.replace(re, function (m, p1, p2, p3) {
      return p1 + '/category?cat=' + encodeURIComponent(c) + p2 + c + p3;
    });
  });

  // ③ 静态镜像路径（点开会下载图片）→ /product/<code>
  out = out.replace(/href="\\/assets\\/www\\.momoshop\\.com\\.tw\\/TP\\/([^"]*)"/g, function (m, rest) {
    var d = (rest.match(/(\\d{6,})/) || [])[1];
    return 'href="' + (d ? '/product/' + d : '/category') + '"';
  });

  return out;
}
`;

// 插到文件末尾的写盘之前：找 fs.writeFileSync(F, h, 'utf8')
const writeIdx = s.lastIndexOf("fs.writeFileSync(F, h, 'utf8')");
if (writeIdx < 0) { console.error('找不到写盘语句'); process.exit(1); }
s = s.slice(0, writeIdx) + block + "\nh = fixNavTargets(h);\n\n" + s.slice(writeIdx);
fs.writeFileSync(F, s, 'utf8');
console.log('已加入 fixNavTargets 并接入写盘前');
