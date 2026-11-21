import fs from "node:fs";
const cat = JSON.parse(fs.readFileSync("site/data/catalog.json", "utf8"));
const items = cat.items;

// 严格归一：只去掉「规格词」，其余必须完全相同才算同款
function norm(name) {
  let s = String(name).toLowerCase();
  s = s.replace(/【[^】]*】/g, "");                       // 去品牌括号
  s = s.replace(/[（(][^）)]*[）)]/g, "");                 // 去括号补充说明
  s = s.replace(/[\d.,]+\s*(?:gb|tb|mb|g|ml|l|kg|mg|入|片|包|盒|瓶|顆|颗|組|组|件|支|雙|双|cm|mm|吋|吋|號|号|碼|码|抽|捲|卷|張|张|條|条|個|个|粒|袋|箱|罐|杯|台|w|v|mah|w)/g, "");
  s = s.replace(/[\s\-_/·、,，.。:：;；!！?？"'“”‘’]+/g, "");
  return s;
}

const groups = new Map();
for (const it of items) {
  const k = norm(it.name);
  if (k.length < 6) continue;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(it);
}

const multi = [...groups.entries()].filter(([, v]) => v.length >= 2);
const covered = multi.reduce((s, [, v]) => s + v.length, 0);
console.log("商品总数:", items.length);
console.log("严格归一组数:", groups.size);
console.log("含 2+ 规格的组:", multi.length);
console.log("这些组覆盖的商品:", covered, `(${(covered / items.length * 100).toFixed(1)}%)`);
console.log("\n最高频样例:");
for (const [k, v] of multi.sort((a, b) => b[1].length - a[1].length).slice(0, 4)) {
  console.log(`  「${k.slice(0, 26)}」 ×${v.length}`);
  v.slice(0, 4).forEach(x => console.log(`     ${x.code}  $${x.price}  ${x.name.slice(0, 44)}`));
}
