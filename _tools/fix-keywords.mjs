/**
 * 修「猜你想搜」：文案已换，href 还指向旧关键词。
 * 目标：5 个关键词与真站一致，且每个 <a> 的 href 与文案对应。
 */
import fs from 'node:fs';
const F = 'site/index.html';
let h = fs.readFileSync(F, 'utf8');

const KWS = ['皮卡丘', '不鏽鋼炒鍋', '小米行動電源', '雙人沙發', '扭扭樂'];

// 抓出所有 keyword-item 的 <a>
const re = /<a href="([^"]*)" data-orig-href="([^"]*)" class="inline-flex h-\[24px\][^"]*">([^<]*)<\/a>/g;
const hits = [...h.matchAll(re)];
console.log('找到 keyword 锚点:', hits.length);

let i = 0;
h = h.replace(re, (all, href, orig, text) => {
  const kw = KWS[i % KWS.length];
  i++;
  const enc = encodeURIComponent(kw);
  return `<a href="/category?kw=${enc}" data-orig-href="https://www.momoshop.com.tw/search/searchShop.jsp?keyword=${enc}" class="inline-flex h-[24px] overflow-hidden whitespace-nowrap px-1 text-ec-sm leading-[24px] text-momo-pink">${kw}</a>`;
});

fs.writeFileSync(F, h, 'utf8');

// 同步修 _partials/header.html（动态页头部用的是它）
const HF = 'site/_partials/header.html';
if (fs.existsSync(HF)) {
  let hh = fs.readFileSync(HF, 'utf8');
  let j = 0;
  hh = hh.replace(re, () => {
    const kw = KWS[j % KWS.length]; j++;
    const enc = encodeURIComponent(kw);
    return `<a href="/category?kw=${enc}" data-orig-href="https://www.momoshop.com.tw/search/searchShop.jsp?keyword=${enc}" class="inline-flex h-[24px] overflow-hidden whitespace-nowrap px-1 text-ec-sm leading-[24px] text-momo-pink">${kw}</a>`;
  });
  fs.writeFileSync(HF, hh, 'utf8');
  console.log('header 关键词已修:', j);
}
console.log('已重写', i, '个关键词链接');
const check = [...h.matchAll(re)].map((m) => m[3]);
console.log('现在:', check.join(' | '));
