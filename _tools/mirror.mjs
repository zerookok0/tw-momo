import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(__dirname, '..');
const CAP = path.join(PROJ, '_ref', 'cap');
const SITE = path.join(PROJ, 'site');
const ASSETS = path.join(SITE, 'assets');
const WB = 'https://web.archive.org/web/20251020051707id_/';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

fs.mkdirSync(ASSETS, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function hash(s) { return crypto.createHash('sha1').update(s).digest('hex').slice(0, 8); }

function localPathFor(url) {
  const u = new URL(url);
  let p = decodeURIComponent(u.pathname);
  p = p.split('/').map((seg) => seg.replace(/[<>:"|?*\x00-\x1f]/g, '_')).join('/');
  let base = p.replace(/^\/+/, '');
  if (!base) base = 'index';
  if (u.search) {
    const ext = path.extname(base);
    base = base.slice(0, base.length - ext.length) + '__' + hash(u.search) + ext;
  }
  return path.posix.join('assets', u.hostname, base);
}

const attempts = new Map();
async function fetchAsset(url, { referer } = {}) {
  if (attempts.has(url)) return attempts.get(url);
  const p = (async () => {
    const tries = [url, WB + url];
    for (const t of tries) {
      for (let i = 0; i < 3; i++) {
        try {
          const r = await fetch(t, {
            headers: { 'user-agent': UA, 'accept': '*/*', 'accept-language': 'zh-TW,zh;q=0.9', ...(referer ? { referer } : {}) },
            redirect: 'follow',
          });
          if (r.status === 200) {
            const buf = Buffer.from(await r.arrayBuffer());
            if (buf.length < 200 && /text\/html/.test(r.headers.get('content-type') || '')) throw new Error('html-body');
            return { ok: true, buf, src: t };
          }
          if (r.status === 404) break;
          throw new Error('status ' + r.status);
        } catch (e) {
          if (i === 2) return { ok: false, err: String(e && e.message) };
          await sleep(400 * (i + 1));
        }
      }
    }
    return { ok: false, err: 'all failed' };
  })();
  attempts.set(url, p);
  return p;
}

async function pool(items, n, worker) {
  let i = 0;
  const out = [];
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await worker(items[idx], idx);
    }
  }));
  return out;
}

// ---------------- CSS handling ----------------
const cssDone = new Map();
async function processCss(cssUrl, cssLocalRel) {
  if (cssDone.has(cssUrl)) return cssDone.get(cssUrl);
  const got = await fetchAsset(cssUrl);
  if (!got.ok) { console.log('CSS FAIL', cssUrl, got.err); cssDone.set(cssUrl, null); return null; }
  let css = got.buf.toString('utf8');
  const urls = new Set();
  css.replace(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g, (m, u) => { urls.add(u.trim()); return m; });
  for (const raw of urls) {
    if (/^(data:|#|about:)/i.test(raw)) continue;
    let abs;
    try { abs = new URL(raw, cssUrl).toString(); } catch { continue; }
    if (!/^https?:/i.test(abs)) continue;
    const rel = localPathFor(abs);
    const r = await fetchAsset(abs, { referer: cssUrl });
    if (r.ok) {
      const absFile = path.join(SITE, rel);
      fs.mkdirSync(path.dirname(absFile), { recursive: true });
      fs.writeFileSync(absFile, r.buf);
      css = css.split(raw).join('/' + rel);
    } else {
      console.log('CSS-ASSET FAIL', abs, r.err);
    }
  }
  const absFile = path.join(SITE, cssLocalRel);
  fs.mkdirSync(path.dirname(absFile), { recursive: true });
  fs.writeFileSync(absFile, css, 'utf8');
  cssDone.set(cssUrl, cssLocalRel);
  return cssLocalRel;
}

// ---------------- main ----------------
const domFile = process.argv[2] || path.join(CAP, 'home_dom.html');
const outFile = process.argv[3] || path.join(SITE, 'index.html');
let html = fs.readFileSync(domFile, 'utf8');

// 1. strip wayback + tracking scripts/styles
html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
html = html.replace(/<script\b[^>]*\/>/gi, '');
html = html.replace(/<link[^>]+rel="(?:preconnect|dns-prefetch|preload|modulepreload|prefetch)"[^>]*>/gi, '');
html = html.replace(/<!--[\s\S]*?-->/g, '');

// 2. collect stylesheet links
const cssLinks = [...html.matchAll(/<link[^>]+href="([^"]+\.css[^"]*)"[^>]*>/gi)].map((m) => m[1]);
const uniqCss = [...new Set(cssLinks)];
console.log('css links', uniqCss.length);

const cssMap = new Map();
await pool(uniqCss, 4, async (u) => {
  if (/web-static\.archive\.org/.test(u)) { cssMap.set(u, null); return; }
  const rel = localPathFor(u);
  const done = await processCss(u, rel);
  cssMap.set(u, done);
});
console.log('css done', [...cssMap.values()].filter(Boolean).length, '/', cssMap.size);

// replace css links with single concatenated set (keep order, drop dead)
html = html.replace(/<link[^>]+href="([^"]+\.css[^"]*)"[^>]*>/gi, (m, u) => {
  const rel = cssMap.get(u);
  return rel ? `<link rel="stylesheet" href="/${rel}">` : '';
});

// 2b. inline <style> url() assets
const allUrls = new Set();
for (const m of html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)) allUrls.add(m[1]);
for (const m of html.matchAll(/url\(\s*['"]?(https?:\/\/[^'")]+)['"]?\s*\)/g)) allUrls.add(m[1]);
console.log('unique asset urls', allUrls.size);

const urlMap = new Map();
const list = [...allUrls];
await pool(list, 10, async (u) => {
  if (/^data:|^about:/.test(u)) return;
  if (/momoshop\.com\.tw\/(?:main|search|category|goods|product|member|cart|checkout|ecm\/web|ecm\/js|\.well-known)/i.test(u) && !/\.(png|jpe?g|gif|webp|svg|woff2?|ttf|eot|ico|css)(\?|$)/i.test(u)) {
    return; // navigation link, not asset
  }
  if (/\.(?:jsp|html?)(\?|$)/i.test(u)) return;
  const rel = localPathFor(u);
  const r = await fetchAsset(u);
  if (r.ok) {
    const absFile = path.join(SITE, rel);
    fs.mkdirSync(path.dirname(absFile), { recursive: true });
    fs.writeFileSync(absFile, r.buf);
    urlMap.set(u, '/' + rel);
  } else {
    console.log('ASSET FAIL', u, r.err);
  }
});
console.log('assets ok', urlMap.size, '/', list.length);

// 3. rewrite DOM asset urls
for (const [from, to] of urlMap) html = html.split(from).join(to);

// 4. rewrite anchors
html = html.replace(/href="(https?:\/\/[^"]*momoshop[^"]*)"/gi, (m, u) => {
  return 'href="#" data-orig-href="' + u.replace(/"/g, '&quot;') + '"';
});
html = html.replace(/href="https?:\/\/web\.archive\.org[^"]*"/gi, 'href="#"');

// 5. drop leftover external domains in attributes
html = html.replace(/(src|href)="https?:\/\/(?!127\.0\.0\.1|\/)[^"]*\.(?:js|json|woff2?)"/gi, '$1="#"');

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, html, 'utf8');
console.log('WROTE', outFile, html.length);
fs.writeFileSync(path.join(CAP, 'urlmap.json'), JSON.stringify([...urlMap], null, 1), 'utf8');
