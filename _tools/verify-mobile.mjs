import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || 'http://127.0.0.1:8790';
const PORT = 9488;
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Users/Admin/AppData/Local/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const UD = path.join(process.env.TEMP || '.', 'cdp-vm-' + Date.now());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + UD, '--no-first-run', '--disable-gpu', '--hide-scrollbars', '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });
async function getJSON(p) { for (let i = 0; i < 60; i++) { try { return await (await fetch('http://127.0.0.1:' + PORT + p)).json(); } catch { await sleep(400); } } throw new Error('no devtools'); }
const ver = await getJSON('/json/version');
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pend = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const { resolve, reject } = pend.get(m.id); pend.delete(m.id); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result); } };
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const i = ++id; pend.set(i, { resolve, reject }); ws.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) })); setTimeout(() => { if (pend.has(i)) { pend.delete(i); reject(new Error('timeout ' + method)); } }, 60000); });

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (m, p) => send(m, p, sessionId);
await S('Page.enable'); await S('Runtime.enable');
// 行動端：390 宽 + DPR 3 + touch
await S('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
await S('Emulation.setTouchEmulationEnabled', { enabled: true });

const R = [];
const add = (n, name, pass, detail = '') => R.push({ n, name, pass: !!pass, detail: String(detail) });

await S('Page.navigate', { url: BASE + '/m/checkout?utm_source=fb&adset_id=123' });
await sleep(4000);

let r = await S('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const set = (id, v) => { const el = document.getElementById(id); Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(el, v); el.dispatchEvent(new Event('input',{bubbles:true})); };
    set('t-name','王小明'); set('t-phone','0912345678'); set('t-email','guest@example.com');
    set('t-addr','松高路 19 號 5 樓');
    set('bp-card-number','4242424242424242'); set('bp-card-expiry','1228'); set('bp-card-cvc','123');
    const stored = JSON.parse(sessionStorage.getItem('bp_utm')||'{}');
    return {
      utm: stored.adset_id,
      cardFields: document.querySelectorAll('#bp-card-number,#bp-card-expiry,#bp-card-cvc').length,
      totalSync: window.__BP_CART__.total_amount === document.getElementById('bp-total').textContent,
      total: window.__BP_CART__.total_amount,
      orderNo: window.__BP_CART__.order_number,
      number: document.getElementById('bp-card-number').value,
      expiry: document.getElementById('bp-card-expiry').value,
      cvc: document.getElementById('bp-card-cvc').value,
      phone: document.getElementById('t-phone').value,
      city: document.getElementById('t-city').value,
      district: document.getElementById('t-district').value,
      districtCount: document.getElementById('t-district').options.length,
      guestNote: !!document.querySelector('.m-guest-note'),
      cardVisible: document.getElementById('cardFields').offsetHeight > 0,
      sw: navigator.serviceWorker ? (navigator.serviceWorker.controller ? 1 : 0) : 0,
      bases: document.querySelectorAll('base').length,
      sw2: document.documentElement.scrollWidth, iw: window.innerWidth,
      tabbarFixed: getComputedStyle(document.querySelector('.m-tabbar') || document.body).position,
    };
  })()`
});
const b = r.result.value;

add('M1', 'UTM 捕獲（adset_id）', b.utm === '123', b.utm);
add('M2', '六個固定 id 之卡片三欄', b.cardFields === 3, b.cardFields);
add('M3', '金額三處同源', b.totalSync, b.total);
add('M4', '卡片格式化（4 位分組 / MM/YY）', b.number === '4242 4242 4242 4242' && b.expiry === '12/28', `${b.number} | ${b.expiry}`);
add('M5', '手機號碼只收數字', b.phone === '0912345678', b.phone);
add('M6', '訪客結帳（免登入）提示存在', b.guestNote === true, b.guestNote);
add('M7', '卡片欄位首屏可見（非兩步流程）', b.cardVisible === true, b.cardVisible);
add('M8', '縣市 → 鄉鎮區聯動', b.city === '台北市' && b.districtCount === 12, `${b.city} / ${b.district} (${b.districtCount} 區)`);
add('M9', '390 寬無橫向溢出', b.sw2 <= b.iw, `${b.sw2} <= ${b.iw}`);
add('M10', '無 Service Worker / 無 <base>', b.sw === 0 && b.bases === 0, `sw=${b.sw} base=${b.bases}`);

// 提交 → /m/order/<no>
r = await S('Runtime.evaluate', {
  returnByValue: true,
  awaitPromise: true,
  expression: `(async () => {
    document.getElementById('bp-submit').click();
    const t0 = Date.now();
    while (Date.now() - t0 < 8000 && !location.pathname.startsWith('/m/order/')) await new Promise(r => setTimeout(r, 120));
    return { path: location.pathname, no: document.getElementById('orderNo') && document.getElementById('orderNo').textContent };
  })()`
}).catch(() => null);
await sleep(1200);
const nav = await S('Runtime.evaluate', { returnByValue: true, expression: `({ path: location.pathname, no: (document.getElementById('orderNo')||{}).textContent, amt: (document.getElementById('kvAmount')||{}).textContent })` });
const nv = nav.result.value;
add('M11', '訪客提交 → 跳 /m/order/<單號>', /^\/m\/order\/ORD-/.test(nv.path), `${nv.path} | ${nv.amt}`);

console.log('\n┌─────┬────────────────────────────────────────────────┬────────┐');
console.log('│  #  │ 行動版自檢                                      │ 結果   │');
console.log('├─────┼────────────────────────────────────────────────┼────────┤');
for (const x of R) {
  console.log(`│ ${x.n.padEnd(3)} │ ${x.name.padEnd(46).slice(0, 46)} │ ${(x.pass ? '✅ PASS' : '❌ FAIL').padEnd(6)} │`);
}
console.log('└─────┴────────────────────────────────────────────────┴────────┘');
for (const x of R) console.log(`  ${x.n}: ${x.detail}`);
const all = R.every((x) => x.pass);
console.log(`\n${all ? '全部通过' : '存在失败项'} ${R.filter((x) => x.pass).length}/${R.length}`);

await S('Target.closeTarget', { targetId });
ws.close(); proc.kill();
process.exit(all ? 0 : 1);
