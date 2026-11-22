const PORT = 9222;
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r,j)=>{ ws.onopen=r; ws.onerror=j; });
let id=0; const pending=new Map(); const hits=[];
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === "Network.requestWillBeSent") {
    const u = m.params.request.url;
    if (/\/api\/|ajaxTool|\/v1\//.test(u)) hits.push(m.params.request.method + " " + u.replace("https://www.momoshop.com.tw","").slice(0,110));
  }
};
const send = (method, params={}) => new Promise((res,rej)=>{ const mid=++id; pending.set(mid, m => m.error ? rej(new Error(method+": "+m.error.message)) : res(m.result)); ws.send(JSON.stringify({id:mid,method,params})); });
const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true }); return r.result && r.result.value; };
await send("Network.enable");
await send("Runtime.enable");
// 打开一个分类页
await send("Page.navigate", { url: "https://www.momoshop.com.tw/category/LgrpCategory.jsp?l_code=4201700000&viewport=mobile" });
await new Promise(r => setTimeout(r, 9000));
console.log("分类页 XHR/接口:");
console.log([...new Set(hits)].slice(0, 25).join("\n"));
console.log("---页面信息---");
console.log(await ev(`JSON.stringify({t:document.title, cards:document.querySelectorAll('[data-testid*="goods"],a[href*="i_code="]').length})`));
ws.close(); process.exit(0);
