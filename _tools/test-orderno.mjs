import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { onRequest } from "../functions/[[path]].js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(path.resolve(__dirname, ".."), "dist");
const ORIGIN = "http://localhost:8788";
const MIME = { ".html": "text/html; charset=utf-8", ".json": "application/json", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };
const env = { ASSETS: { async fetch(i) { const u = new URL(typeof i === "string" ? i : i.url, ORIGIN); let p = path.join(DIST, decodeURIComponent(u.pathname)); if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html"); if (!fs.existsSync(p)) return new Response("nf", { status: 404 }); return new Response(fs.readFileSync(p), { status: 200, headers: { "Content-Type": MIME[path.extname(p).toLowerCase()] || "application/octet-stream" } }); } } };
const next = () => new Response("STATIC", { status: 200 });

const r1 = await onRequest({ request: new Request(ORIGIN + "/checkout"), env, next, params: {} });
const cookie = (r1.headers.get("set-cookie") || "").split(";")[0];
const html = await r1.text();
const injected = (html.match(/order_number:\s*"([^"]+)"/) || [])[1];
console.log(`${r1.status} /checkout  Location=${r1.headers.get("location") || "无"}`);
console.log(`  Set-Cookie : ${cookie || "（无）"}`);
console.log(`  注入单号    : ${injected || "（未注入）"}`);

const cart = await (await onRequest({ request: new Request(ORIGIN + "/api/cart", { headers: { Cookie: cookie } }), env, next, params: {} })).json();
console.log(`  /api/cart 单号: ${cart.order_number}  ${cart.total_amount}  与页面一致=${cart.order_number === injected}`);

const post = await (await onRequest({ request: new Request(ORIGIN + "/api/checkout", { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify({ order_number: injected, amount: cart.total, currency: "TWD" }) }), env, next, params: {} })).json();
console.log(`  /api/checkout: ok=${post.ok} 单号复用=${post.order_number === injected}`);
const order = await (await onRequest({ request: new Request(ORIGIN + "/api/order/" + injected), env, next, params: {} })).json();
console.log(`  /api/order   : $${order.order && order.order.amount}`);
