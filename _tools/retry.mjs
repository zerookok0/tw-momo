import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(__dirname, '..');
const SITE = path.join(PROJ, 'site');
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

async function tryFetch(url) {
  for (const target of [url, WB + url]) {
    try {
      const r = await fetch(target, { headers: { 'user-agent': UA, 'accept': '*/*', 'accept-language': 'zh-TW,zh;q=0.9' }, redirect: 'follow' });
      if (r.status === 200) {
        const buf = Buffer.from(await r.arrayBuffer());
        const ct = r.headers.get('content-type') || '';
        if (/text\/html/.test(ct) && buf.length < 4096) continue;
        return buf;
      }
    } catch {}
    await sleep(1200);
  }
  return null;
}

const files = process.argv.slice(2);
const targets = files.length ? files : [path.join(SITE, 'index.html')];

for (const file of targets) {
  let html = fs.readFileSync(file, 'utf8');
  const urls = new Set();
  for (const m of html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)) urls.add(m[1].replace(/&amp;/g, '&'));
  for (const m of html.matchAll(/url\(\s*['"]?(https?:\/\/[^'")]+)['"]?\s*\)/g)) urls.add(m[1]);
  const list = [...urls].filter((u) => !/web\.archive\.org|facebook\.com|bing\.com|google|doubleclick|criteo|taboola|creativecdn|appier|sentry|googletagmanager|momo5188|corp\.momo\.com\.tw\/|bat\.bing/.test(u));
  console.log('[' + path.basename(file) + '] remote urls remaining:', urls.size, 'candidates:', list.length);
  let ok = 0, fail = 0;
  for (const u of list) {
    const rel = localPathFor(u);
    const buf = await tryFetch(u);
    if (buf) {
      const abs = path.join(SITE, rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, buf);
      html = html.split(u).join('/' + rel);
      ok++;
    } else {
      fail++;
      console.log('  STILL FAIL', u);
    }
    await sleep(800);
  }
  fs.writeFileSync(file, html, 'utf8');
  console.log('[' + path.basename(file) + '] ok=' + ok + ' fail=' + fail);
}
