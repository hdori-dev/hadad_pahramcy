// الخطوة 2: المفتاح السري المحفوظ في أسرار Cloudflare
import { json, handle, readJson, HttpError, methodNotAllowed } from '../../../lib/http.js';
import { readPreAuth, assertKey, assertNotLocked, recordFail, clearFails, createSession, clearCookie } from '../../../lib/auth.js';

export const onRequest = handle(async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed();
  const pre = await readPreAuth(env, request);
  if (!pre) throw new HttpError(401, 'انتهت الخطوة الأولى. سجّل الدخول عبر Google من جديد.', 'pre_missing');
  await assertNotLocked(env, request);
  const { key } = await readJson(request, 2048);
  if (!(await assertKey(env, key))) {
    await recordFail(env, request);
    throw new HttpError(401, 'مفتاح الدخول غير صحيح.', 'bad_key');
  }
  await clearFails(env, request);
  const res = json({ ok: true, email: pre.email });
  res.headers.append('set-cookie', await createSession(env, request, pre.email));
  res.headers.append('set-cookie', clearCookie(request, 'pre'));
  return res;
});
