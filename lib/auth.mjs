/**
 * 会员认证（Node 与 Cloudflare Workers 共用，只用 Web Crypto）
 *
 * - 密码：PBKDF2-SHA256，100,000 次迭代，每账号独立 salt
 * - 会话：HMAC-SHA256 签名 token，放 HttpOnly cookie（bp_sess）
 * - 不依赖任何第三方库
 */

const ITER = 100000;
const KEYLEN = 32;

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const unhex = (s) => new Uint8Array(String(s).match(/.{1,2}/g).map((x) => parseInt(x, 16)));
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

function rndHex(n = 16) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return hex(b.buffer);
}

async function pbkdf2(password, saltBytes) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations: ITER, hash: 'SHA-256' }, key, KEYLEN * 8);
  return hex(bits);
}

/** 生成 password hash */
export async function hashPassword(password) {
  const salt = rndHex(16);
  const hash = await pbkdf2(password, unhex(salt));
  return { salt, hash, iter: ITER };
}

/** 校验密码（时间恒定比较） */
export async function verifyPassword(password, rec) {
  if (!rec || !rec.salt || !rec.hash) return false;
  const got = await pbkdf2(password, unhex(rec.salt));
  if (got.length !== rec.hash.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ rec.hash.charCodeAt(i);
  return diff === 0;
}

// ── 会话 token ──
async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signSession(payload, secret) {
  const body = b64url(enc.encode(JSON.stringify(payload)).buffer);
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body));
  return body + '.' + b64url(sig);
}

export async function verifySession(token, secret) {
  if (!token || typeof token !== 'string' || token.indexOf('.') < 0) return null;
  const [body, sig] = token.split('.');
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), unb64url(sig), enc.encode(body));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(unb64url(body)));
    if (!payload || !payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── 账号校验 ──
export function normalizePhone(s) {
  return String(s || '').replace(/\D/g, '').slice(0, 10);
}

export function validateRegister({ phone, password, name }) {
  const p = normalizePhone(phone);
  if (!/^09\d{8}$/.test(p)) return '手機號碼格式不正確（需為 09 開頭共 10 碼）';
  if (!password || String(password).length < 6) return '密碼至少 6 碼';
  if (String(password).length > 32) return '密碼最多 32 碼';
  if (name && String(name).length > 20) return '姓名最多 20 字';
  return '';
}

export const SESSION_TTL = 7 * 86400000;      // 7 天
export const COOKIE_NAME = 'bp_sess';

export function sessionCookie(token, maxAge = SESSION_TTL / 1000) {
  return `${COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`;
}

export function clearCookie() {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

export function readCookie(cookieHeader, name) {
  const m = String(cookieHeader || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? m[1] : '';
}

export const newUserId = () => 'U' + rndHex(6).toUpperCase();
