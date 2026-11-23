// التحقق بخطوتين: (1) حساب Google للمدير  (2) مفتاح سري محفوظ في أسرار Cloudflare
import { HttpError } from './http.js';

const enc = new TextEncoder();
const dec = new TextDecoder();

/* ---------- base64url ---------- */
export function b64uEncode(bytes) {
  let s = ''; bytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function b64uDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/'); while (str.length % 4) str += '=';
  const bin = atob(str); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
export const randomToken = (bytes = 24) => b64uEncode(crypto.getRandomValues(new Uint8Array(bytes)));

/* ---------- مقارنة ثابتة الزمن (عبر SHA-256 لإخفاء الطول) ---------- */
export async function safeEqual(a, b) {
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(String(a))),
    crypto.subtle.digest('SHA-256', enc.encode(String(b)))
  ]);
  const x = new Uint8Array(ha), y = new Uint8Array(hb);
  let diff = 0; for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/* ---------- توقيع HMAC للجلسات ---------- */
async function hmacKey(secret) {
  if (!secret || secret.length < 24) throw new HttpError(500, 'SESSION_SECRET غير مضبوط أو قصير جداً', 'config');
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function signPayload(secret, payload) {
  const body = b64uEncode(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body));
  return body + '.' + b64uEncode(sig);
}
export async function verifyPayload(secret, token) {
  if (!token || typeof token !== 'string' || token.indexOf('.') < 1) return null;
  const [body, sig] = token.split('.');
  let ok = false;
  try { ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), b64uDecode(sig), enc.encode(body)); } catch { return null; }
  if (!ok) return null;
  let p; try { p = JSON.parse(dec.decode(b64uDecode(body))); } catch { return null; }
  if (!p || typeof p.exp !== 'number' || p.exp < Math.floor(Date.now() / 1000)) return null;
  return p;
}

/* ---------- الكوكيز ---------- */
export function getCookie(request, name) {
  const h = request.headers.get('cookie') || '';
  for (const part of h.split(/;\s*/)) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1));
  }
  return null;
}
export const isHttps = (request) => new URL(request.url).protocol === 'https:';
export const cookieName = (request, base) => (isHttps(request) ? '__Host-' : '') + base;
export function setCookie(request, base, value, maxAgeSec) {
  const parts = [`${cookieName(request, base)}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${maxAgeSec}`];
  if (isHttps(request)) parts.push('Secure');
  return parts.join('; ');
}
export const clearCookie = (request, base) => setCookie(request, base, '', 0);

/* ---------- الجلسة ---------- */
export const SESSION_TTL = 12 * 3600;   // 12 ساعة
export const PRE_TTL = 5 * 60;          // 5 دقائق بين خطوتي الدخول

async function getEpoch(env) {
  const r = await env.DB.prepare("SELECT value FROM settings WHERE key='session_epoch'").first();
  return r ? Number(r.value) || 0 : 0;
}
export async function bumpEpoch(env) {
  const next = (await getEpoch(env)) + 1;
  await env.DB.prepare("INSERT INTO settings(key,value) VALUES('session_epoch',?1) ON CONFLICT(key) DO UPDATE SET value=?1").bind(String(next)).run();
}
export async function createSession(env, request, email) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL;
  const token = await signPayload(env.SESSION_SECRET, { k: 'sess', e: email, exp, v: await getEpoch(env) });
  return setCookie(request, 'sid', token, SESSION_TTL);
}
export async function readSession(env, request) {
  const p = await verifyPayload(env.SESSION_SECRET, getCookie(request, cookieName(request, 'sid')));
  if (!p || p.k !== 'sess') return null;
  if (p.v !== await getEpoch(env)) return null;                 // أُلغيت الجلسات
  if (!adminEmails(env).includes(String(p.e).toLowerCase())) return null;   // أُزيل المدير من القائمة
  return { email: p.e };
}
export async function createPreAuth(env, request, email) {
  const exp = Math.floor(Date.now() / 1000) + PRE_TTL;
  return setCookie(request, 'pre', await signPayload(env.SESSION_SECRET, { k: 'pre', e: email, exp }), PRE_TTL);
}
export async function readPreAuth(env, request) {
  const p = await verifyPayload(env.SESSION_SECRET, getCookie(request, cookieName(request, 'pre')));
  return p && p.k === 'pre' ? { email: p.e } : null;
}

export const adminEmails = (env) =>
  String(env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

/* ---------- تحديد المحاولات ---------- */
const WINDOW = 15 * 60, MAX_FAILS = 5;
export async function ipHash(env, request) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'local';
  const d = await crypto.subtle.digest('SHA-256', enc.encode(ip + '|' + (env.SESSION_SECRET || '')));
  return b64uEncode(d).slice(0, 22);
}
export async function assertNotLocked(env, request) {
  const now = Math.floor(Date.now() / 1000), h = await ipHash(env, request);
  await env.DB.prepare('DELETE FROM login_attempts WHERE ts < ?').bind(now - WINDOW).run();
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE ip_hash=? AND ts>=?').bind(h, now - WINDOW).first();
  if (r.n >= MAX_FAILS) throw new HttpError(429, 'محاولات كثيرة. حاول بعد 15 دقيقة.', 'locked');
}
export async function recordFail(env, request) {
  await env.DB.prepare('INSERT INTO login_attempts(ip_hash, ts) VALUES(?,?)').bind(await ipHash(env, request), Math.floor(Date.now() / 1000)).run();
}
export async function clearFails(env, request) {
  await env.DB.prepare('DELETE FROM login_attempts WHERE ip_hash=?').bind(await ipHash(env, request)).run();
}

/* ---------- nonce لمرة واحدة لمنع إعادة استخدام رمز Google ---------- */
export async function issueNonce(env) {
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare('DELETE FROM login_nonces WHERE exp < ?').bind(now).run();
  const nonce = randomToken(18);
  await env.DB.prepare('INSERT INTO login_nonces(nonce, exp) VALUES(?,?)').bind(nonce, now + 300).run();
  return nonce;
}
async function consumeNonce(env, nonce) {
  if (!nonce) return false;
  const r = await env.DB.prepare('DELETE FROM login_nonces WHERE nonce=? AND exp >= ?').bind(nonce, Math.floor(Date.now() / 1000)).run();
  return (r.meta && r.meta.changes) > 0;
}

/* ---------- التحقق من رمز Google (RS256 + JWKS) ---------- */
const jwksCache = { keys: null, exp: 0 };
async function getJwks(env, force = false) {
  const now = Date.now();
  if (!force && jwksCache.keys && now < jwksCache.exp) return jwksCache.keys;
  const url = env.GOOGLE_JWKS_URL || 'https://www.googleapis.com/oauth2/v3/certs';
  const res = await fetch(url);
  if (!res.ok) throw new HttpError(502, 'تعذّر الاتصال بخدمة Google للتحقق', 'google');
  const j = await res.json();
  const m = /max-age=(\d+)/.exec(res.headers.get('cache-control') || '');
  jwksCache.keys = j.keys || []; jwksCache.exp = now + (m ? +m[1] : 3600) * 1000;
  return jwksCache.keys;
}

export async function verifyGoogleIdToken(env, idToken) {
  const bad = (msg = 'رمز Google غير صالح') => new HttpError(401, msg, 'bad_token');
  if (!env.GOOGLE_CLIENT_ID) throw new HttpError(500, 'GOOGLE_CLIENT_ID غير مضبوط', 'config');
  if (typeof idToken !== 'string' || idToken.split('.').length !== 3 || idToken.length > 4096) throw bad();
  const [h, p, s] = idToken.split('.');
  let header, payload;
  try { header = JSON.parse(dec.decode(b64uDecode(h))); payload = JSON.parse(dec.decode(b64uDecode(p))); } catch { throw bad(); }
  if (header.alg !== 'RS256' || !header.kid) throw bad();

  let keys = await getJwks(env);
  let jwk = keys.find(k => k.kid === header.kid);
  if (!jwk) { keys = await getJwks(env, true); jwk = keys.find(k => k.kid === header.kid); }   // تدوير المفاتيح
  if (!jwk) throw bad();

  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64uDecode(s), enc.encode(h + '.' + p));
  if (!ok) throw bad();

  const now = Math.floor(Date.now() / 1000);
  if (!['https://accounts.google.com', 'accounts.google.com'].includes(payload.iss)) throw bad();
  if (payload.aud !== env.GOOGLE_CLIENT_ID) throw bad();
  if (typeof payload.exp !== 'number' || payload.exp < now - 30) throw bad('انتهت صلاحية رمز Google. أعد المحاولة.');
  if (typeof payload.iat === 'number' && payload.iat > now + 300) throw bad();
  if (payload.email_verified !== true && payload.email_verified !== 'true') throw bad('البريد غير موثّق لدى Google');
  if (!payload.email) throw bad();
  if (!(await consumeNonce(env, payload.nonce))) throw bad('انتهت الجلسة أو استُخدم الرمز سابقاً. أعد المحاولة.');
  return { email: String(payload.email).toLowerCase(), name: payload.name || '' };
}

export async function assertKey(env, provided) {
  if (!env.ADMIN_KEY || String(env.ADMIN_KEY).length < 8) throw new HttpError(500, 'ADMIN_KEY غير مضبوط أو قصير', 'config');
  if (typeof provided !== 'string' || !provided || provided.length > 200) return false;
  return safeEqual(provided, env.ADMIN_KEY);
}
