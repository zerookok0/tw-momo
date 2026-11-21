/**
 * 抓 EDM 活动页的商品（扩大商品基数）
 *
 * 背景：分类列表的分页（curPage=2+）没有存档，抓不到第二页。
 *      但 momo 的 EDM 活动页（cmmedm.jsp?lpn=xxx）有 38,020 个存档地址、
 *      2,674 个唯一 lpn，每页都挂着大量商品卡 —— 这是唯一能扩量的来源。
 *
 * 输出追加到 _ref/catalog_raw.jsonl（与分类抓取同格式），
 * 断点续爬记在 _ref/edm_done.txt
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(__dirname, '..');
const REF = path.join(PROJ, '_ref');
const LPNS = path.join(REF, 'lpns.txt');
const DONE = path.join(REF, 'edm_done.txt');
const OUT = path.join(REF, 'catalog_raw.jsonl');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const CONC = Number(process.env.CONC || 4);
const LIMIT = Number(process.env.LIMIT || 0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const all = fs.readFileSync(LPNS, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean).filter((x) => x.includes('|'));
const done = new Set(fs.existsSync(DONE) ? fs.readFileSync(DONE, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean) : []);
let queue = all.filter((x) => !done.has(x));
if (LIMIT) queue = queue.slice(0, LIMIT);

const seen = new Set();
if (fs.existsSync(OUT)) {
  for (const line of fs.readFileSync(OUT, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { seen.add(JSON.parse(line).code); } catch {}
  }
}
console.log(`lpn 总数 ${all.length}，已完成 ${done.size}，队列 ${queue.length}，已有商品 ${seen.size}`);

const utf8Strict = new TextDecoder('utf-8', { fatal: true });
const big5 = new TextDecoder('big5');
function decodeBody(buf) {
  try { return utf8Strict.decode(buf); } catch { return big5.decode(buf); }
}

const out = fs.createWriteStream(OUT, { flags: 'a' });
const doneOut = fs.createWriteStream(DONE, { flags: 'a' });


/** EDM 页专用解析：<li class="PD_slide js-PD_id" data-id="N"> … </li> */
function parse(html) {
  const items = [];
  const blocks = html.split('<li class="PD_slide');
  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i];
    const idm = b.match(/data-id="(\d+)"/);
    if (!idm) continue;
    const code = idm[1];

    const brand = (b.match(/js-PD_txt1"[^>]*>([^<]*)</) || [])[1] || '';
    const pname = (b.match(/js-PD_txt2"[^>]*>([^<]*)</) || [])[1] || '';
    const tag3  = (b.match(/js-PD_txt3"[^>]*>([^<]*)</) || [])[1] || '';
    let name = (brand + ' ' + pname).trim();
    if (name.length < 2) name = tag3.trim();
    if (name.length < 2) continue;

    const pm = b.match(new RegExp('GDS-' + code + '[^>]*>\\s*([\\d,]+)', 'i'));
    const price = pm ? Number(pm[1].replace(/,/g, '')) : null;

    const im = b.match(/data-original="([^"]+)"/) || b.match(/<img[^>]+src="(https?:\/\/[^"]+)"/);
    let img = im ? im[1] : null;
    if (img && img.startsWith('//')) img = 'https:' + img;

    items.push({ code, name: name.replace(/&amp;/g, '&').trim(), price, img });
  }
  return items;
}

async function fetchPage(lpn) {
  const [ts, orig] = lpn.split('|');
  const url = `https://web.archive.org/web/${ts}id_/${orig}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 90000);
      const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'zh-TW,zh;q=0.9' }, signal: ctl.signal });
      clearTimeout(timer);
      if (r.status === 200) return decodeBody(Buffer.from(await r.arrayBuffer()));
      if (r.status === 404) return null;
      if (r.status === 429) { await sleep(15000 * (attempt + 1)); continue; }
      await sleep(3000 * (attempt + 1));
    } catch {
      await sleep(3000 * (attempt + 1));
    }
  }
  return undefined;
}

let ok = 0, empty = 0, fail = 0, added = 0;
const t0 = Date.now();

async function worker() {
  while (queue.length) {
    const lpn = queue.shift();
    const html = await fetchPage(lpn);
    if (html === undefined) { fail++; continue; }
    if (html === null) { empty++; doneOut.write(lpn + '\n'); continue; }

    const items = parse(html);
    let n = 0;
    for (const it of items) {
      if (seen.has(it.code)) continue;
      seen.add(it.code);
      out.write(JSON.stringify(it) + '\n');
      n++; added++;
    }
    ok++;
    doneOut.write(lpn + '\n');
    const lpnId = lpn.split('|')[0];
    const el = ((Date.now() - t0) / 1000).toFixed(0);
    if (n) console.log(`[${el}s] ${lpnId} → +${n} (total ${seen.size}) | ok=${ok} empty=${empty} fail=${fail} queue=${queue.length}`);
    await sleep(300);
  }
}

await Promise.all(Array.from({ length: CONC }, worker));
out.end(); doneOut.end();
console.log(`\n完成：累计商品 ${seen.size}（本次新增 ${added}），页 ok=${ok} empty=${empty} fail=${fail}`);
