// 用 mock Pages 运行时验证认证 API
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { onRequest } from "../functions/[[path]].js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(path.resolve(__dirname, ".."), "dist");
const ORIGIN = "http://localhost:8788";
const MIME = { ".html": "text/html; charset=utf-8", ".json": "application/json", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };
const env = { ASSETS: { async fetch(i) { const u = new URL(typeof i === "string" ? i : i.url, ORIGIN); let p = path.join(DIST, decodeURIComponent(u.pathname)); if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html"); if (!fs.existsSync(p)) return new Response("nf", { status: 404 }); return new Response(fs.readFileSync(p), { status: 200, headers: { "Content-Type": MIME[path.extname(p).toLowerCase()] || "application/octet-stream" } }); } } };
const next = () => new Response("STATIC", { status: 200 });
let cookie = "";
const call = async (p, init = {}) => {
  const headers = Object.assign({}, init.headers || {}, cookie ? { Cookie: cookie } : {});
  const r = await onRequest({ request: new Request(ORIGIN + p, { ...init, headers }), env, next, params: {} });
  const sc = r.headers.get("set-cookie");
  if (sc) cookie = sc.split(";")[0];
  return r;
};
const post = (p, body) => call(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

const phone = "09" + String(Math.floor(10000000 + Math.random() * 89999999));
let r = await post("/api/auth/register", { phone, password: "momo1234", name: "KV測試" });
console.log("注册:", r.status, JSON.stringify(await r.json()));
r = await call("/api/auth/me"); console.log("me:", JSON.stringify(await r.json()));
r = await post("/api/checkout", { order_number: "ORD-FN-TEST", amount: 594, currency: "TWD" });
console.log("下单:", JSON.stringify(await r.json()));
r = await call("/api/member/orders"); const o = await r.json();
console.log("会员订单:", o.total, "笔", o.orders && o.orders[0] && o.orders[0].phone === phone ? "归属正确" : "归属异常");
r = await post("/api/auth/logout", {}); console.log("登出:", JSON.stringify(await r.json()));
cookie = "";
r = await call("/api/member/orders"); console.log("登出后查订单:", JSON.stringify(await r.json()));
