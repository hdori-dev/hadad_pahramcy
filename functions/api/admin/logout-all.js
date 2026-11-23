// يُلغي كل الجلسات على كل الأجهزة (مثلاً عند فقدان جهاز)
import { json, handle } from '../../../lib/http.js';
import { bumpEpoch, clearCookie } from '../../../lib/auth.js';
export const onRequestPost = handle(async ({ request, env }) => {
  await bumpEpoch(env);
  const res = json({ ok: true });
  res.headers.append('set-cookie', clearCookie(request, 'sid'));
  return res;
});
