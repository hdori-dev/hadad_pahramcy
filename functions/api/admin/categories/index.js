import { json, handle, readJson, HttpError, str, methodNotAllowed } from '../../../../lib/http.js';

export const onRequest = handle(async ({ request, env }) => {
  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT c.id, c.parent_id, c.name_ar, c.name_en, c.sort, c.active,
              (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS products
       FROM categories c ORDER BY (c.parent_id IS NOT NULL), c.sort, c.id`).all();
    return json({ categories: results });
  }
  if (request.method === 'POST') {
    const b = await readJson(request);
    const name_ar = str(b.name_ar, { max: 80, required: true, name: 'اسم القسم' });
    const name_en = str(b.name_en, { max: 80 });
    let parent = b.parent_id === null || b.parent_id === undefined || b.parent_id === '' ? null : Number(b.parent_id);
    if (parent !== null) {
      const p = await env.DB.prepare('SELECT id, parent_id FROM categories WHERE id=?').bind(parent).first();
      if (!p) throw new HttpError(400, 'القسم الرئيسي غير موجود');
      if (p.parent_id !== null) throw new HttpError(400, 'يُسمح بمستويين فقط: رئيسي وفرعي');
    }
    const m = await env.DB.prepare('SELECT COALESCE(MAX(sort), 0) + 1 AS s FROM categories WHERE parent_id IS ?').bind(parent).first();
    const r = await env.DB.prepare('INSERT INTO categories(parent_id, name_ar, name_en, sort, active) VALUES(?,?,?,?,?)')
      .bind(parent, name_ar, name_en, m.s, b.active === false || b.active === 0 ? 0 : 1).run();
    return json({ id: r.meta.last_row_id }, 201);
  }
  return methodNotAllowed();
});
