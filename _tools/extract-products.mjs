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
  const texts = [...inner.matchAll(/>([^<>]{2,160})</g)]
    .map((t) => t[1].trim())
    .filter((t) => t && !/^[\s$0-9,.\-—\/]+$/.test(t));
  const priceM = inner.match(/\$([0-9,]+)/);

  // 商品名启发式：
  //   1) 以「【」或「[」开头的完整商品名（momo 惯例）
  //   2) 否则取最长的一条（活动标签通常很短）
  //   3) 兜底取第一条
  const bracketed = texts.find((t) => /^[【\[]/.test(t) && t.length >= 4);
  const longest = texts.slice().sort((a, b) => b.length - a.length)[0];
  const name = bracketed || longest || texts[0] || '';

  out.set(code, {
    code,
    img: img ? img[1] : null,
    name,
    // 促销标签（卡片顶部红标），用于列表页角标
    tag: texts.find((t) => t !== name && t.length <= 22) || '',
    texts,
    price: priceM ? Number(priceM[1].replace(/,/g, '')) : null,
  });
}

const list = [...out.values()].filter((p) => p.name && p.price);
console.log('products:', list.length);
console.log('bracketed name:', list.filter((p) => /^[【\[]/.test(p.name)).length);
console.log('fallback name:', list.filter((p) => !/^[【\[]/.test(p.name)).length);
fs.writeFileSync('F:/DSH/项目/台湾momo/_ref/products.json', JSON.stringify(list, null, 1), 'utf8');
for (const p of list) console.log(p.code, String(p.price).padStart(6), '|', p.name.slice(0, 60));
