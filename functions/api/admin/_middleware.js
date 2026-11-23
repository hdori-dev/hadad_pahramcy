import { readSession } from '../../../lib/auth.js';
import { fail } from '../../../lib/http.js';

// مسارات الدخول فقط تعمل قبل تسجيل الدخول
const OPEN = new Set(['/api/admin/nonce', '/api/admin/google', '/api/admin/key']);

export async function onRequest(ctx) {
  const { request, env, next, data } = ctx;
  const url = new URL(request.url);
  try {
    // حماية CSRF: الطلبات المعدِّلة يجب أن تأتي من الموقع نفسه
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const origin = request.headers.get('origin');
      const site = request.headers.get('sec-fetch-site');
      const ok = origin ? origin === url.origin : (site === 'same-origin' || site === 'none');
      if (!ok) return fail(403, 'طلب مرفوض (مصدر غير موثوق)', 'csrf');
    }
    if (OPEN.has(url.pathname)) return next();
    const s = await readSession(env, request);
    if (!s) return fail(401, 'يلزم تسجيل الدخول', 'unauthenticated');
    data.admin = s;
    return next();
  } catch (e) {
    console.error('middleware', e && e.stack || e);
    return fail(500, 'خطأ داخلي في الخادم', 'internal');
  }
}
