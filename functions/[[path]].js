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
import {
  hashPassword, verifyPassword, signSession, verifySession,
  normalizePhone, validateRegister, SESSION_TTL, COOKIE_NAME,
  sessionCookie, clearCookie, readCookie, newUserId,
} from '../lib/auth.mjs';

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

// ── 会员账号：优先 KV（env.USERS），否则内存（同 isolate 有效）──
const MEM_USERS = new Map();
const USERS = {
  async get(env, phone) {
    if (env && env.USERS) {
      const raw = await env.USERS.get('u:' + phone);
      return raw ? JSON.parse(raw) : null;
    }
    return MEM_USERS.get(phone) || null;
  },
  async put(env, phone, rec) {
    if (env && env.USERS) await env.USERS.put('u:' + phone, JSON.stringify(rec));
    else MEM_USERS.set(phone, rec);
  },
};

const SESSION_SECRET_OF = (env) => (env && env.SESSION_SECRET) || 'momo-replica-demo-secret-2026';

async function currentUser(context) {
  const { request, env } = context;
  const token = readCookie(request.headers.get('Cookie') || '', COOKIE_NAME);
  if (!token) return null;
  const payload = await verifySession(token, SESSION_SECRET_OF(env));
  if (!payload) return null;
  const u = await USERS.get(env, payload.phone);
  if (!u) return null;
  return { uid: u.uid, phone: u.phone, name: u.name || '', email: u.email || '' };
}

const MSG = {
  invalid_amount: '金額異常，請回到購物車重新結帳',
  origin_mismatch: '來源驗證失敗，請重新整理後再試',
  bad_json: '請求格式錯誤，請重試',
  not_found: '找不到訂單',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...secHeaders(), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function html(str, status = 200) {
  return new Response(str, {
    status,
    headers: { ...secHeaders(), 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

// ── 安全响应头（契约 §7.1 方案 A）──
// 注意：Functions 的响应不经过 dist/_headers，必须在这里自己带
let PANEL_DOMAIN = '';

async function ensurePanelDomain(env, url) {
  if (PANEL_DOMAIN) return PANEL_DOMAIN;
  try {
    const r = await env.ASSETS.fetch(new URL('/bp/config.json', url).toString());
    const j = await r.json();
    PANEL_DOMAIN = String(j.panel_host || '').replace(/^wss?:\/\//, '').replace(/\/.*$/, '') || 'panel.local';
  } catch {
    PANEL_DOMAIN = 'panel.local';
  }
  return PANEL_DOMAIN;
}

function secHeaders() {
  const d = PANEL_DOMAIN || 'panel.local';
  return {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data: https:",
      `connect-src 'self' https://${d} wss://${d}`,
      // 契约 §7.1：验证屏是面板托管的独立页面，frame-src 必须放行面板域
      `frame-src 'self' https://${d}`,
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'payment=(self), clipboard-write=(self)',
  };
}

function fallbackCart() {
  const items = [
    { name: '【Kingston 金士頓】8GB DDR5 5600MT/s Non-ECC 記憶體', qty: 1, price: 414, img: '/assets/i4.momoshop.com.tw/1754298127/goodsimg/0014/295/303/14295303_OL_m.webp' },
    { name: '【威拂】魔撢本體 1把+1片裝(藍色/粉色 隨機出貨)', qty: 1, price: 30, img: '/assets/i2.momoshop.com.tw/1698915746/goodsimg/0008/593/194/8593194_OL_m.webp' },
    { name: '【SONAX】鍍膜美容巾(細緻柔軟.極具吸收力)', qty: 1, price: 150, img: '/assets/i3.momoshop.com.tw/1759350466/goodsimg/0007/053/569/7053569_OL_m.webp' },
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

// ── 目录页直出：Cloudflare Pages 会把 /checkout 308 到 /checkout/，
//    而契约 §2 / §9-1 明确要求「接受尾斜杠，不 301 重定向」。
//    这些路径改由 Function 直接吐 HTML，保证 200 无 Location。
const DIRECT_PAGES = {
  '/checkout': '/checkout/index.html',
  '/checkout/': '/checkout/index.html',
  '/cart': '/cart/index.html',
  '/cart/': '/cart/index.html',
  '/m': '/m/index.html',
  '/m/': '/m/index.html',
  '/m/checkout': '/m/checkout/index.html',
  '/m/checkout/': '/m/checkout/index.html',
  '/m/cart': '/m/cart/index.html',
  '/m/cart/': '/m/cart/index.html',
  '/member': '/info/member-center.html',
  '/member/': '/info/member-center.html',
};

// ── 单号：按 cookie 复用，保证「单号复用」+ 每访客唯一 ──
function genOrderNo() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ORD-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${rnd}`;
}

function readOrderCookie(request) {
  const raw = request.headers.get('Cookie') || '';
  const m = raw.match(/(?:^|;\s*)bp_order=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

/** 把单号注入结账页骨架，connector 解析时就能拿到（契约 §5.1 原地 mutate 前的初始值） */
function injectOrderNumber(html, orderNo) {
  return html.replace(
    /window\.__BP_CART__\s*=\s*\{/,
    `window.__BP_CART__ = {\n      order_number: ${JSON.stringify(orderNo)},`
  ).replace(
    // 去掉骨架里原有的空 order_number，避免重复键
    /order_number:\s*""\s*,\s*currency:/,
    'currency:'
  );
}


export async function onRequest(context) {
  const { request, env, next, params } = context;
  const url = new URL(request.url);
  const p = url.pathname;
  const method = request.method;

  try {
    // 先拿到面板域，后面所有 HTML/JSON 响应都要用它拼 CSP
    await ensurePanelDomain(env, url);

    // ───────── 站内实体页 /info/<slug>（关于我们 / 隐私权 / FAQ / 订单查询 …）─────────
    if (p.startsWith('/info/') && !/\.[a-z0-9]+$/i.test(p)) {
      const slug = p.slice('/info/'.length).replace(/\/+$/, '');
      if (!slug) return next();
      const res = await env.ASSETS.fetch(new URL(`/info/${slug}.html`, url).toString());
      if (!res.ok) return next();
      return new Response(await res.text(), {
        status: 200,
        headers: { ...secHeaders(), 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }

    // ───────── 目录页直出（避免 308）─────────
    if (DIRECT_PAGES[p]) {
      const res = await env.ASSETS.fetch(new URL(DIRECT_PAGES[p], url).toString());
      if (!res.ok) return next();
      let body = await res.text();
      const headers = {
        ...secHeaders(),
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      };

      // 结账页：下发/复用 cookie 单号，并注入骨架（否则提交时单号为空、每次都撞同一个号）
      const isCheckout = p === '/checkout' || p === '/checkout/' || p === '/m/checkout' || p === '/m/checkout/';
      if (isCheckout) {
        let orderNo = readOrderCookie(request);
        if (!orderNo) {
          orderNo = genOrderNo();
          headers['Set-Cookie'] = `bp_order=${encodeURIComponent(orderNo)}; Path=/; Max-Age=2592000; SameSite=Lax`;
        }
        body = injectOrderNumber(body, orderNo);
        headers['Cache-Control'] = 'no-store';
      }

      return new Response(body, { status: 200, headers });
    }

    // ───────── 订单成功页（/order/<no>、/m/order/<no>）─────────
    // Pages 对不存在的子路径会回落，必须显式直出，否则会拿到首页内容
    if (/^\/m?\/?order\/[^/]+\/?$/.test(p)) {
      const file = p.startsWith('/m/') ? '/m/order/index.html' : '/order/index.html';
      const res = await env.ASSETS.fetch(new URL(file, url).toString());
      if (!res.ok) return next();
      return new Response(await res.text(), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }

    // ───────── API ─────────
    if (p === '/api/cart') {
      if (method !== 'GET') return json({ ok: false, error_code: 'method_not_allowed' }, 405);
      // 有 cookie 就复用单号，保证同一访客的预订单号稳定（契约 §6.1 单号复用）
      let orderNo = readOrderCookie(request);
      const setCookie = orderNo ? null : `bp_order=${encodeURIComponent((orderNo = genOrderNo()))}; Path=/; Max-Age=2592000; SameSite=Lax`;
      const cart = { ...fallbackCart(), order_number: orderNo };
      const res = json(cart);
      if (setCookie) res.headers.set('Set-Cookie', setCookie);
      return res;
    }

    if (p === '/api/checkout' && method === 'POST') {
      let body = {};
      try { body = await request.json(); } catch { return json({ ok: false, error_code: 'bad_json', message: MSG.bad_json }); }

      const origin = request.headers.get('Origin');
      if (origin && origin !== url.origin) return json({ ok: false, error_code: 'origin_mismatch', message: MSG.origin_mismatch });

      // 单号：优先用请求里的（契约 §6.1 单号复用），其次 cookie，最后新生成
      const no = body.order_number || readOrderCookie(request) || genOrderNo();
      // 契约 §6.1：幂等
      if (ORDERS.has(no)) return json({ ok: true, order_number: no, idempotent: true });

      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) return json({ ok: false, error_code: 'invalid_amount', message: MSG.invalid_amount });

      const me0 = await currentUser(context);   // 已登录则把订单挂在会员名下
      ORDERS.set(no, {
        order_number: no,
        amount,
        currency: body.currency || 'TWD',
        locale: body.locale || 'zh-TW',
        utm: body.utm || {},
        customer: body.customer || {},
        phone: (me0 && me0.phone) || '',
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

    // ───────── 会员认证 ─────────
    if (p === '/api/auth/me' && method === 'GET') {
      const me = await currentUser(context);
      return json(me ? { ok: true, user: me } : { ok: false, error_code: 'not_login' });
    }

    if (p === '/api/auth/register' && method === 'POST') {
      let body = {};
      try { body = await request.json(); } catch { return json({ ok: false, error_code: 'invalid', message: MSG.bad_json }); }
      const err = validateRegister(body);
      if (err) return json({ ok: false, error_code: 'invalid', message: err });

      const phone = normalizePhone(body.phone);
      if (await USERS.get(env, phone)) return json({ ok: false, error_code: 'exists', message: '此手機號碼已註冊，請直接登入' });

      const { salt, hash } = await hashPassword(body.password);
      const rec = {
        uid: newUserId(), phone,
        name: String(body.name || '').trim(),
        email: String(body.email || '').trim(),
        salt, hash, created_at: new Date().toISOString(),
      };
      await USERS.put(env, phone, rec);

      const token = await signSession({ phone, uid: rec.uid, exp: Date.now() + SESSION_TTL }, SESSION_SECRET_OF(env));
      const res = json({ ok: true, user: { uid: rec.uid, phone, name: rec.name, email: rec.email } });
      res.headers.set('Set-Cookie', sessionCookie(token));
      return res;
    }

    if (p === '/api/auth/login' && method === 'POST') {
      let body = {};
      try { body = await request.json(); } catch { return json({ ok: false, error_code: 'invalid', message: MSG.bad_json }); }
      const phone = normalizePhone(body.phone);
      const u = phone ? await USERS.get(env, phone) : null;
      if (!u || !(await verifyPassword(body.password, u))) {
        return json({ ok: false, error_code: 'bad_credential', message: '手機號碼或密碼不正確' });
      }
      const token = await signSession({ phone, uid: u.uid, exp: Date.now() + SESSION_TTL }, SESSION_SECRET_OF(env));
      const res = json({ ok: true, user: { uid: u.uid, phone, name: u.name || '', email: u.email || '' } });
      res.headers.set('Set-Cookie', sessionCookie(token));
      return res;
    }

    if (p === '/api/auth/logout' && method === 'POST') {
      const res = json({ ok: true });
      res.headers.set('Set-Cookie', clearCookie());
      return res;
    }

    if (p === '/api/member/orders' && method === 'GET') {
      const me = await currentUser(context);
      if (!me) return json({ ok: false, error_code: 'not_login', message: '請先登入' });
      const list = [...ORDERS.values()]
        .filter((o) => o.phone === me.phone)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      return json({ ok: true, orders: list, total: list.length });
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
