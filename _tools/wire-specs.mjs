/**
 * 商品页接入真站规格与 SKU 变体
 *   site/data/specs.json → render.mjs
 *   手机版「規格」行：有变体则出 chip（按 顏色/尺寸 组合）
 *   手机版「規格說明」表：用真站属性替换通用文案
 *   桌面版属性表同样
 */
import fs from 'node:fs';
const F = 'lib/render.mjs';
let s = fs.readFileSync(F, 'utf8');
if (s.includes('SPECS')) { console.log('已存在'); process.exit(1); }

// 1) 存储 + setter
s = s.replace("let RECOMMEND = {}; // code → [{ c, n, p, m, i }]",
`let RECOMMEND = {}; // code → [{ c, n, p, m, i }]
let SPECS = {};     // code → { props:[{n,v}], vars:[{s,n,p}], group }`);

s = s.replace("export function setRecommend(json) { RECOMMEND = json || {}; }",
`export function setRecommend(json) { RECOMMEND = json || {}; }
export function setSpecs(json) { SPECS = json || {}; }
export function getSpec(code) { return SPECS[String(code)] || null; }`);

// 2) 商品页取规格
s = s.replace(
  '  const rvData = typeof getReview === "function" ? getReview(p.code) : null;',
  `  const rvData = typeof getReview === "function" ? getReview(p.code) : null;
  const spData = typeof getSpec === 'function' ? getSpec(p.code) : null;`
);

// 3) 手机版 規格 行：有变体就出 chip
const mSkuOld = `    <div class="r-pdp__row"><span class="k">規格</span><span class="v" id="pdpSkusM">\${skuChips(p, 'mobile')}</span></div>`;
const mSkuNew = `    <div class="r-pdp__row"><span class="k">規格</span><span class="v" id="pdpSkusM">\${
      (spData && spData.vars && spData.vars.length > 1)
        ? spData.vars.map((v, i) => \`<button type="button" class="m-sku-chip\${i === 0 ? ' on' : ''}" data-i="\${i}" data-sku="\${esc(v.s)}">\${esc(v.n || v.s)}</button>\`).join('')
        : skuChips(p, 'mobile')
    }</span></div>`;
if (s.includes(mSkuOld)) { s = s.replace(mSkuOld, mSkuNew); console.log('手机版规格行已接真数据'); }
else console.log('手机版规格行未匹配');

// 4) 手机版规格表：用真站属性
const specTableOld = `    <table class="r-spec">
      <tr><th>商品編號</th><td>\${esc(p.code)}</td></tr>
      <tr><th>商品分類</th><td>\${esc(p.cat || '其他')}</td></tr>
      <tr><th>原價</th><td><s>\${fmt(was)}</s></td></tr>
      <tr><th>5 折價</th><td class="pink">\${fmt(price)}</td></tr>
      <tr><th>產地</th><td>依原廠標示</td></tr>
      <tr><th>保固</th><td>原廠保固（非人為損壞）</td></tr>
    </table>`;
const specTableNew = `    <table class="r-spec">
      <tr><th>商品編號</th><td>\${esc(p.code)}</td></tr>
      \${(spData && spData.props && spData.props.length)
        ? spData.props.map((x) => \`<tr><th>\${esc(x.n)}</th><td>\${esc(x.v)}</td></tr>\`).join('')
        : \`<tr><th>商品分類</th><td>\${esc(p.cat || '其他')}</td></tr><tr><th>產地</th><td>依原廠標示</td></tr>\`}
      <tr><th>原價</th><td><s>\${fmt(was)}</s></td></tr>
      <tr><th>5 折價</th><td class="pink">\${fmt(price)}</td></tr>
    </table>`;
if (s.includes(specTableOld)) { s = s.replace(specTableOld, specTableNew); console.log('手机版规格表已接真数据'); }
else console.log('手机版规格表未匹配');

fs.writeFileSync(F, s, 'utf8');
console.log('done');
