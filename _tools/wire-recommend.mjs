/**
 * 商品页「推薦商品」改用真站推荐数据（有则用，无则回退到同分类）
 */
import fs from 'node:fs';
const F = 'lib/render.mjs';
let s = fs.readFileSync(F, 'utf8');
if (s.includes('RECOMMEND')) { console.log('已存在'); process.exit(0); }

// 1) 存储 + setter
s = s.replace("let REVIEWS = {};   // code → { avg, cnt, sale, reviews[] }",
`let REVIEWS = {};   // code → { avg, cnt, sale, reviews[] }
let RECOMMEND = {}; // code → [{ c, n, p, m, i }]`);

s = s.replace("export function setReviews(json) { REVIEWS = json || {}; }",
`export function setReviews(json) { REVIEWS = json || {}; }
export function setRecommend(json) { RECOMMEND = json || {}; }
export function getRecommend(code) { return RECOMMEND[String(code)] || null; }`);

// 2) 商品页：优先真站推荐
const oldRel = '  const relItems = (allItems() || []).filter((x) => String(x.code) !== String(p.code) && x.img && x.cat === p.cat).slice(0, 12);';
const newRel = `  const realRec = typeof getRecommend === 'function' ? getRecommend(p.code) : null;
  const relItems = (realRec && realRec.length)
    ? realRec.filter((r) => r.i).map((r) => ({ code: r.c, name: r.n, price: r.p, img: r.i, cat: p.cat })).slice(0, 12)
    : (allItems() || []).filter((x) => String(x.code) !== String(p.code) && x.img && x.cat === p.cat).slice(0, 12);`;

if (!s.includes(oldRel)) { console.error('找不到 relItems'); process.exit(1); }
s = s.replace(oldRel, newRel);

fs.writeFileSync(F, s, 'utf8');
console.log('推荐数据已接入商品页');
