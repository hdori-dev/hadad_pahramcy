import { json, handle, methodNotAllowed, readJson, str, HttpError } from '../../../lib/http.js';

// ينشئ طلباً: الأسعار والأسماء تُقرأ من قاعدة البيانات (لا يُوثَق بما يرسله المتصفح)
export const onRequest = handle(async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed();
  const url = new URL(request.url), origin = request.headers.get('origin');
  if (origin && origin !== url.origin) throw new HttpError(403, 'مصدر غير موثوق');
  const b = await readJson(request, 16 * 1024);

  const name = str(b.name, { max: 80, required: true, name: 'الاسم' });
  const phone = str(b.phone, { max: 20, required: true, name: 'رقم الهاتف' }).replace(/[\s-]/g, '');
  if (!/^\+?[0-9]{7,16}$/.test(phone)) throw new HttpError(400, 'رقم الهاتف غير صالح');
  const address = str(b.address, { max: 200, required: true, name: 'العنوان' });
  const method = b.method === 'pickup' ? 'pickup' : 'delivery';
  const note = str(b.note, { max: 300 });
  const channel = ['whatsapp', 'instagram', 'pdf'].includes(b.channel) ? b.channel : '';

  if (!Array.isArray(b.items) || !b.items.length) throw new HttpError(400, 'السلة فارغة');
  if (b.items.length > 40) throw new HttpError(400, 'عدد المنتجات كبير');
  const want = new Map();
  for (const it of b.items) {
    const id = Number(it && it.id), qty = Number(it && it.qty);
    if (!Number.isInteger(id) || id < 1 || !Number.isInteger(qty) || qty < 1 || qty > 99) throw new HttpError(400, 'بيانات المنتجات غير صالحة');
    want.set(id, Math.min(99, (want.get(id) || 0) + qty));
  }
  const ids = [...want.keys()];
  const { results } = await env.DB.prepare(
    `SELECT id, name_ar, name_en, price, available FROM products WHERE id IN (${ids.map(() => '?').join(',')})`
  ).bind(...ids).all();
  const byId = new Map(results.map(r => [r.id, r]));
  const lines = [];
  for (const [id, qty] of want) {
    const p = byId.get(id);
    if (!p || !p.available) throw new HttpError(409, 'أحد المنتجات لم يعد متوفراً. حدّث الصفحة وأعد المحاولة.', 'unavailable');
    lines.push({ id, name: p.name_ar, name_en: p.name_en, qty, price: p.price });
  }
  const total = lines.reduce((n, l) => n + l.price * l.qty, 0);

  // حدّ بسيط ضد الإغراق: 5 طلبات/10 دقائق لكل رقم هاتف
  const since = Math.floor(Date.now() / 1000) - 600;
  const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM orders WHERE phone=? AND created_at>=?').bind(phone, since).first();
  if (recent && recent.n >= 5) throw new HttpError(429, 'طلبات كثيرة خلال وقت قصير. حاول بعد قليل.');

  const ins = await env.DB.prepare('INSERT INTO orders(customer_name, phone, address, method, note, channel, total) VALUES(?,?,?,?,?,?,?)')
    .bind(name, phone, address, method, note, channel, total).run();
  const id = ins.meta.last_row_id;
  await env.DB.batch(lines.map(l => env.DB.prepare('INSERT INTO order_items(order_id, product_id, name, qty, price) VALUES(?,?,?,?,?)').bind(id, l.id, l.name, l.qty, l.price)));
  return json({ id, code: String(1000 + id), created_at: Math.floor(Date.now() / 1000), total, items: lines });
});
