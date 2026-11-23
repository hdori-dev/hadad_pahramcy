import { json, handle, HttpError, methodNotAllowed } from '../../../lib/http.js';
import { randomToken } from '../../../lib/auth.js';
import { putImage, sniffMime, gcOrphans, MAX_IMAGE_BYTES } from '../../../lib/store.js';

export const onRequest = handle(async (ctx) => {
  const { request, env } = ctx;
  if (request.method !== 'POST') return methodNotAllowed();
  const len = +request.headers.get('content-length') || 0;
  if (len > MAX_IMAGE_BYTES) throw new HttpError(413, 'الصورة كبيرة. الحد 1.5 ميغابايت (تُصغَّر تلقائياً من لوحة التحكم).');
  const buf = await request.arrayBuffer();
  if (!buf.byteLength) throw new HttpError(400, 'لا توجد صورة');
  if (buf.byteLength > MAX_IMAGE_BYTES) throw new HttpError(413, 'الصورة كبيرة. الحد 1.5 ميغابايت.');
  const mime = sniffMime(new Uint8Array(buf));
  if (!mime) throw new HttpError(415, 'نوع الملف غير مدعوم. المسموح: JPG وPNG وWebP.');
  const id = randomToken(15).replace(/[-_]/g, 'x');
  await putImage(env, id, mime, buf);
  ctx.waitUntil(gcOrphans(env));        // تنظيف صور مرفوعة قديمة لم تُحفظ
  return json({ id, url: '/api/img/' + id }, 201);
});
