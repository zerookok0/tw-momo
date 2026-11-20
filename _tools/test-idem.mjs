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

// 模拟两笔不同金额的订单，验证单号不会撞
const mk = (no, amount) => call("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_number: no, amount }) }).then(r => r.json());
const a = await mk("ORD-20261121-AAA111", 1380);
const b = await mk("ORD-20261121-BBB222", 828);
const a2 = await mk("ORD-20261121-AAA111", 9999); // 同号重复 → 幂等
const oa = await (await call("/api/order/ORD-20261121-AAA111")).json();
const ob = await (await call("/api/order/ORD-20261121-BBB222")).json();
console.log(`订单A: ${a.order_number} $${oa.order.amount}`);
console.log(`订单B: ${b.order_number} $${ob.order.amount}  单号不同=${a.order_number !== b.order_number}`);
console.log(`A 重复提交: idempotent=${a2.idempotent} 金额仍为 $${oa.order.amount}（不被覆盖=${oa.order.amount === 1380}）`);
