// الخطوة 1: التحقق من حساب Google وأنه ضمن قائمة المديرين
import { json, handle, readJson, HttpError, methodNotAllowed } from '../../../lib/http.js';
import { verifyGoogleIdToken, adminEmails, assertNotLocked, recordFail, createPreAuth } from '../../../lib/auth.js';

export const onRequest = handle(async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed();
  await assertNotLocked(env, request);
  const { credential } = await readJson(request, 8192);
  let user;
  try { user = await verifyGoogleIdToken(env, credential); }
  catch (e) { if (e instanceof HttpError && e.code === 'bad_token') await recordFail(env, request); throw e; }

  if (!adminEmails(env).includes(user.email)) {
    await recordFail(env, request);
    throw new HttpError(403, 'لا تمتلك الصلاحية للوصول إلى لوحة التحكم.', 'not_admin');
  }
  const res = json({ ok: true, email: user.email, name: user.name });
  res.headers.append('set-cookie', await createPreAuth(env, request, user.email));
  return res;
});
