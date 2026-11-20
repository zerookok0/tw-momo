import fs from 'node:fs';
const html = fs.readFileSync('F:/DSH/项目/台湾momo/site/index.html', 'utf8');

// 找所有带 i_code 的 anchor 块
const re = /<a\b[^>]*?data-orig-href="([^"]*GoodsDetail\.jsp\?i_code=(\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
const out = new Map();
let m;
while ((m = re.exec(html))) {
  const code = m[2];
  const inner = m[3];
  if (out.has(code)) continue;
  const img = inner.match(/<img[^>]+src="([^"]+)"/);
  const texts = [...inner.matchAll(/>([^<>]{2,120})</g)].map((t) => t[1].trim()).filter((t) => t && !/^[\s$0-9,.\-—\/]+$/.test(t));
  const priceM = inner.match(/\$([0-9,]+)/);
  out.set(code, {
    code,
    img: img ? img[1] : null,
    texts: texts.slice(0, 6),
    price: priceM ? Number(priceM[1].replace(/,/g, '')) : null,
  });
}
const list = [...out.values()].filter((p) => p.texts.length && p.price);
console.log('products:', list.length);
fs.writeFileSync('F:/DSH/项目/台湾momo/_ref/products.json', JSON.stringify(list, null, 1), 'utf8');
for (const p of list.slice(0, 20)) console.log(p.code, '|', p.price, '|', p.texts[0]?.slice(0, 40), '|', (p.img || '').slice(-45));
