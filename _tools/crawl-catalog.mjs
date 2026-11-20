/**
 * momo 全量商品爬取器
 * 数据源：Wayback Machine 的 /category/LgrpCategory.jsp 快照（原始 HTML，非渲染态）
 * 每页 ~54 个商品卡，解析 i_code / 名称 / 价格 / 图片
 *
 * 断点续爬：已爬的 l_code 记在 _ref/crawl_done.txt，商品逐条追加到 _ref/catalog_raw.jsonl
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(__dirname, '..');
const REF = path.join(PROJ, '_ref');
const LCODES = path.join(REF, 'l_codes.txt');
const DONE = path.join(REF, 'crawl_done.txt');
const OUT = path.join(REF, 'catalog_raw.jsonl');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const CONCURRENCY = Number(process.env.CONC || 3);
const LIMIT = Number(process.env.LIMIT || 0); // 0 = 全部
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const all = fs.readFileSync(LCODES, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
const done = new Set(fs.existsSync(DONE) ? fs.readFileSync(DONE, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean) : []);
let queue = all.filter((c) => !done.has(c));
if (LIMIT) queue = queue.slice(0, LIMIT);

const seen = new Set();
if (fs.existsSync(OUT)) {
  for (const line of fs.readFileSync(OUT, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { seen.add(JSON.parse(line).code); } catch {}
  }
}

console.log(`l_code 总数 ${all.length}，已完成 ${done.size}，队列 ${queue.length}，已有商品 ${seen.size}`);

const out = fs.createWriteStream(OUT, { flags: 'a' });
const doneOut = fs.createWriteStream(DONE, { flags: 'a' });

/** 解析一页 HTML 里的商品卡 */
function parse(html) {
  const items = [];
  // 商品 anchor：href 带 i_code，title 是商品名
  const re = /<a\b[^>]*?href="[^"]*GoodsDetail\.jsp\?i_code=(\d+)[^"]*"[^>]*?title="([^"]*)"[^>]*>([\s\S]{0,1600}?)<\/a>/g;
  let m;
  while ((m = re.exec(html))) {
    const code = m[1];
    const name = m[2].trim();
    const block = m[3];
    if (!code || !name || name.length < 2) continue;

    // 商品主图：img 的 org 属性带 goodsimg 的那张
    let img = null;
    const imgRe = /<img\b[^>]*?org="([^"]+goodsimg[^"]+)"/g;
    let im;
    while ((im = imgRe.exec(block))) {
      let u = im[1];
      if (u.startsWith('//')) u = 'https:' + u;
      img = u;
    }

    // 价格：页面里 <span class="GDS-<code>">1,880</span>
    let price = null;
    const pRe = new RegExp('class="[^"]*GDS-' + code + '"[^>]*>\\s*([\\d,]+)', 'i');
    const pm = html.match(pRe);
    if (pm) price = Number(pm[1].replace(/,/g, ''));
    if (!price) {
      const pRe2 = new RegExp('GDS-' + code + '[^>]*>\\s*([\\d,]+)', 'i');
      const pm2 = html.match(pRe2);
      if (pm2) price = Number(pm2[1].replace(/,/g, ''));
    }

    items.push({ code, name, price, img });
  }
  return items;
}

/**
 * 逐頁解碼：momo 的 JSP 頁面編碼不統一（多數 UTF-8，少數 Big5）。
 * 先嚴格 UTF-8 解；拋錯就當 Big5 解，避免出現 � 亂碼。
 */
const utf8Strict = new TextDecoder('utf-8', { fatal: true });
const big5 = new TextDecoder('big5');
function decodeBody(buf) {
  try {
    return utf8Strict.decode(buf);
  } catch {
    return big5.decode(buf);
  }
}

async function fetchPage(lcode) {
  const url = `https://web.archive.org/web/2025id_/https://www.momoshop.com.tw/category/LgrpCategory.jsp?l_code=${lcode}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 90000);
      const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'zh-TW,zh;q=0.9' }, signal: ctl.signal });
      clearTimeout(timer);
      // 必须显式 UTF-8 解码：wayback 的 Content-Type 可能声明 charset=big5，自动解码会乱码
      if (r.status === 200) return decodeBody(Buffer.from(await r.arrayBuffer()));
      if (r.status === 404) return null;
      if (r.status === 429) { await sleep(5000 * (attempt + 1)); continue; }
      await sleep(3000 * (attempt + 1));
    } catch {
      await sleep(3000 * (attempt + 1));
    }
  }
  return undefined; // undefined = 暂时失败，不标记 done
}

let ok = 0, empty = 0, fail = 0, added = 0;
const t0 = Date.now();

async function worker() {
  while (queue.length) {
    const lcode = queue.shift();
    const html = await fetchPage(lcode);
    if (html === undefined) { fail++; continue; }
    if (html === null) { empty++; doneOut.write(lcode + '\n'); continue; }

    const items = parse(html);
    let n = 0;
    for (const it of items) {
      if (seen.has(it.code)) continue;
      seen.add(it.code);
      out.write(JSON.stringify(it) + '\n');
      n++; added++;
    }
    ok++; n && (empty = empty);
    doneOut.write(lcode + '\n');

    const el = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(`[${el}s] ${lcode} → +${n} (total ${seen.size}) | ok=${ok} empty=${empty} fail=${fail} queue=${queue.length}`);
    await sleep(150);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
out.end(); doneOut.end();
console.log(`\n完成：商品 ${seen.size} 个（本次新增 ${added}），页 ok=${ok} empty=${empty} fail=${fail}`);
