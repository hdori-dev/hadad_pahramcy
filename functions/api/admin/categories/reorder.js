// يعيد ترتيب مجموعة أقسام تشترك في الأب نفسه: { ids: [3,1,2] }
import { json, handle, readJson, HttpError, methodNotAllowed } from '../../../../lib/http.js';

export const onRequest = handle(async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed();
  const { ids } = await readJson(request);
  if (!Array.isArray(ids) || !ids.length || ids.length > 200 || !ids.every(Number.isInteger)) throw new HttpError(400, 'قائمة غير صالحة');
  await env.DB.batch(ids.map((id, i) => env.DB.prepare('UPDATE categories SET sort=? WHERE id=?').bind(i + 1, id)));
  return json({ ok: true });
});
