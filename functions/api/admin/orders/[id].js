import { json, handle, methodNotAllowed, readJson, HttpError } from '../../../../lib/http.js';

const STATUSES = ['new', 'preparing', 'done', 'cancelled'];

export const onRequest = handle(async ({ request, env, params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'معرّف غير صالح');
  if (request.method === 'PATCH') {
    const b = await readJson(request, 1024);
    if (!STATUSES.includes(b.status)) throw new HttpError(400, 'حالة غير صالحة');
    const r = await env.DB.prepare('UPDATE orders SET status=? WHERE id=?').bind(b.status, id).run();
    if (!r.meta.changes) throw new HttpError(404, 'الطلب غير موجود');
    return json({ ok: true });
  }
  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM order_items WHERE order_id=?').bind(id).run();
    await env.DB.prepare('DELETE FROM orders WHERE id=?').bind(id).run();
    return json({ ok: true });
  }
  return methodNotAllowed();
});
