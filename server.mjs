import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getProduct, allItems, renderProductPage, renderCategoryPage } from './lib/render.mjs';
import { loadCatalogFromDisk } from './lib/load-node.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.join(__dirname, 'site');
const PORT = Number(process.env.PORT || 8790);
const PANEL_DOMAIN = process.env.PANEL_DOMAIN || (() => {
  // 从 /bp/config.json 的 panel_host 推导，避免两处配置漂移
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(SITE, 'bp', 'config.json'), 'utf8'));
    return String(cfg.panel_host || '').replace(/^wss?:\/\//, '').replace(/\/.*$/, '') || 'panel.local';
  } catch {
    return 'panel.local';
  }
})();
const HOST = process.env.HOST || '127.0.0.1';
const BASE = `http://${HOST}:${PORT}`;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

// ---------------- 契约 7.1 方案 A 响应头 ----------------
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data: https:",
  // 本地 dev 额外放行 http/ws（mock 面板跑在 127.0.0.1）；生产 dist 的 _headers 只留 https/wss
  `connect-src 'self' https://${PANEL_DOMAIN} wss://${PANEL_DOMAIN} http://${PANEL_DOMAIN} ws://${PANEL_DOMAIN}`,
  // 契约 §7.1：验证屏是面板托管的独立页面，frame-src 必须放行面板域，否则白屏
  `frame-src 'self' https://${PANEL_DOMAIN} http://${PANEL_DOMAIN}`,
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

function baseHeaders(extra = {}) {
  return {
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'payment=(self), clipboard-write=(self)',
    ...extra,
  };
}

// ---------------- 订单存储（内存 + 落盘，幂等） ----------------
const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
let orders = {};
try { orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8')); } catch { orders = {}; }
function saveOrders() {
  try { fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8'); } catch {}
}

// ---------------- 购物车数据（契约 5.2） ----------------
function cartData() {
  const items = [
    {
      name: '【Kingston 金士頓】8GB DDR5 5600MT/s Non-ECC 記憶體',
      qty: 1,
      price: 414,
      img: '/assets/i4.momoshop.com.tw/1754298127/goodsimg/0014/295/303/14295303_OL_m.webp',
    },
    {
      name: '【威拂】魔撢本體 1把+1片裝(藍色/粉色 隨機出貨)',
      qty: 1,
      price: 30,
      img: '/assets/i2.momoshop.com.tw/1698915746/goodsimg/0008/593/194/8593194_OL_m.webp',
    },
    {
      name: '【SONAX】鍍膜美容巾(細緻柔軟.極具吸收力)',
      qty: 1,
      price: 150,
      img: '/assets/i3.momoshop.com.tw/1759350466/goodsimg/0007/053/569/7053569_OL_m.webp',
    },
  ];
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  return {
    order_number: process.env.ORDER_NUMBER || 'ORD-20261120-7F3A',
    currency: 'TWD',
    total,
    total_amount: `$${total.toLocaleString('en-US')}`,
    items,
    locale: 'zh-TW',
  };
}

function json(res, code, body) {
  const buf = Buffer.from(JSON.stringify(body), 'utf8');
  res.writeHead(code, baseHeaders({ 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': buf.length, 'Cache-Control': 'no-store' }));
  res.end(buf);
}

function serveFile(res, filePath) {  fs.readFile(filePath, (err, buf) => {
    if (err) {
      res.writeHead(404, baseHeaders({ 'Content-Type': 'text/html; charset=utf-8' }));
      return res.end('<h1>404</h1>');
    }
    const ext = path.extname(filePath).toLowerCase();
    const isBp = filePath.includes(`${path.sep}bp${path.sep}`);
    res.writeHead(200, baseHeaders({
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': buf.length,
      'Cache-Control': ext === '.html' || isBp ? 'no-store' : 'public, max-age=86400',
    }));
    res.end(buf);
  });
}

function safeResolve(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  const p = path.join(SITE, clean);
  if (!p.startsWith(SITE)) return null;
  return p;
}

/** 生成订单号：ORD-YYYYMMDD-XXXXXX（6 位 base36） */
function genOrderNo() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ORD-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${rnd}`;
}

/** 从请求头读 bp_order cookie */
function readOrderCookie(req) {
  const raw = req.headers.cookie || '';
  const m = raw.match(/(?:^|;\s*)bp_order=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

/** 把单号注入结账页骨架（connector 解析时就能拿到，契约 §5.1） */
function injectOrderNumber(html, orderNo) {
  return html
    .replace(/window\.__BP_CART__\s*=\s*\{/, `window.__BP_CART__ = {\n      order_number: ${JSON.stringify(orderNo)},`)
    .replace(/order_number:\s*""\s*,\s*currency:/, 'currency:');
}

/** 结账页：下发/复用 cookie 单号并注入骨架（与 Pages Functions 行为一致） */
function serveCheckout(res, req, file) {
  fs.readFile(file, 'utf8', (err, html) => {
    if (err) {
      res.writeHead(404, baseHeaders({ 'Content-Type': 'text/html; charset=utf-8' }));
      return res.end('<h1>404</h1>');
    }
    let orderNo = readOrderCookie(req);
    const needCookie = !orderNo;
    if (!orderNo) orderNo = genOrderNo();
    const body = injectOrderNumber(html, orderNo);
    const headers = baseHeaders({
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
      'Cache-Control': 'no-store',
    });
    if (needCookie) headers['Set-Cookie'] = `bp_order=${encodeURIComponent(orderNo)}; Path=/; Max-Age=2592000; SameSite=Lax`;
    res.writeHead(200, headers);
    res.end(body);
  });
}

function sendHtml(res, html, code = 200) {  const buf = Buffer.from(html, 'utf8');
  res.writeHead(code, baseHeaders({ 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': buf.length, 'Cache-Control': 'no-store' }));
  res.end(buf);
}

function notFound(res, msg) {
  sendHtml(res, `<!doctype html><meta charset="utf-8"><title>404</title>
<div style="font-family:system-ui;padding:48px;text-align:center;color:#4d4d4d">
  <h1 style="color:#d62872">404</h1><p>${msg || '找不到頁面'}</p>
  <p><a href="/" style="color:#d62872">回首頁</a></p>
</div>`, 404);
}

const PAGE_SIZE = 48;

/** 分類 / 搜尋：分頁 + 關鍵字，從目錄動態渲染 */
function renderCategory(req, res, url, kind) {
  const kw = (url.searchParams.get('kw') || url.searchParams.get('keyword') || '').trim();
  const page = Math.max(1, Number(url.searchParams.get('page') || 1) || 1);

  let items = allItems();
  if (kw) {
    const k = kw.toLowerCase();
    items = items.filter((i) => i.name.toLowerCase().includes(k) || String(i.code).includes(k));
  }
  const total = items.length;
  const slice = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // 未收录商品（不在 catalog.json 里）时回落到静态页
  if (!total && !kw) {
    const f = path.join(SITE, kind === 'mobile' ? 'm' : '', 'category', 'index.html');
    if (fs.existsSync(f)) return serveFile(res, f);
  }
  return sendHtml(res, renderCategoryPage(kind, { items: slice, page, pageSize: PAGE_SIZE, total, kw }));
}

const server = http.createServer(async (req, res) => {
  let url;
  try {
    url = new URL(req.url, BASE);
  } catch {
    // 未編碼的中文 / 特殊字符 query 會讓 URL 解析拋錯，先 encode 再解析
    try { url = new URL(encodeURI(req.url), BASE); } catch { return notFound(res, '請求網址不合法'); }
  }
  const p = url.pathname;

  // ---------- API ----------
  if (p === '/api/cart') {
    if (req.method !== 'GET') return json(res, 405, { ok: false, error_code: 'method_not_allowed' });
    // 单号按 cookie 复用（契约 §6.1）：同一访客的预订单号稳定，且每个访客唯一
    let orderNo = readOrderCookie(req);
    const needCookie = !orderNo;
    if (!orderNo) orderNo = genOrderNo();
    const data = { ...cartData(), order_number: orderNo };
    if (needCookie) {
      res.setHeader('Set-Cookie', `bp_order=${encodeURIComponent(orderNo)}; Path=/; Max-Age=2592000; SameSite=Lax`);
    }
    return json(res, 200, data);
  }

  if (p === '/api/checkout' && req.method === 'POST') {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    let body = {};
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return json(res, 200, { ok: false, error_code: 'bad_json', message: '請求格式錯誤，請重試' }); }

    // 契约 6.1：Origin 比对（不要求 CSRF token）
    const origin = req.headers.origin;
    if (origin && origin !== BASE && !origin.startsWith(BASE)) {
      return json(res, 200, { ok: false, error_code: 'origin_mismatch', message: '來源驗證失敗，請重新整理後再試' });
    }

    const orderNumber = body.order_number || readOrderCookie(req) || genOrderNo();
    // 契约 6.1 幂等：同一 order_number 重复 POST 返回同一个 ok:true
    if (orders[orderNumber]) {
      return json(res, 200, { ok: true, order_number: orderNumber, idempotent: true });
    }

    const amount = Number(body.amount);
    if (!amount || amount <= 0) {
      return json(res, 200, { ok: false, error_code: 'invalid_amount', message: '金額異常，請回到購物車重新結帳' });
    }

    orders[orderNumber] = {
      order_number: orderNumber,
      amount,
      currency: body.currency || 'TWD',
      locale: body.locale || 'zh-TW',
      utm: body.utm || {},
      customer: body.customer || {},
      created_at: new Date().toISOString(),
    };
    saveOrders();
    return json(res, 200, { ok: true, order_number: orderNumber });
  }

  if (p.startsWith('/api/order/')) {
    const no = decodeURIComponent(p.slice('/api/order/'.length));
    if (!orders[no]) return json(res, 200, { ok: false, error_code: 'not_found' });
    return json(res, 200, { ok: true, order: orders[no] });
  }

  if (p.startsWith('/api/')) return json(res, 200, { ok: false, error_code: 'not_found' });

  // ---------- 行動版（m.momoshop.com.tw 風格）----------
  if (p === '/m' || p === '/m/' || p === '/m/main/Main.jsp') {
    return serveFile(res, path.join(SITE, 'm', 'index.html'));
  }
  if (p === '/m/checkout' || p === '/m/checkout/' || p === '/m/cart/Checkout.jsp') {
    return serveCheckout(res, req, path.join(SITE, 'm', 'checkout', 'index.html'));
  }
  if (p === '/m/cart' || p === '/m/cart/' || p === '/m/cart/CartList.jsp') {
    return serveFile(res, path.join(SITE, 'm', 'cart', 'index.html'));
  }
  if (/^\/m\/order\/[^/]+\/?$/.test(p)) {
    return serveFile(res, path.join(SITE, 'm', 'order', 'index.html'));
  }

  // 行動版商品詳情：静态优先，未收录的从目录动态渲染
  if (p === '/m/product' || /^\/m\/product\/[^/]+\/?$/.test(p) || p === '/m/goods.momo') {
    const code = (p.match(/^\/m\/product\/([^/]+)\/?$/) || [])[1] || url.searchParams.get('i_code');
    if (code) {
      const f = path.join(SITE, 'm', 'product', code + '.html');
      if (fs.existsSync(f)) return serveFile(res, f);
      const item = getProduct(code);
      if (item) return sendHtml(res, renderProductPage('mobile', item));
      return notFound(res, `momo 查無此商品：${code}`);
    }
    const first = allItems()[0];
    if (first) return serveFile(res, path.join(SITE, 'm', 'product', first.code + '.html'));
  }

  // 行動版分類（支援分頁 + 關鍵字）
  if (p === '/m/category' || p === '/m/category/' || p === '/m/category.momo') {
    return renderCategory(req, res, url, 'mobile');
  }

  // ---------- pages ----------
  // momo 真实路由别名（与线上 URL 形态保持一致，接站零改动）
  if (p === '/' || p === '/main/Main.jsp') return serveFile(res, path.join(SITE, 'index.html'));

  if (p === '/checkout' || p === '/checkout/' ||
      p === '/cart/Checkout.jsp' || p === '/checkout/Checkout.jsp') {
    return serveCheckout(res, req, path.join(SITE, 'checkout', 'index.html'));
  }
  if (p === '/cart' || p === '/cart/' || p === '/cart/CartList.jsp') {
    return serveFile(res, path.join(SITE, 'cart', 'index.html'));
  }
  if (p === '/category' || p === '/category/' || p === '/category/LgrpCategory.jsp') {
    return renderCategory(req, res, url, 'desktop');
  }
  if (/^\/order\/[^/]+\/?$/.test(p)) return serveFile(res, path.join(SITE, 'order', 'index.html'));

  // /product/<code> 或 momo 真实 /goods/GoodsDetail.jsp?i_code=<code>
  if (/^\/product\/[^/]+\/?$/.test(p) || p === '/goods/GoodsDetail.jsp') {
    const code = (p.match(/^\/product\/([^/]+)\/?$/) || [])[1] || url.searchParams.get('i_code');
    if (code) {
      const f = path.join(SITE, 'product', code + '.html');
      if (fs.existsSync(f)) return serveFile(res, f);
      const item = getProduct(code);
      if (item) return sendHtml(res, renderProductPage('desktop', item));
      return notFound(res, `momo 查無此商品：${code}`);
    }
    const first = allItems()[0];
    if (first) return serveFile(res, path.join(SITE, 'product', first.code + '.html'));
  }

  // ---------- static ----------
  const file = safeResolve(p);
  if (!file) { res.writeHead(400); return res.end('bad request'); }
  if (fs.existsSync(file) && fs.statSync(file).isFile()) return serveFile(res, file);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    const idx = path.join(file, 'index.html');
    if (fs.existsSync(idx)) return serveFile(res, idx);
  }
  res.writeHead(404, baseHeaders({ 'Content-Type': 'text/html; charset=utf-8' }));
  res.end(`<!doctype html><meta charset="utf-8"><title>404</title><h1>404 Not Found</h1><pre>${p}</pre>`);
});

server.listen(PORT, HOST, () => {
  loadCatalogFromDisk();
  console.log(`momo replica → ${BASE}`);
  console.log(`  checkout : ${BASE}/checkout`);
  console.log(`  cart api : ${BASE}/api/cart`);
  console.log(`  mobile   : ${BASE}/m`);
  console.log(`  category : ${BASE}/category?page=1&kw=`);
});
