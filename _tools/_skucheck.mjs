import fs from "node:fs";
const cat = JSON.parse(fs.readFileSync("site/data/catalog.json", "utf8"));
const withSku = cat.items.filter(i => i.skus && i.skus.length > 1);
console.log("多规格商品:", withSku.length);
for (const it of withSku.slice(0, 6)) {
  console.log(`\n${it.code}  ${it.name.slice(0, 30)}`);
  it.skus.forEach(s => console.log(`   ${s.code}  $${s.price}  「${s.label}」`));
}
// 规格数分布
const hist = {};
for (const it of withSku) hist[it.skus.length] = (hist[it.skus.length] || 0) + 1;
console.log("\n规格数分布:", JSON.stringify(hist));
