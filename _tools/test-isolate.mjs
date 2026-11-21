import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(path.resolve(__dirname, ".."), "dist");
const ORIGIN = "http://localhost:8788";
const MIME = { ".html": "text/html; charset=utf-8", ".json": "application/json", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };
const mkEnv = () => ({ ASSETS: { async fetch(i) { const u = new URL(typeof i === "string" ? i : i.url, ORIGIN); let p = path.join(DIST, decodeURIComponent(u.pathname)); if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html"); if (!fs.existsSync(p)) return new Response("nf", { status: 404 }); return new Response(fs.readFileSync(p), { status: 200, headers: { "Content-Type": MIME[path.extname(p).toLowerCase()] || "application/octet-stream" } }); } } });
const next = () => new Response("STATIC", { status: 200 });

// 每次都拿一个全新的模块实例 = 全新 isolate（内存为空）
async function freshCall(p, init = {}, jar) {
  const mod = await import("../functions/[[path]].js?isolate=" + Math.random());
  const headers = Object.assign({}, init.headers || {}, jar.cookie ? { Cookie: jar.cookie } : {});
  const r = await mod.onRequest({ request: new Request(ORIGIN + p, { ...init, headers }), env: mkEnv(), next, params: {} });
  const sc = r.headers.getSetCookie ? r.headers.getSetCookie() : [r.headers.get("set-cookie")].filter(Boolean);
  if (sc.length) {
    const kv = sc.map(x => x.split(";")[0]);
    jar.cookie = kv.join("; ");
  }
  return r;
}
const jar = { cookie: "" };
const post = (p, body) => freshCall(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, jar);

const phone = "09" + String(Math.floor(10000000 + Math.random() * 89999999));
let r = await post("/api/auth/register", { phone, password: "momo1234", name: "跨實例" });
console.log("1 注册(隔离A):", JSON.stringify(await r.json()));
console.log("  cookie:", jar.cookie.slice(0, 60) + "…");

r = await freshCall("/api/auth/me", {}, jar);
console.log("2 me(隔离B):", JSON.stringify(await r.json()));

// 换设备：全新 jar，只有手机号密码
const jar2 = { cookie: "" };
const post2 = (p, body) => freshCall(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, jar2);
r = await post2("/api/auth/login", { phone, password: "momo1234" });
console.log("3 换设备登录(隔离C, 无 KV):", JSON.stringify(await r.json()));

r = await freshCall("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_number: "ORD-ISO-TEST", amount: 594 }) }, jar);
console.log("4 下单(隔离D):", JSON.stringify(await r.json()));
r = await freshCall("/api/member/orders", {}, jar);
const o = await r.json();
console.log("5 我的订单(隔离E):", o.total, "笔", o.orders && o.orders[0] ? "$" + o.orders[0].amount + " phone=" + o.orders[0].phone : "无");
