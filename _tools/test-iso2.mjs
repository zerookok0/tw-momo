import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(path.resolve(__dirname, ".."), "dist");
const ORIGIN = "http://localhost:8788";
const MIME = { ".html": "text/html; charset=utf-8", ".json": "application/json", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };
const mkEnv = () => ({ ASSETS: { async fetch(i) { const u = new URL(typeof i === "string" ? i : i.url, ORIGIN); let p = path.join(DIST, decodeURIComponent(u.pathname)); if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html"); if (!fs.existsSync(p)) return new Response("nf", { status: 404 }); return new Response(fs.readFileSync(p), { status: 200, headers: { "Content-Type": MIME[path.extname(p).toLowerCase()] || "application/octet-stream" } }); } } });
const next = () => new Response("STATIC", { status: 200 });
const jar = { cookie: "" };
async function call(p, init = {}) {
  const mod = await import("../functions/[[path]].js?i=" + Math.random());
  const headers = Object.assign({}, init.headers || {}, jar.cookie ? { Cookie: jar.cookie } : {});
  const r = await mod.onRequest({ request: new Request(ORIGIN + p, { ...init, headers }), env: mkEnv(), next, params: {} });
  const sc = r.headers.getSetCookie ? r.headers.getSetCookie() : [];
  if (sc.length) {
    const map = new Map();
    (jar.cookie ? jar.cookie.split("; ") : []).forEach(kv => { const [k] = kv.split("="); map.set(k, kv); });
    sc.forEach(x => { const kv = x.split(";")[0]; const [k] = kv.split("="); map.set(k, kv); });
    jar.cookie = [...map.values()].join("; ");
  }
  return r;
}
const post = (p, b) => call(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });

const phone = "09" + String(Math.floor(10000000 + Math.random() * 89999999));
console.log("注册:", JSON.stringify(await (await post("/api/auth/register", { phone, password: "momo1234", name: "跨实例" })).json()));
console.log("cookie 数:", jar.cookie.split("; ").length);
console.log("下单:", JSON.stringify(await (await post("/api/checkout", { order_number: "ORD-ISO-2", amount: 594 })).json()));
console.log("cookie 数:", jar.cookie.split("; ").length);
const r = await call("/api/member/orders");
console.log("会员订单原始返回:", await r.text());
