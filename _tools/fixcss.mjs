import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(__dirname, '..');
const SITE = path.join(PROJ, 'site');
const NET = path.join(PROJ, '_ref', 'cap', 'net');
const WB = 'https://web.archive.org/web/20251020051707id_/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);

function localPathFor(url) {
  const u = new URL(url);
  let p = decodeURIComponent(u.pathname);
  p = p.split('/').map((seg) => seg.replace(/[<>:"|?*\x00-\x1f]/g, '_')).join('/');
  let base = p.replace(/^\/+/, '') || 'index';
  if (u.search) {
    const ext = path.extname(base);
    base = base.slice(0, base.length - ext.length) + '__' + hash(u.search) + ext;
  }
  return path.posix.join('assets', u.hostname, base);
}

const CSS = [
  ['https://www.momoshop.com.tw/search/_next/static/css/b36616395eb7bd31.css', 'www.momoshop.com.tw/search/_next/static/css/b36616395eb7bd31.css'],
  ['https://www.momoshop.com.tw/search/_next/static/css/62f82080ec5074dd.css', 'www.momoshop.com.tw/search/_next/static/css/62f82080ec5074dd.css'],
  ['https://www.momoshop.com.tw/search/_next/static/css/046394d9bcfe3529.css', 'www.momoshop.com.tw/search/_next/static/css/046394d9bcfe3529.css'],
  ['https://image.momoshop.com.tw/ecm/font/theme-main.css', 'image.momoshop.com.tw/ecm/font/theme-main.css'],
];

async function getRemote(url) {
  for (const t of [url, WB + url]) {
    for (let i = 0; i < 3; i++) {
      try {
        const r = await fetch(t, { headers: { 'user-agent': UA, accept: '*/*', 'accept-language': 'zh-TW,zh;q=0.9' } });
        if (r.status === 200) return Buffer.from(await r.arrayBuffer());
        if (r.status === 404) break;
      } catch {}
      await sleep(1500 * (i + 1));
    }
  }
  return null;
}

const written = [];
for (const [canon, netRel] of CSS) {
  const netFile = path.join(NET, netRel.split('/').join(path.sep));
  let css = fs.existsSync(netFile) ? fs.readFileSync(netFile, 'utf8') : null;
  if (!css) {
    const buf = await getRemote(canon);
    css = buf ? buf.toString('utf8') : null;
  }
  if (!css) { console.log('MISS CSS', canon); continue; }
  const rel = localPathFor(canon);
  const urls = new Set();
  css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, u) => { urls.add(u.trim()); return m; });
  console.log(canon, 'url() refs:', urls.size);
  for (const raw of urls) {
    if (/^(data:|#|about:)/i.test(raw)) continue;
    let abs;
    try { abs = new URL(raw, canon).toString(); } catch { continue; }
    if (!/^https?:/i.test(abs)) continue;
    const arel = localPathFor(abs);
    const absFile = path.join(SITE, arel);
    if (!fs.existsSync(absFile)) {
      const buf = await getRemote(abs);
      if (buf) {
        fs.mkdirSync(path.dirname(absFile), { recursive: true });
        fs.writeFileSync(absFile, buf);
        console.log('   +', arel, buf.length + 'B');
      } else {
        console.log('   ! FAIL', abs);
        continue;
      }
    }
    const uu = new URL(canon);
    css = css.split(raw).join('/' + arel);
  }
  const out = path.join(SITE, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, css, 'utf8');
  written.push(rel);
  console.log('WROTE CSS', rel, css.length + 'B');
}

// patch index.html stylesheet links
const idx = path.join(SITE, 'index.html');
let html = fs.readFileSync(idx, 'utf8');
html = html.replace(/(?:<link[^>]+rel="stylesheet"[^>]*>\s*)+/gi, '');
const links = [
  '/assets/www.momoshop.com.tw/search/_next/static/css/b36616395eb7bd31.css',
  '/assets/www.momoshop.com.tw/search/_next/static/css/62f82080ec5074dd.css',
  '/assets/www.momoshop.com.tw/search/_next/static/css/046394d9bcfe3529.css',
  '/assets/image.momoshop.com.tw/ecm/font/theme-main.css',
].map((h) => `<link rel="stylesheet" href="${h}">`).join('\n');
html = html.replace(/<head([^>]*)>/i, '<head$1>\n' + links + '\n');
fs.writeFileSync(idx, html, 'utf8');
console.log('patched index.html with', 4, 'stylesheets');
