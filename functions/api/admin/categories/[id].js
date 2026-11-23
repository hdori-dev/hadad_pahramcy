import { json, handle, readJson, HttpError, str, methodNotAllowed } from '../../../../lib/http.js';

export const onRequest = handle(async ({ request, env, params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw new HttpError(400, 'معرّف غير صالح');
  const cat = await env.DB.prepare('SELECT * FROM categories WHERE id=?').bind(id).first();
  if (!cat) throw new HttpError(404, 'القسم غير موجود');

  if (request.method === 'PUT') {
    const b = await readJson(request);
    const name_ar = str(b.name_ar ?? cat.name_ar, { max: 80, required: true, name: 'اسم القسم' });
    const name_en = str(b.name_en ?? cat.name_en, { max: 80 });
    const active = b.active === undefined ? cat.active : (b.active ? 1 : 0);
    let parent = cat.parent_id;
    if (b.parent_id !== undefined) {
      parent = b.parent_id === null || b.parent_id === '' ? null : Number(b.parent_id);
      if (parent !== null) {
        if (parent === id) throw new HttpError(400, 'لا يمكن جعل القسم فرعاً لنفسه');
        const p = await env.DB.prepare('SELECT parent_id FROM categories WHERE id=?').bind(parent).first();
        if (!p) throw new HttpError(400, 'القسم الرئيسي غير موجود');
        if (p.parent_id !== null) throw new HttpError(400, 'يُسمح بمستويين فقط: رئيسي وفرعي');
        const kids = await env.DB.prepare('SELECT COUNT(*) AS n FROM categories WHERE parent_id=?').bind(id).first();
        if (kids.n > 0) throw new HttpError(400, 'هذا القسم يحتوي أقساماً فرعية فلا يمكن تحويله إلى فرعي');
      }
    }
    await env.DB.prepare('UPDATE categories SET name_ar=?, name_en=?, active=?, parent_id=? WHERE id=?').bind(name_ar, name_en, active, parent, id).run();
    return json({ ok: true });
  }

  if (request.method === 'DELETE') {
    const kids = await env.DB.prepare('SELECT COUNT(*) AS n FROM categories WHERE parent_id=?').bind(id).first();
    if (kids.n > 0) throw new HttpError(409, 'احذف الأقسام الفرعية أولاً', 'has_children');
    const prods = await env.DB.prepare('SELECT COUNT(*) AS n FROM products WHERE category_id=?').bind(id).first();
    if (prods.n > 0) throw new HttpError(409, `يوجد ${prods.n} منتج في هذا القسم. انقلها إلى قسم آخر أولاً.`, 'has_products');
    await env.DB.prepare('DELETE FROM categories WHERE id=?').bind(id).run();
    return json({ ok: true });
  }
  return methodNotAllowed();
});
