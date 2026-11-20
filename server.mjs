import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.join(__dirname, 'site');
const PORT = Number(process.env.PORT || 8790);
const PANEL_DOMAIN = process.env.PANEL_DOMAIN || 'panel.local';
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
  `connect-src 'self' https://${PANEL_DOMAIN} wss://${PANEL_DOMAIN}`,
  "frame-src 'self'",
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
      price: 828,
      img: '/assets/i4.momoshop.com.tw/1754298127/goodsimg/0014/295/303/14295303_OL_m.webp',
    },
    {
      name: '【威拂】魔撢本體 1把+1片裝(藍色/粉色 隨機出貨)',
      qty: 1,
      price: 59,
      img: '/assets/i2.momoshop.com.tw/1698915746/goodsimg/0008/593/194/8593194_OL_m.webp',
    },
    {
      name: '【SONAX】鍍膜美容巾(細緻柔軟.極具吸收力)',
      qty: 1,
      price: 299,
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

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, buf) => {
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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, BASE);
  const p = url.pathname;

  // ---------- API ----------
  if (p === '/api/cart') {
    if (req.method !== 'GET') return json(res, 405, { ok: false, error_code: 'method_not_allowed' });
    return json(res, 200, cartData());
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

    const orderNumber = body.order_number || cartData().order_number;
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
    return serveFile(res, path.join(SITE, 'm', 'checkout', 'index.html'));
  }
  if (p === '/m/cart' || p === '/m/cart/' || p === '/m/cart/CartList.jsp') {
    return serveFile(res, path.join(SITE, 'm', 'cart', 'index.html'));
  }
  if (p === '/m/category' || p === '/m/category/') {
    return serveFile(res, path.join(SITE, 'm', 'category', 'index.html'));
  }
  if (/^\/m\/order\/[^/]+\/?$/.test(p)) {
    return serveFile(res, path.join(SITE, 'm', 'order', 'index.html'));
  }
  if (p === '/m/product' || /^\/m\/product\/(\d+)\/?$/.test(p) || p === '/m/goods.momo') {
    const code = (p.match(/^\/m\/product\/(\d+)\/?$/) || [])[1] || url.searchParams.get('i_code');
    const dir = path.join(SITE, 'm', 'product');
    const f = code ? path.join(dir, code + '.html') : null;
    if (f && fs.existsSync(f)) return serveFile(res, f);
    const fallback = fs.readdirSync(dir).filter((x) => x.endsWith('.html'))[0];
    if (fallback) return serveFile(res, path.join(dir, fallback));
  }

  // ---------- pages ----------
  // momo 真实路由别名（与线上 URL 形态保持一致，接站零改动）
  if (p === '/' || p === '/main/Main.jsp') return serveFile(res, path.join(SITE, 'index.html'));

  if (p === '/checkout' || p === '/checkout/' ||
      p === '/cart/Checkout.jsp' || p === '/checkout/Checkout.jsp') {
    return serveFile(res, path.join(SITE, 'checkout', 'index.html'));
  }
  if (p === '/cart' || p === '/cart/' || p === '/cart/CartList.jsp') {
    return serveFile(res, path.join(SITE, 'cart', 'index.html'));
  }
  if (p === '/category' || p === '/category/' || p === '/category/LgrpCategory.jsp') {
    return serveFile(res, path.join(SITE, 'category', 'index.html'));
  }
  if (/^\/order\/[^/]+\/?$/.test(p)) return serveFile(res, path.join(SITE, 'order', 'index.html'));

  // /product/<code> 或 momo 真实 /goods/GoodsDetail.jsp?i_code=<code>
  let productCode = null;
  let mm = p.match(/^\/product\/(\d+)\/?$/);
  if (mm) productCode = mm[1];
  if (p === '/goods/GoodsDetail.jsp') productCode = url.searchParams.get('i_code');
  if (productCode) {
    const f = path.join(SITE, 'product', productCode + '.html');
    if (fs.existsSync(f)) return serveFile(res, f);
    // 未收录的 i_code 落到第一个商品，保证链路不断
    const fallback = fs.readdirSync(path.join(SITE, 'product')).filter((x) => x.endsWith('.html'))[0];
    if (fallback) return serveFile(res, path.join(SITE, 'product', fallback));
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
  console.log(`momo replica → ${BASE}`);
  console.log(`  checkout : ${BASE}/checkout`);
  console.log(`  cart api : ${BASE}/api/cart`);
});
