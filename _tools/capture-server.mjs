import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '_ref', 'cap');
fs.mkdirSync(ROOT, { recursive: true });

const PORT = Number(process.env.CAP_PORT || 8899);

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
}

function safeJoin(rel) {
  const p = path.resolve(ROOT, rel.replace(/^[\\/]+/, ''));
  if (!p.startsWith(ROOT)) throw new Error('bad path');
  return p;
}

const server = http.createServer((req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/ping') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, root: ROOT }));
  }

  if (url.pathname === '/save' && req.method === 'POST') {
    const rel = url.searchParams.get('path') || 'unnamed.bin';
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const buf = Buffer.concat(chunks);
        const target = safeJoin(rel);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, buf);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, path: target, bytes: buf.length }));
      } catch (e) {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(e && e.message) }));
      }
    });
    return;
  }

  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('nope');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('capture server on http://127.0.0.1:' + PORT + ' root=' + ROOT);
});
