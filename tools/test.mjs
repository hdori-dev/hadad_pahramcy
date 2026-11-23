// اختبار تكاملي: يشغّل خادم JWKS محلياً (يحاكي Google) ويجرّب الدخول بخطوتين وكل عمليات اللوحة.
// الاستخدام:  (1) npm run db:local   (2) npm run dev   (3) في نافذة أخرى: npm test
// يتطلب .dev.vars يحتوي GOOGLE_JWKS_URL=http://127.0.0.1:8799/certs
import http from 'node:http';
import { execSync } from 'node:child_process';
const resetLock = () => execSync('npx wrangler d1 execute DB --local --command "DELETE FROM login_attempts"', { stdio: 'ignore' });
import { generateKeyPairSync, createSign } from 'node:crypto';

const BASE = process.env.BASE || 'http://localhost:8788';
const CLIENT_ID = 'test-client.apps.googleusercontent.com';
const OWNER = 'owner@gmail.com', KEY = 'correct-horse-battery-staple';
const b64u = b => Buffer.from(b).toString('base64url');

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' };
const other = generateKeyPairSync('rsa', { modulusLength: 2048 });

const jwks = http.createServer((q, r) => { r.setHeader('content-type', 'application/json'); r.setHeader('cache-control', 'max-age=60'); r.end(JSON.stringify({ keys: [jwk] })); }).listen(8799);

function idToken({ email = OWNER, aud = CLIENT_ID, nonce, exp = Math.floor(Date.now() / 1000) + 600, verified = true, iss = 'https://accounts.google.com', key = privateKey, kid = 'k1' }) {
  const h = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid }));
  const p = b64u(JSON.stringify({ iss, aud, email, email_verified: verified, nonce, exp, iat: exp - 3600, name: 'Test' }));
  const s = createSign('RSA-SHA256').update(h + '.' + p).sign(key);
  return `${h}.${p}.${b64u(s)}`;
}

let cookies = {};
async function api(path, { method = 'GET', body, headers = {}, origin = BASE, raw, jar = true } = {}) {
  const h = { ...headers };
  if (origin) h.origin = origin;
  if (jar && Object.keys(cookies).length) h.cookie = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  if (body !== undefined && !raw) h['content-type'] = 'application/json';
  const res = await fetch(BASE + path, { method, headers: h, body: raw ? body : body !== undefined ? JSON.stringify(body) : undefined });
  for (const c of res.headers.getSetCookie?.() || []) { const [kv] = c.split(';'); const i = kv.indexOf('='); const n = kv.slice(0, i), v = kv.slice(i + 1); if (/Max-Age=0/i.test(c)) delete cookies[n]; else cookies[n] = v; }
  let data = null; const ct = res.headers.get('content-type') || '';
  if (ct.includes('json')) data = await res.json(); else if (res.status !== 204) data = Buffer.from(await res.arrayBuffer());
  return { status: res.status, data, headers: res.headers };
}

let pass = 0, failN = 0;
const ok = (c, m, extra) => { if (c) { pass++; console.log('  ✓', m); } else { failN++; console.log('  ✗ FAIL:', m, extra ? JSON.stringify(extra) : ''); } };
const section = t => console.log('\n' + t);

async function googleStep(opts) { const n = (await api('/api/admin/nonce')).data.nonce; return api('/api/admin/google', { method: 'POST', body: { credential: idToken({ nonce: n, ...opts }) } }); }

// صورة PNG صغيرة صالحة
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

try {
  section('1) الحماية قبل الدخول');
  ok((await api('/api/admin/products')).status === 401, 'المنتجات بلا جلسة → 401');
  ok((await api('/api/admin/me')).status === 401, 'me بلا جلسة → 401');
  ok((await api('/api/admin/upload', { method: 'POST', raw: true, body: PNG, headers: { 'content-type': 'image/png' } })).status === 401, 'الرفع بلا جلسة → 401');

  section('2) الخطوة 1: Google');
  let r = await googleStep({ email: 'stranger@gmail.com' });
  ok(r.status === 403 && r.data.code === 'not_admin', 'بريد غير مصرّح → 403 «لا تمتلك الصلاحية»', r.data);
  r = await googleStep({ aud: 'someone-else.apps.googleusercontent.com' });
  ok(r.status === 401, 'رمز لتطبيق آخر (aud) → 401');
  r = await googleStep({ exp: Math.floor(Date.now() / 1000) - 3600 });
  ok(r.status === 401, 'رمز منتهي → 401');
  r = await googleStep({ verified: false });
  ok(r.status === 401, 'بريد غير موثّق → 401');
  r = await googleStep({ key: other.privateKey });
  ok(r.status === 401, 'توقيع بمفتاح مختلف → 401');
  resetLock();
  r = await googleStep({ iss: 'https://evil.example' });
  ok(r.status === 401, 'مُصدر غير Google → 401');
  r = await api('/api/admin/google', { method: 'POST', body: { credential: idToken({ nonce: 'never-issued' }) } });
  ok(r.status === 401, 'nonce غير صادر من الخادم → 401');
  resetLock();
  const n1 = (await api('/api/admin/nonce')).data.nonce; const tok = idToken({ nonce: n1 });
  r = await api('/api/admin/google', { method: 'POST', body: { credential: tok } });
  ok(r.status === 200 && r.data.email === OWNER, 'حساب المدير الصحيح → 200', r.data);
  r = await api('/api/admin/google', { method: 'POST', body: { credential: tok } });
  ok(r.status === 401, 'إعادة استخدام الرمز نفسه (nonce) → 401');
  // Google ثم مفتاح خاطئ: لا جلسة
  ok((await api('/api/admin/products')).status === 401, 'بعد الخطوة 1 فقط لا يزال الدخول مرفوضاً');

  section('3) الخطوة 2: المفتاح السري');
  resetLock();
  cookies = {}; ok((await api('/api/admin/key', { method: 'POST', body: { key: KEY } })).status === 401, 'المفتاح بلا الخطوة 1 → 401');
  await googleStep({});
  r = await api('/api/admin/key', { method: 'POST', body: { key: 'wrong-key' } });
  ok(r.status === 401 && r.data.code === 'bad_key', 'مفتاح خاطئ → 401');
  r = await api('/api/admin/key', { method: 'POST', body: { key: KEY } });
  ok(r.status === 200, 'المفتاح الصحيح → 200', r.data);
  ok(!!cookies.sid, 'تم إصدار كوكي الجلسة');
  r = await api('/api/admin/me'); ok(r.status === 200 && r.data.email === OWNER, 'me بعد الدخول');

  section('4) حماية CSRF');
  r = await api('/api/admin/categories', { method: 'POST', body: { name_ar: 'x' }, origin: 'https://evil.example' });
  ok(r.status === 403, 'مصدر غريب → 403');
  r = await api('/api/admin/categories', { method: 'POST', body: { name_ar: 'x' }, origin: null });
  ok(r.status === 403, 'بلا Origin وبلا Sec-Fetch-Site → 403');

  section('5) الأقسام الرئيسية والفرعية');
  r = await api('/api/admin/categories', { method: 'POST', body: { name_ar: 'أدوية', name_en: 'Medicines' } }); const main = r.data.id;
  ok(r.status === 201 && main, 'إنشاء قسم رئيسي');
  r = await api('/api/admin/categories', { method: 'POST', body: { name_ar: 'مسكنات', parent_id: main } }); const sub = r.data.id;
  ok(r.status === 201, 'إنشاء قسم فرعي');
  r = await api('/api/admin/categories', { method: 'POST', body: { name_ar: 'ثالث', parent_id: sub } });
  ok(r.status === 400, 'رفض المستوى الثالث');
  r = await api('/api/admin/categories', { method: 'POST', body: { name_ar: '' } });
  ok(r.status === 400, 'رفض اسم فارغ');
  const sub2 = (await api('/api/admin/categories', { method: 'POST', body: { name_ar: 'فيتامينات', parent_id: main } })).data.id;
  r = await api('/api/admin/categories/reorder', { method: 'POST', body: { ids: [sub2, sub] } }); ok(r.status === 200, 'إعادة الترتيب');
  r = await api('/api/admin/categories'); const order = r.data.categories.filter(c => c.parent_id === main).map(c => c.id);
  ok(order[0] === sub2 && order[1] === sub, 'الترتيب الجديد محفوظ', order);
  r = await api('/api/admin/categories/' + sub, { method: 'PUT', body: { name_ar: 'مسكّنات الألم' } }); ok(r.status === 200, 'تعديل قسم');
  r = await api('/api/admin/categories/' + main, { method: 'PUT', body: { parent_id: sub } }); ok(r.status === 400, 'رفض جعل قسم له فروع فرعاً');

  section('6) رفع الصور');
  r = await api('/api/admin/upload', { method: 'POST', raw: true, body: PNG, headers: { 'content-type': 'image/png' } });
  ok(r.status === 201 && r.data.id, 'رفع PNG', r.data); const img1 = r.data.id;
  r = await api('/api/admin/upload', { method: 'POST', raw: true, body: Buffer.from('<?php echo 1;'), headers: { 'content-type': 'image/png' } });
  ok(r.status === 415, 'رفض ملف مزيّف بامتداد صورة');
  r = await api('/api/admin/upload', { method: 'POST', raw: true, body: Buffer.alloc(1_600_000, 1), headers: { 'content-type': 'image/png' } });
  ok(r.status === 413, 'رفض صورة أكبر من الحد');
  r = await api('/api/img/' + img1, { jar: false });
  ok(r.status === 200 && r.headers.get('content-type') === 'image/png' && r.data.equals(PNG), 'عرض الصورة علناً بنفس البايتات');
  ok(/immutable/.test(r.headers.get('cache-control')), 'ترويسة تخزين مؤقت طويلة');
  const img2 = (await api('/api/admin/upload', { method: 'POST', raw: true, body: PNG, headers: { 'content-type': 'image/png' } })).data.id;

  section('7) المنتجات');
  r = await api('/api/admin/products', { method: 'POST', body: { name_ar: 'باراسيتامول 500', name_en: 'Paracetamol', price: 1500, old_price: 2000, category_id: sub, featured: true, images: [img1, img2], desc_ar: 'مسكن' } });
  ok(r.status === 201, 'إنشاء منتج بصورتين وقسم فرعي', r.data); const pid = r.data.id;
  r = await api('/api/admin/products', { method: 'POST', body: { name_ar: 'منتج بلا قسم', price: 500, category_id: 99999 } }); ok(r.status === 400, 'رفض قسم غير موجود');
  r = await api('/api/admin/products', { method: 'POST', body: { name_ar: 'سعر سالب', price: -5 } }); ok(r.status === 400, 'رفض سعر سالب');
  r = await api('/api/admin/products', { method: 'POST', body: { name_ar: 'صورة وهمية', price: 5, images: ['nope1234abcd'] } }); ok(r.status === 400, 'رفض صورة غير موجودة');
  r = await api('/api/admin/products?q=باراس'); ok(r.data.products.length === 1 && r.data.products[0].images.length === 2, 'بحث + صور المنتج', r.data);
  r = await api('/api/admin/products?category=' + main); ok(r.data.products.length === 1, 'التصفية بالقسم الرئيسي تشمل الفرعي');
  r = await api('/api/admin/products/' + pid, { method: 'PATCH', body: { featured: false } }); ok(r.status === 200, 'تبديل «مميز»');
  r = await api('/api/admin/products?featured=1'); ok(r.data.products.length === 0, 'التصفية بالمميز');
  r = await api('/api/admin/products/' + pid, { method: 'PUT', body: { name_ar: 'باراسيتامول 500 ملغ', price: 1750, category_id: sub, featured: true, images: [img1] } });
  ok(r.status === 200, 'تعديل المنتج وإزالة صورة');
  ok((await api('/api/img/' + img2, { jar: false })).status === 404, 'الصورة المُزالة حُذفت (تنظيف)');
  ok((await api('/api/img/' + img1, { jar: false })).status === 200, 'الصورة المتبقية باقية');
  r = await api('/api/admin/categories/' + sub, { method: 'DELETE' }); ok(r.status === 409, 'منع حذف قسم فيه منتجات');
  r = await api('/api/admin/categories/' + main, { method: 'DELETE' }); ok(r.status === 409, 'منع حذف قسم فيه فروع');

  section('8) الإعدادات والإحصاءات');
  r = await api('/api/admin/settings', { method: 'PUT', body: { phone: '+9647812200554', whatsapp: '9647812200554', hours_open: '09:00', hours_close: '23:00', notice: 'مغلق يوم الجمعة', notice_active: true, review_url: 'https://g.page/r/abc' } });
  ok(r.status === 200 && r.data.settings.notice === 'مغلق يوم الجمعة', 'حفظ الإعدادات');
  r = await api('/api/admin/settings', { method: 'PUT', body: { hours_open: '25:99' } }); ok(r.status === 400, 'رفض وقت غير صالح');
  r = await api('/api/admin/settings', { method: 'PUT', body: { review_url: 'javascript:alert(1)' } }); ok(r.status === 400, 'رفض رابط تقييم خطير');
  for (const t of ['view', 'view', 'call', 'whatsapp', 'order']) await api('/api/public/track', { method: 'POST', body: { type: t, src: 'ig' }, jar: false });
  await api('/api/public/track', { method: 'POST', body: { type: 'product', ref: String(pid) }, jar: false });
  await api('/api/public/track', { method: 'POST', body: { type: 'cart_add', ref: String(pid) }, jar: false });
  r = await api('/api/public/track', { method: 'POST', body: { type: 'hack' }, jar: false }); ok(r.status === 204, 'نوع حدث مجهول يُتجاهل');
  r = await api('/api/public/track', { method: 'POST', body: { type: 'view' }, origin: 'https://evil.example', jar: false });
  r = await api('/api/admin/stats?days=7');
  ok(r.data.totals.view === 2 && r.data.totals.call === 1 && r.data.totals.order === 1, 'إجماليات الإحصاءات', r.data.totals);
  ok(r.data.sources[0].s === 'ig', 'مصدر الزيارات (ig)', r.data.sources);
  ok(r.data.topProducts[0] && r.data.topProducts[0].name.includes('باراسيتامول'), 'أكثر المنتجات اهتماماً', r.data.topProducts);
  ok(r.data.daily.length === 7, 'سلسلة 7 أيام');

  section('9) الواجهة العامة');
  r = await api('/api/public/catalog', { jar: false });
  ok(r.status === 200 && r.data.products.length === 1 && r.data.categories.length === 3, 'الكتالوج العام', { p: r.data.products?.length, c: r.data.categories?.length });
  ok(r.data.settings.phone === '+9647812200554' && r.data.settings.notice_active === '1', 'الإعدادات العامة');
  ok(!('session_epoch' in r.data.settings), 'لا تُسرَّب إعدادات داخلية');
  ok(r.data.products[0].images.length === 1 && r.data.products[0].featured === 1, 'صور المنتج وعلامة مميز');

  section('10) تسجيل الخروج وقفل المحاولات');
  r = await api('/api/admin/logout-all', { method: 'POST' }); ok(r.status === 200, 'خروج من كل الأجهزة');
  ok((await api('/api/admin/me')).status === 401, 'الجلسة لم تعد صالحة');
  // محاولات خاطئة متتالية
  resetLock(); cookies = {}; await googleStep({});
  let locked = false;
  for (let i = 0; i < 7; i++) { const x = await api('/api/admin/key', { method: 'POST', body: { key: 'bad' + i } }); if (x.status === 429) { locked = true; break; } }
  ok(locked, 'قفل بعد محاولات المفتاح الخاطئة المتكررة (429)');
  r = await api('/api/admin/key', { method: 'POST', body: { key: KEY } });
  ok(r.status === 429, 'حتى المفتاح الصحيح مرفوض أثناء القفل');
} catch (e) { failN++; console.log('\nاستثناء في الاختبار:', e); }

console.log(`\nالنتيجة: ${pass} نجح، ${failN} فشل`);
jwks.close(); process.exit(failN ? 1 : 0);
