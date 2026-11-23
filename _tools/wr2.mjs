/**
 * worker 加载 recommend.json（上次 patch 锚点未匹配，这次行级插入）
 */
import fs from 'node:fs';
const F = 'functions/[[path]].js';
const lines = fs.readFileSync(F, 'utf8').split('\n');

// 1) import 补 setRecommend / getRecommend
const impIdx = lines.findIndex((l) => l.includes("from '../lib/render.mjs'"));
if (impIdx < 0) { console.error('找不到 import'); process.exit(1); }
console.log('import 行:', lines[impIdx].trim());
if (!lines[impIdx].includes('setRecommend')) {
  lines[impIdx] = "import { setCatalog, setReviews, setRecommend, getReview, getRecommend, getProduct, allItems, renderProductPage, renderCategoryPage, catalogCount } from '../lib/render.mjs';";
  console.log('import 已补');
}

// 2) 在 setReviews(...) 那行之后插入推荐加载
const rvIdx = lines.findIndex((l) => l.includes('setReviews('));
if (rvIdx < 0) { console.error('找不到 setReviews'); process.exit(1); }
console.log('setReviews 行:', rvIdx + 1, lines[rvIdx].trim());

if (!lines.some((l) => l.includes('recommend.json'))) {
  const indent = (lines[rvIdx].match(/^\s*/) || [''])[0];
  lines.splice(rvIdx + 1, 0,
    indent + "const rc = await env.ASSETS.fetch(new URL('/data/recommend.json', request.url).toString());",
    indent + 'if (rc.ok) setRecommend(await rc.json());'
  );
  console.log('推荐加载已插入');
}

fs.writeFileSync(F, lines.join('\n'), 'utf8');
