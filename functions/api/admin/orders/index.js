import { json, handle, methodNotAllowed } from '../../../../lib/http.js';

export const onRequest = handle(async ({ request, env }) => {
  if (request.method !== 'GET') return methodNotAllowed();
  const [orders, items] = await Promise.all([
    env.DB.prepare('SELECT id, created_at, customer_name, phone, address, method, note, channel, total, status FROM orders ORDER BY id DESC LIMIT 200').all(),
    env.DB.prepare('SELECT order_id, product_id, name, qty, price FROM order_items WHERE order_id IN (SELECT id FROM orders ORDER BY id DESC LIMIT 200)').all()
  ]);
  const map = {}; for (const r of items.results) (map[r.order_id] ||= []).push(r);
  return json({ orders: orders.results.map(o => ({ ...o, code: String(1000 + o.id), items: map[o.id] || [] })) });
});
