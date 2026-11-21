/**
 * 重建「商品 → 分类」映射（真分类，不靠猜）
 *
 * 上一轮抓分类页时只存了商品，把 l_code 丢了，导致 3 万商品全挤在「全部商品」。
 * 这里重抓一遍 LgrpCategory.jsp，记录「该页 l_code 上有哪些商品」。
 *
 * 输出 _ref/cat_map.jsonl：{"l":"2499900000","codes":["123","456"...]}
 * 断点续爬：_ref/catmap_done.txt
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(__dirname, '..');
const REF = path.join(PROJ, '_ref');
const LCODES = path.join(REF, 'l_codes.txt');
const DONE = path.join(REF, 'catmap_done.txt');
const OUT = path.join(REF, 'cat_map.jsonl');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const CONC = Number(process.env.CONC || 6);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 只要 10 位真实 l_code
const all = [...new Set(
  fs.readFileSync(LCODES, 'utf8').split('\n').map((s) => s.trim()).filter((s) => /^\d{10}$/.test(s))
)];
const done = new Set(fs.existsSync(DONE) ? fs.readFileSync(DONE, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean) : []);
const queue = all.filter((x) => !done.has(x));
console.log(`l_code ${all.length}，已完成 ${done.size}，队列 ${queue.length}`);

const utf8Strict = new TextDecoder('utf-8', { fatal: true });
const big5 = new TextDecoder('big5');
const decode = (buf) => { try { return utf8Strict.decode(buf); } catch { return big5.decode(buf); } };

const out = fs.createWriteStream(OUT, { flags: 'a' });
const doneOut = fs.createWriteStream(DONE, { flags: 'a' });

async function fetchCat(lcode) {
  const url = `https://web.archive.org/web/2025id_/https://www.momoshop.com.tw/category/LgrpCategory.jsp?l_code=${lcode}`;
  for (let a = 0; a < 3; a++) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 60000);
      const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'zh-TW,zh;q=0.9' }, signal: ctl.signal });
      clearTimeout(timer);
      if (r.status === 200) {
        const t = decode(Buffer.from(await r.arrayBuffer()));
        if (t.length < 3000) return null;           // wayback 错误页
        return t;
      }
      if (r.status === 404) return null;
      if (r.status === 429) { await sleep(12000 * (a + 1)); continue; }
      await sleep(2500 * (a + 1));
    } catch { await sleep(2500 * (a + 1)); }
  }
  return undefined;
}

function pickCodes(html) {
  const set = new Set();
  const re = /GoodsDetail\.jsp\?i_code=(\d{5,9})/g;
  let m;
  while ((m = re.exec(html))) set.add(m[1]);
  return [...set];
}

let ok = 0, empty = 0, fail = 0, totalCodes = 0;
const t0 = Date.now();

async function worker() {
  while (queue.length) {
    const l = queue.shift();
    const html = await fetchCat(l);
    if (html === undefined) { fail++; continue; }
    if (html === null) { empty++; doneOut.write(l + '\n'); continue; }
    const codes = pickCodes(html);
    if (codes.length) {
      out.write(JSON.stringify({ l, codes }) + '\n');
      totalCodes += codes.length;
    }
    ok++;
    doneOut.write(l + '\n');
    const el = ((Date.now() - t0) / 1000).toFixed(0);
    if (ok % 50 === 0) console.log(`[${el}s] ok=${ok} empty=${empty} fail=${fail} 队列=${queue.length} 累计归属=${totalCodes}`);
    await sleep(150);
  }
}

await Promise.all(Array.from({ length: CONC }, worker));
out.end(); doneOut.end();
console.log(`\n完成：ok=${ok} empty=${empty} fail=${fail}，累计商品-分类归属 ${totalCodes}`);
