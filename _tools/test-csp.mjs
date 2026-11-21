import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { onRequest } from "../functions/[[path]].js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(path.resolve(__dirname, ".."), "dist");
const ORIGIN = "http://localhost:8788";
const MIME = { ".html": "text/html; charset=utf-8", ".json": "application/json", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };
const env = { ASSETS: { async fetch(i) { const u = new URL(typeof i === "string" ? i : i.url, ORIGIN); let p = path.join(DIST, decodeURIComponent(u.pathname)); if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html"); if (!fs.existsSync(p)) return new Response("nf", { status: 404 }); return new Response(fs.readFileSync(p), { status: 200, headers: { "Content-Type": MIME[path.extname(p).toLowerCase()] || "application/octet-stream" } }); } } };
const next = () => new Response("STATIC", { status: 200 });
const call = (p, init) => onRequest({ request: new Request(ORIGIN + p, init), env, next, params: {} });

const t = [
  ["/checkout", "CSP 含 frame-src 面板域"],
  ["/m/checkout", "行动結帳同樣帶 CSP"],
  ["/category", "分类页带 CSP"],
  ["/product/1341656", "商品页带 CSP"],
  ["/cart", "购物车带 CSP"],
];
for (const [p, label] of t) {
  const r = await call(p);
  const csp = r.headers.get("content-security-policy") || "";
  const framing = (csp.match(/frame-src [^;]+/) || [""])[0];
  const ok = r.status === 200 && csp.includes("annangourmet.makeup") && r.headers.get("x-content-type-options") === "nosniff";
  console.log(`${ok ? "✅" : "❌"} ${p.padEnd(20)} ${r.status}  ${framing}`);
}
const api = await call("/api/cart");
console.log(`${(api.headers.get("content-security-policy") || "").includes("annangourmet") ? "✅" : "❌"} /api/cart 也带 CSP`);
