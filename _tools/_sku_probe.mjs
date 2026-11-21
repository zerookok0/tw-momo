import fs from "node:fs";
const cat = JSON.parse(fs.readFileSync("site/data/catalog.json", "utf8"));
const items = cat.items;

// 假设：同一商品的多规格在 momo 上是不同 i_code，名字只差规格词
// 用「去掉规格片段后的名字」做聚类，看能聚出多少多 SKU 的商品
function key(name) {
  let s = String(name).toLowerCase();
  s = s.replace(/[\d.,]+\s*(gb|g|ml|l|kg|mg|入|片|包|盒|瓶|顆|颗|組|组|件|支|雙|双|cm|mm|吋|寸|吋|號|号|碼|码|抽|捲|卷|張|张|條|条|個|个|棵|粒|袋|箱|罐|杯|碗|台|組|oz)/g, " ");
  s = s.replace(/[x×*]\s*\d+/g, " ");
  s = s.replace(/[（(][^）)]*[）)]/g, " ");
  s = s.replace(/(黑|白|紅|红|藍|蓝|綠|绿|灰|粉|紫|黃|黄|金|銀|银|橘|橙|色)/g, " ");
  s = s.replace(/[^\u4e00-\u9fa5a-z0-9]+/g, "");
  return s.slice(0, 24);
}

const groups = new Map();
for (const it of items) {
  const k = key(it.name);
  if (k.length < 4) continue;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(it);
}

const multi = [...groups.entries()].filter(([, v]) => v.length >= 2);
const multiItems = multi.reduce((s, [, v]) => s + v.length, 0);
console.log("商品总数:", items.length);
console.log("分组数:", groups.size);
console.log("含 2 个以上变体的组:", multi.length);
console.log("落在多 SKU 组里的商品:", multiItems);
console.log("\n样例:");
for (const [k, v] of multi.sort((a, b) => b[1].length - a[1].length).slice(0, 5)) {
  console.log(`  「${k}」 ×${v.length}`);
  v.slice(0, 4).forEach(x => console.log(`     ${x.code} $${x.price}  ${x.name.slice(0, 46)}`));
}
