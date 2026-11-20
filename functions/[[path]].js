/**
 * Cloudflare Pages Functions · 动态路由总入口
 *
 * 处理：
 *   GET  /product/<code>            /goods/GoodsDetail.jsp?i_code=
 *   GET  /m/product/<code>          /m/goods.momo?i_code=
 *   GET  /category?page=&kw=        /m/category?page=&kw=
 *   GET  /api/cart
 *   POST /api/checkout
 *   GET  /api/order/<no>
 *
 * 其余路径交给静态资源（next()）。
 * 契约：§4 六个固定 id、§5 /api/cart、§6 200+JSON 幂等、§7 响应头由 _headers 提供。
 */
import { setCatalog, getProduct, allItems, renderProductPage, renderCategoryPage, catalogCount } from '../lib/render.mjs';

const PAGE_SIZE = 48;

// ── 目录缓存（同一 isolate 内复用）──
let CATALOG_READY = false;

async function ensureCatalog(env, request) {
  if (CATALOG_READY) return;
  try {
    const url = new URL('/data/catalog.json', request.url);
    const res = await env.ASSETS.fetch(url.toString());
    if (res.ok) {
      const json = await res.json();
      setCatalog(json);
      CATALOG_READY = true;
      console.log(`[catalog] loaded ${catalogCount()}`);
    }
  } catch (e) {
    console.error('[catalog] load failed', e && e.message);
  }
}

// ── 订单存储：Pages 无状态，内存兜底；生产建议绑 KV ──
const ORDERS = new Map();

const MSG = {
  invalid_amount: '金額異常，請回到購物車重新結帳',
  origin_mismatch: '來源驗證失敗，請重新整理後再試',
  bad_json: '請求格式錯誤，請重試',
  not_found: '找不到訂單',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function html(str, status = 200) {
  return new Response(str, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function fallbackCart() {
  const items = [
    { name: '【Kingston 金士頓】8GB DDR5 5600MT/s Non-ECC 記憶體', qty: 1, price: 828, img: '/assets/i4.momoshop.com.tw/1754298127/goodsimg/0014/295/303/14295303_OL_m.webp' },
    { name: '【威拂】魔撢本體 1把+1片裝(藍色/粉色 隨機出貨)', qty: 1, price: 59, img: '/assets/i2.momoshop.com.tw/1698915746/goodsimg/0008/593/194/8593194_OL_m.webp' },
    { name: '【SONAX】鍍膜美容巾(細緻柔軟.極具吸收力)', qty: 1, price: 299, img: '/assets/i3.momoshop.com.tw/1759350466/goodsimg/0007/053/569/7053569_OL_m.webp' },
  ];
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  return {
    order_number: 'ORD-20261120-7F3A',
    currency: 'TWD',
    total,
    total_amount: `$${total.toLocaleString('en-US')}`,
    items,
    locale: 'zh-TW',
  };
}

export async function onRequest(context) {
  const { request, env, next, params } = context;
  const url = new URL(request.url);
  const p = url.pathname;
  const method = request.method;

  try {
    // ───────── API ─────────
    if (p === '/api/cart') {
      if (method !== 'GET') return json({ ok: false, error_code: 'method_not_allowed' }, 405);
      return json(fallbackCart());
    }

    if (p === '/api/checkout' && method === 'POST') {
      let body = {};
      try { body = await request.json(); } catch { return json({ ok: false, error_code: 'bad_json', message: MSG.bad_json }); }

      const origin = request.headers.get('Origin');
      if (origin && origin !== url.origin) return json({ ok: false, error_code: 'origin_mismatch', message: MSG.origin_mismatch });

      const no = body.order_number || fallbackCart().order_number;
      // 契约 §6.1：幂等
      if (ORDERS.has(no)) return json({ ok: true, order_number: no, idempotent: true });

      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) return json({ ok: false, error_code: 'invalid_amount', message: MSG.invalid_amount });

      ORDERS.set(no, {
        order_number: no,
        amount,
        currency: body.currency || 'TWD',
        locale: body.locale || 'zh-TW',
        utm: body.utm || {},
        customer: body.customer || {},
        created_at: new Date().toISOString(),
      });
      // 契约 §6.1：永远 200 + JSON，单号复用，不 302
      return json({ ok: true, order_number: no });
    }

    if (p.startsWith('/api/order/')) {
      const no = decodeURIComponent(p.slice('/api/order/'.length));
      const o = ORDERS.get(no);
      return o ? json({ ok: true, order: o }) : json({ ok: false, error_code: 'not_found' });
    }

    if (p.startsWith('/api/')) return json({ ok: false, error_code: 'not_found' }, 404);

    // ───────── 动态页面 ─────────
    await ensureCatalog(env, request);

    const isMobile = p.startsWith('/m/');
    const kind = isMobile ? 'mobile' : 'desktop';

    const productMatch = p.match(/^\/(m\/)?product\/([^/]+)\/?$/);
    const isGoodsJsp = p === '/goods/GoodsDetail.jsp' || p === '/m/goods.momo';
    if (productMatch || isGoodsJsp) {
      const code = productMatch ? decodeURIComponent(productMatch[2]) : url.searchParams.get('i_code');
      if (code) {
        const item = getProduct(code);
        if (item) return html(renderProductPage(kind, item));

        // 目录里没有 → 试预渲染静态页（首屏 32 个商品）
        const staticPath = isMobile ? `/m/product/${code}.html` : `/product/${code}.html`;
        const staticRes = await env.ASSETS.fetch(new URL(staticPath, url).toString());
        if (staticRes.ok) return staticRes;

        // 都没有 → 404，不要拿别的商品糊弄
        return html(`<!doctype html><html lang="zh-TW"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>商品已下架 - momo購物網</title>
<style>body{font-family:"PingFang TC","Microsoft JhengHei",sans-serif;background:#f5f5f5;margin:0;padding:80px 20px;text-align:center;color:#4d4d4d}
h1{color:#d62872;font-size:20px}p{font-size:14px;line-height:1.8}a{display:inline-block;margin-top:20px;padding:10px 26px;background:#d62872;color:#fff;border-radius:20px;text-decoration:none;font-size:14px}</style>
</head><body><h1>此商品已下架</h1><p>商品編號 ${code}<br>可能已售完或停止販售</p>
<a href="${isMobile ? '/m/category' : '/category'}">去看其他商品</a></body></html>`, 404);
      }
      return next();
    }

    if (p === '/category' || p === '/category/' || p === '/m/category' || p === '/m/category/') {
      const kw = (url.searchParams.get('kw') || url.searchParams.get('keyword') || '').trim();
      const page = Math.max(1, Number(url.searchParams.get('page') || 1) || 1);
      let items = allItems();
      if (kw) {
        const k = kw.toLowerCase();
        items = items.filter((i) => i.name.toLowerCase().includes(k) || String(i.code).includes(k));
      }
      // 目录为空（未加载成功）→ 交回静态页
      if (!allItems().length) return next();
      const total = items.length;
      const slice = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
      return html(renderCategoryPage(kind, { items: slice, page, pageSize: PAGE_SIZE, total, kw }));
    }

    return next();
  } catch (e) {
    console.error('[fn] error', e && e.stack);
    return html(`<!doctype html><meta charset="utf-8"><h1>500</h1><pre>${String(e && e.message)}</pre>`, 500);
  }
}
