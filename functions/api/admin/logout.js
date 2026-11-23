import { json, handle } from '../../../lib/http.js';
import { clearCookie } from '../../../lib/auth.js';
export const onRequestPost = handle(async ({ request }) => {
  const res = json({ ok: true });
  res.headers.append('set-cookie', clearCookie(request, 'sid'));
  return res;
});
