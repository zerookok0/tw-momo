const PORT = 9222;
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r,j)=>{ ws.onopen=r; ws.onerror=j; });
let id=0; const pending=new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params={}) => new Promise((res,rej)=>{ const mid=++id; pending.set(mid, m => m.error ? rej(new Error(method+": "+m.error.message)) : res(m.result)); ws.send(JSON.stringify({id:mid,method,params})); });
const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true }); return r.result && r.result.value; };
await send("Runtime.enable");
const res = await ev(`JSON.stringify((() => {
  const es = performance.getEntriesByType('resource');
  const api = es.filter(e => /\\/api\\/|\\/v1\\/|json|graphql/i.test(e.name)).map(e => ({ u: e.name.replace(location.origin,'').slice(0,120), t: e.initiatorType, s: e.transferSize }));
  const all = es.map(e => e.name.replace(location.origin,'')).filter(u => !/\\.(png|jpg|jpeg|webp|gif|svg|woff2?|css|js)(\\?|$)/i.test(u));
  return { apiCount: api.length, api: api.slice(0, 15), nonStatic: [...new Set(all)].slice(0, 20) };
})())`);
console.log(res);
ws.close(); process.exit(0);
