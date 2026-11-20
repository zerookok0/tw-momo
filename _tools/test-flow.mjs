import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { onRequest } from "../functions/[[path]].js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(path.resolve(__dirname, ".."), "dist");
const ORIGIN = "http://localhost:8788";
const MIME = { ".html": "text/html; charset=utf-8", ".json": "application/json", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".ttf": "font/ttf" };
const env = { ASSETS: { async fetch(input) {
  const u = new URL(typeof input === "string" ? input : input.url ?? input.toString(), ORIGIN);
  let p = path.join(DIST, decodeURIComponent(u.pathname));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!fs.existsSync(p)) return new Response("nf", { status: 404 });
  return new Response(fs.readFileSync(p), { status: 200, headers: { "Content-Type": MIME[path.extname(p).toLowerCase()] || "application/octet-stream" } });
} } };
const next = () => new Response("STATIC", { status: 200 });
const call = (p, init) => onRequest({ request: new Request(ORIGIN + p, init), env, next, params: {} });

console.log("=== 结账/购物车直出（必须 200，无 Location）===");
for (const p of ["/checkout", "/checkout/", "/cart", "/m", "/m/", "/m/checkout", "/m/checkout/", "/m/cart"]) {
  const r = await call(p);
  const loc = r.headers.get("location");
  const html = await r.text();
  const hasBp = html.includes("/bp/connector.js");
  console.log(`${r.status === 200 && !loc ? "✅" : "❌"} ${p.padEnd(16)} ${r.status}  Location=${loc || "无"}  connector=${hasBp}`);
}

console.log("\n=== 完整下单链路 ===");
const cart = await (await call("/api/cart")).json();
console.log(`1. GET /api/cart → ${cart.order_number} ${cart.total_amount} (${cart.items.length} 件)`);
const r2 = await call("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_number: cart.order_number, amount: cart.total, currency: cart.currency }) });
const j2 = await r2.json();
console.log(`2. POST /api/checkout → ${r2.status} ok=${j2.ok} 单号=${j2.order_number} 复用=${j2.order_number === cart.order_number}`);
const r3 = await call("/order/" + encodeURIComponent(j2.order_number));
console.log(`3. GET /order/${j2.order_number} → ${r3.status}`);
const r4 = await call("/api/order/" + encodeURIComponent(j2.order_number));
const j4 = await r4.json();
console.log(`4. GET /api/order/:no → $${j4.order && j4.order.amount}`);
