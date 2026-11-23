// أدوات HTTP مشتركة
export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }
  });
}
export const fail = (status, message, code = 'error') => json({ error: message, code }, status);

export async function readJson(request, maxBytes = 64 * 1024) {
  const len = +request.headers.get('content-length') || 0;
  if (len > maxBytes) throw new HttpError(413, 'حجم الطلب كبير');
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, 'حجم الطلب كبير');
  try { return JSON.parse(text || '{}'); } catch { throw new HttpError(400, 'صيغة الطلب غير صحيحة'); }
}

export class HttpError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code || 'error'; }
}

// يلتقط أخطاء المعالجات ويحوّلها إلى ردود JSON
export function handle(fn) {
  return async (ctx) => {
    try { return await fn(ctx); }
    catch (e) {
      if (e instanceof HttpError) return fail(e.status, e.message, e.code);
      console.error('Unhandled', e && e.stack || e);
      return fail(500, 'خطأ داخلي في الخادم', 'internal');
    }
  };
}

export const methodNotAllowed = () => fail(405, 'الطريقة غير مسموحة', 'method');

export function intOrNull(v, { min = 0, max = 2_000_000_000 } = {}) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < min || n > max) throw new HttpError(400, 'قيمة رقمية غير صالحة');
  return n;
}
export function str(v, { max = 200, required = false, name = 'الحقل' } = {}) {
  const s = (v === undefined || v === null ? '' : String(v)).trim();
  if (required && !s) throw new HttpError(400, name + ' مطلوب');
  if (s.length > max) throw new HttpError(400, name + ' أطول من المسموح');
  return s;
}
