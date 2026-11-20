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

const check = async (p, expectTitle) => {
  const r = await call(p);
  const t = await r.text();
  const title = (t.match(/<title>(.*?)<\/title>/) || [])[1] || "";
  const ok = r.status === 200 && (!expectTitle || title.includes(expectTitle));
  console.log(`${ok ? "✅" : "❌"} ${p.padEnd(28)} ${r.status}  ${title.slice(0, 34)}`);
  return ok;
};

console.log("=== 订单成功页（重点：不能是首页内容）===");
await check("/order/ORD-20261120-7F3A", "訂單完成");
await check("/m/order/ORD-20261120-7F3A", "訂單完成");

console.log("\n=== 其它关键页 ===");
await check("/checkout", "結帳");
await check("/cart", "購物車");
await check("/m/checkout", "結帳");
await check("/category", "商品分類");
await check("/product/1341656", "momo購物網");
