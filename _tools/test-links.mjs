import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { onRequest } from "../functions/[[path]].js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(path.resolve(__dirname, ".."), "dist");
const ORIGIN = "http://localhost:8788";
const MIME = { ".html": "text/html; charset=utf-8", ".json": "application/json; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".ttf": "font/ttf", ".woff2": "font/woff2" };
const env = { ASSETS: { async fetch(input) {
  const u = new URL(typeof input === "string" ? input : input.url ?? input.toString(), ORIGIN);
  let p = path.join(DIST, decodeURIComponent(u.pathname));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!fs.existsSync(p)) return new Response("nf", { status: 404 });
  return new Response(fs.readFileSync(p), { status: 200, headers: { "Content-Type": MIME[path.extname(p).toLowerCase()] || "application/octet-stream" } });
} } };
const next = () => new Response("STATIC", { status: 200 });
const call = (p, init) => onRequest({ request: new Request(ORIGIN + p, init), env, next, params: {} });

const html = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
const links = [...new Set([...html.matchAll(/href="(\/product\/\d+|\/category[^"]*|\/cart|\/)/g)].map(m => m[1]))];
const productLinks = links.filter(l => l.startsWith("/product/"));
const otherLinks = links.filter(l => !l.startsWith("/product/")).slice(0, 6);

let ok = 0, bad = [];
for (const l of [...productLinks.slice(0, 20), ...otherLinks]) {
  const r = await call(l);
  if (r.status === 200) ok++; else bad.push(`${l} → ${r.status}`);
}
console.log(`首页链接抽检：${ok}/${productLinks.slice(0, 20).length + otherLinks.length} 返回 200`);
if (bad.length) console.log("失败:", bad);
const dead = (html.match(/href="#"\s+data-orig-href=/g) || []).length;
console.log(`剩余 href="#" 死链：${dead} 个（会员/客服/外部社群，本站无对应页）`);

// 未收录商品 → 404 而不是拿别的商品糊弄
const r = await call("/product/999999999");
console.log(`未收录商品 /product/999999999 → ${r.status}（期望 404）`);
process.exit(bad.length === 0 && r.status === 404 ? 0 : 1);
