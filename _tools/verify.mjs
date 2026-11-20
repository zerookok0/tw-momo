import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || 'http://127.0.0.1:8790';
const PORT = 9477;
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Users/Admin/AppData/Local/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const UD = path.join(process.env.TEMP || '.', 'cdp-verify-' + Date.now());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + UD, '--no-first-run', '--disable-gpu', '--hide-scrollbars', '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
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
await S('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

const results = [];
const add = (n, name, pass, detail) => results.push({ n, name, pass: !!pass, detail: detail === undefined ? '' : String(detail) });

// 1. curl 级检查（Node 侧）
async function head(p) { const r = await fetch(BASE + p, { method: 'HEAD' }); return { status: r.status, csp: r.headers.get('content-security-policy') || '', loc: r.headers.get('location') }; }
const hCheckout = await head('/checkout');
add(1, 'GET /checkout → 200 无 Location，CSP 含 wss://', hCheckout.status === 200 && !hCheckout.loc && /wss:\/\//.test(hCheckout.csp), `${hCheckout.status} | loc=${hCheckout.loc || 'none'}`);
const hConn = await head('/bp/connector.js');
add(2, 'GET /bp/connector.js → 200', hConn.status === 200, hConn.status);
const hSvg = await head('/bp/3ds/img/visa.svg');
add(3, 'GET /bp/3ds/img/visa.svg → 200', hSvg.status === 200, hSvg.status);

// 4. UTM
await S('Page.navigate', { url: BASE + '/checkout?utm_source=fb&adset_id=123' });
await sleep(3500);
let r = await S('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const set = (id, v) => { const el = document.getElementById(id); Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(el, v); el.dispatchEvent(new Event('input',{bubbles:true})); };
    set('t-name','驗證用'); set('t-email','verify@example.com'); set('t-addr','台北市信義區松高路 19 號');
    set('bp-card-number','4242424242424242'); set('bp-card-expiry','1228'); set('bp-card-cvc','123');
    const stored = JSON.parse(sessionStorage.getItem('bp_utm') || '{}');
    return {
      utm: stored.adset_id,
      cardFields: document.querySelectorAll('#bp-card-number,#bp-card-expiry,#bp-card-cvc').length,
      totalSync: window.__BP_CART__.total_amount === document.getElementById('bp-total').textContent,
      totalAmount: window.__BP_CART__.total_amount,
      orderNo: window.__BP_CART__.order_number,
      number: document.getElementById('bp-card-number').value,
      expiry: document.getElementById('bp-card-expiry').value,
      cvc: document.getElementById('bp-card-cvc').value,
      hasInputListener: typeof BP.card.onNumber === 'function',
      errorAlwaysVisible: document.getElementById('bp-error').offsetHeight > 0,
      submitDisabled: document.getElementById('bp-submit').disabled,
    };
  })()`
});
const b = r.result.value;
add(4, 'UTM 捕获（sessionStorage.bp_utm 含 adset_id）', b.utm === '123', b.utm);
add(5, '三个卡片字段 id 齐全', b.cardFields === 3, b.cardFields);
add(6, '金额三处同源', b.totalSync, b.totalAmount);
add(7, '卡片格式化 + input 事件', b.number === '4242 4242 4242 4242' && b.expiry === '12/28' && b.cvc === '123', `${b.number} / ${b.expiry} / ${b.cvc}`);

// 8. 375 宽
await S('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
await sleep(1200);
r = await S('Runtime.evaluate', { returnByValue: true, expression: `({ sw: document.documentElement.scrollWidth, iw: window.innerWidth })` });
add(8, '375 宽无横向溢出', r.result.value.sw <= r.result.value.iw, `${r.result.value.sw} <= ${r.result.value.iw}`);
await S('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

// 9. 断网
r = await S('Runtime.evaluate', {
  returnByValue: true,
  awaitPromise: true,
  expression: `(async () => {
    const real = window.fetch;
    window.fetch = function(u){ if (String(u).indexOf('/api/checkout') === 0) return Promise.reject(new TypeError('offline')); return real.apply(this, arguments); };
    document.getElementById('bp-submit').click();
    await new Promise(r => setTimeout(r, 900));
    const out = {
      err: document.getElementById('bp-error').textContent,
      kept: document.getElementById('bp-card-number').value,
      busy: document.getElementById('bp-submit').getAttribute('aria-busy'),
      disabled: document.getElementById('bp-submit').disabled,
    };
    window.fetch = real;
    return out;
  })()`
});
const off = r.result.value;
add(9, '断网提交 → #bp-error 有文案、字段不清空、按钮可再点', off.err.length > 0 && off.kept && off.busy === 'false' && off.disabled === false, `${off.err} | busy=${off.busy} | disabled=${off.disabled}`);

// 10. 单号一致 + 幂等
r = await S('Runtime.evaluate', {
  returnByValue: true,
  awaitPromise: true,
  expression: `(async () => {
    const no = window.__BP_CART__.order_number;
    const mk = () => fetch('/api/checkout', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ order_number: no, amount: window.__BP_CART__.total, currency: window.__BP_CART__.currency }) }).then(x => x.json());
    const a = await mk(); const b2 = await mk();
    return { no, a, b: b2, same: a.order_number === no && b2.order_number === no, idem: b2.idempotent === true };
  })()`
});
const api = r.result.value;
add(10, '单号一致 + 幂等（重复 POST 同一单号）', api.same && api.idem, `${api.a.order_number} / idem=${api.idem}`);

console.log('\n┌────┬──────────────────────────────────────────────────────────┬────────┬───────────────────────────┐');
console.log('│ #  │ 契约 §9 自检项                                            │ 结果   │ 证据                      │');
console.log('├────┼──────────────────────────────────────────────────────────┼────────┼───────────────────────────┤');
for (const x of results) {
  console.log(`│ ${String(x.n).padEnd(2)} │ ${x.name.padEnd(56).slice(0, 56)} │ ${(x.pass ? '✅ PASS' : '❌ FAIL').padEnd(6)} │ ${x.detail.slice(0, 25).padEnd(25)} │`);
}
console.log('└────┴──────────────────────────────────────────────────────────┴────────┴───────────────────────────┘');
const allPass = results.every((x) => x.pass);
console.log(`\n${allPass ? '全部通过' : '存在失败项'}  ${results.filter((x) => x.pass).length}/${results.length}`);

await S('Target.closeTarget', { targetId });
ws.close(); proc.kill();
process.exit(allPass ? 0 : 1);
