/**
 * 修复：relItems 在手机分支之后才定义（TDZ）导致 /m/product/* 500
 * 做法：把 realRec / relItems 的定义提前到函数开头（rvData 之后），删掉后面的重复定义
 */
import fs from 'node:fs';
const F = 'lib/render.mjs';
const lines = fs.readFileSync(F, 'utf8').split('\n');

// 1) 找到现有定义块（realRec + relItems 三行）
const start = lines.findIndex((l) => l.includes('const realRec = typeof getRecommend'));
if (start < 0) { console.error('找不到 realRec 定义'); process.exit(1); }
let end = start;
while (end < lines.length && !lines[end].includes(": (allItems() || [])")) end++;
if (end >= lines.length) { console.error('找不到 relItems 结尾'); process.exit(1); }
console.log('定义块:', start + 1, '-', end + 1);
const block = lines.slice(start, end + 1);
console.log(block.map((l) => l.trim().slice(0, 90)).join('\n'));

// 2) 删除原块
lines.splice(start, block.length);

// 3) 插到 rvData 之后
const rv = lines.findIndex((l) => l.includes('const rvData = typeof getReview'));
if (rv < 0) { console.error('找不到 rvData'); process.exit(1); }
lines.splice(rv + 1, 0, ...block);
console.log('已提前到第', rv + 2, '行');

fs.writeFileSync(F, lines.join('\n'), 'utf8');
