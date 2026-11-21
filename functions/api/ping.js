// 诊断用最小 Function：不 import 任何本地模块
export function onRequest(context) {
  return new Response(JSON.stringify({ ok: true, ping: 'pong', now: new Date().toISOString() }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
