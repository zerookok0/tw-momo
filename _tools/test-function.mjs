/**
 * 本地模拟 Pages Functions 运行时，验证 functions/[[path]].js 的逻辑
 * （没有 wrangler 也能跑：mock env.ASSETS.fetch 与 next()）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { onRequest } from '../functions/[[path]].js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(__dirname, '..');
const DIST = path.join(PROJ, 'dist');
const ORIGIN = 'http://localhost:8788';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
};

const env = {
  ASSETS: {
    async fetch(input) {
      const u = new URL(typeof input === 'string' ? input : input.url ?? input.toString(), ORIGIN);
      let p = path.join(DIST, decodeURIComponent(u.pathname));
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
      if (!fs.existsSync(p)) return new Response('not found', { status: 404 });
      const ext = path.extname(p).toLowerCase();
      return new Response(fs.readFileSync(p), { status: 200, headers: { 'Content-Type': MIME[ext] || 'application/octet-stream' } });
    },
  },
};

let nextCalled = 0;
const next = () => { nextCalled++; return new Response('STATIC-ASSET', { status: 200 }); };

async function call(pathname, init = {}) {
  const req = new Request(ORIGIN + pathname, init);
  return onRequest({ request: req, env, next, params: {} });
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}  ${detail}`);
}

// 1. 分类页
let r = await call('/category');
let t = await r.text();
check('GET /category → 200 HTML', r.status === 200 && t.includes('商品分類'), `共 ${{}.x || (t.match(/共 ([\d,]+) 件/) || [])[1]} 件`);

// 2. 搜索
r = await call('/category?kw=' + encodeURIComponent('除濕機'));
t = await r.text();
const kwCount = (t.match(/共 ([\d,]+) 件/) || [])[1];
check('GET /category?kw=除濕機', r.status === 200 && Number(String(kwCount).replace(/,/g, '')) > 0, `${kwCount} 件`);

// 3. 分页
r = await call('/category?page=100');
t = await r.text();
check('GET /category?page=100', r.status === 200 && t.includes('page=99') || t.includes('page=101'), '分页器渲染');

// 4. 桌面商品
r = await call('/product/1341656');
t = await r.text();
check('GET /product/1341656', r.status === 200 && t.includes('pdp__title'), t.match(/<title>(.*?)<\/title>/)?.[1]?.slice(0, 30) || '');

// 5. momo 真实路由别名
r = await call('/goods/GoodsDetail.jsp?i_code=1341656');
t = await r.text();
check('GET /goods/GoodsDetail.jsp?i_code=', r.status === 200 && t.includes('pdp__title'));

// 6. 行动商品
r = await call('/m/product/1341656');
t = await r.text();
check('GET /m/product/1341656', r.status === 200 && t.includes('m-pdp__title'));

// 7. 行动分类
r = await call('/m/category');
t = await r.text();
check('GET /m/category', r.status === 200 && t.includes('m-goods'));

// 8. /api/cart
r = await call('/api/cart');
let j = await r.json();
check('GET /api/cart', r.status === 200 && j.order_number && j.total > 0, `${j.order_number} ${j.total_amount}`);

// 9. /api/checkout 幂等
const body = JSON.stringify({ order_number: j.order_number, amount: j.total, currency: 'TWD' });
r = await call('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
const a = await r.json();
r = await call('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
const b = await r.json();
check('POST /api/checkout 幂等 + 单号复用', a.ok === true && b.ok === true && b.idempotent === true && a.order_number === j.order_number, `${a.order_number} / idem=${b.idempotent}`);

// 10. 订单查询
r = await call('/api/order/' + encodeURIComponent(j.order_number));
const o = await r.json();
check('GET /api/order/:no', o.ok === true && o.order.amount === j.total, `$${o.order && o.order.amount}`);

// 11. 静态资源走 next()
nextCalled = 0;
r = await call('/');
check('GET / → next()（静态资源）', nextCalled === 1 && (await r.text()) === 'STATIC-ASSET');

// 12. 错误金额
r = await call('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_number: 'X1', amount: 0 }) });
const e = await r.json();
check('POST /api/checkout 金额非法 → 200 + ok:false', r.status === 200 && e.ok === false && e.error_code === 'invalid_amount', e.error_code);

const pass = results.filter((x) => x.ok).length;
console.log(`\n${pass === results.length ? '全部通过' : '存在失败项'} ${pass}/${results.length}`);
process.exit(pass === results.length ? 0 : 1);
