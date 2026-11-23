// بيانات تجريبية للتجربة المحلية فقط:  node tools/seed.mjs   (بعد تشغيل npm run dev)
import http from 'node:http';
import { generateKeyPairSync, createSign } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:8788', CID = 'test-client.apps.googleusercontent.com', KEY = 'correct-horse-battery-staple';
const b64u = b => Buffer.from(b).toString('base64url');
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256' };
const srv = http.createServer((q, r) => { r.setHeader('content-type', 'application/json'); r.end(JSON.stringify({ keys: [jwk] })); }).listen(8799);
let ck = {};
async function api(p, { method = 'GET', body, raw, type } = {}) {
  const h = { origin: BASE, cookie: Object.entries(ck).map(([k, v]) => k + '=' + v).join('; ') };
  if (raw) h['content-type'] = type; else if (body) h['content-type'] = 'application/json';
  const r = await fetch(BASE + p, { method, headers: h, body: raw || (body ? JSON.stringify(body) : undefined) });
  for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); if (/Max-Age=0/i.test(c)) delete ck[kv.slice(0, i)]; else ck[kv.slice(0, i)] = kv.slice(i + 1); }
  const t = await r.text(); try { return JSON.parse(t); } catch { return t; }
}
const n = (await api('/api/admin/nonce')).nonce, exp = Math.floor(Date.now() / 1000) + 600;
const hh = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1' })), pp = b64u(JSON.stringify({ iss: 'https://accounts.google.com', aud: CID, email: 'owner@gmail.com', email_verified: true, nonce: n, exp, iat: exp - 3600 }));
const tok = `${hh}.${pp}.${b64u(createSign('RSA-SHA256').update(hh + '.' + pp).sign(privateKey))}`;
await api('/api/admin/google', { method: 'POST', body: { credential: tok } });
await api('/api/admin/key', { method: 'POST', body: { key: KEY } });
writeFileSync('/tmp/cookies.json', JSON.stringify(ck));
const img = []; for (let i = 0; i < 6; i++) img.push((await api('/api/admin/upload', { method: 'POST', raw: readFileSync(`/tmp/seed/p${i}.png`), type: 'image/png' })).id);
const cat = async (name_ar, parent_id) => (await api('/api/admin/categories', { method: 'POST', body: { name_ar, parent_id } })).id;
const med = await cat('أدوية'), pain = await cat('مسكنات', med), anti = await cat('مضادات حيوية', med), vit = await cat('فيتامينات ومكملات', med);
const cos = await cat('مستحضرات تجميل'), skin = await cat('عناية بالبشرة', cos), hair = await cat('عناية بالشعر', cos), dev = await cat('أجهزة طبية');
const P = [
  ['باراسيتامول 500 ملغ', 1500, null, pain, 1, 1, [0], 'مسكن وخافض للحرارة. يُستعمل حسب إرشادات الطبيب أو الصيدلي.'],
  ['إيبوبروفين 400 ملغ', 2250, 3000, pain, 0, 1, [1], 'مضاد التهاب ومسكن للألم.'],
  ['أموكسيسيلين 500 ملغ', 4000, null, anti, 0, 1, [2], ''],
  ['فيتامين C فوار 1000 ملغ', 6500, 8000, vit, 1, 1, [3, 0], 'يدعم المناعة. 20 قرصاً فواراً.'],
  ['أوميغا 3 كبسولات', 14000, null, vit, 1, 1, [4], ''],
  ['كريم مرطب للبشرة الجافة', 9500, null, skin, 0, 1, [5], 'ترطيب عميق يدوم 24 ساعة.'],
  ['شامبو ضد القشرة', 7000, 8500, hair, 0, 0, [0], ''],
  ['جهاز قياس ضغط الدم', 45000, null, dev, 1, 1, [1, 2], 'جهاز رقمي للذراع بشاشة كبيرة وذاكرة 90 قراءة.'],
  ['جهاز قياس السكر', 28000, 32000, dev, 0, 1, [2], '']
];
for (const [name_ar, price, old_price, category_id, featured, available, im, desc_ar] of P) await api('/api/admin/products', { method: 'POST', body: { name_ar, price, old_price, category_id, featured: !!featured, available: !!available, desc_ar, images: im.map(i => img[i]) } });
await api('/api/admin/settings', { method: 'PUT', body: { phone: '+9647812200554', whatsapp: '9647812200554', hours_open: '08:00', hours_close: '23:30', notice: 'مغلق يوم الجمعة بمناسبة العيد', notice_active: true, review_url: 'https://g.page/r/example/review' } });
for (let i = 0; i < 120; i++) { const t = ['view', 'view', 'view', 'view', 'call', 'whatsapp', 'navigate', 'product', 'cart_add', 'order'][i % 10]; await api('/api/public/track', { method: 'POST', body: { type: t, src: ['ig', 'qr', '', 'ig'][i % 4], ref: t === 'product' || t === 'cart_add' ? String(1 + i % 4) : '' } }); }
console.log('seeded'); srv.close(); process.exit(0);
