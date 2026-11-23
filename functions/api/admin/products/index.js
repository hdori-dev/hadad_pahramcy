import { json, handle, readJson, methodNotAllowed } from '../../../../lib/http.js';
import { cleanProduct, attachImages } from '../../../../lib/products.js';

export const onRequest = handle(async ({ request, env }) => {
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const where = [], args = [];
    const q = (url.searchParams.get('q') || '').trim().slice(0, 60);
    if (q) { where.push('(p.name_ar LIKE ? OR p.name_en LIKE ?)'); args.push(`%${q}%`, `%${q}%`); }
    const cat = Number(url.searchParams.get('category'));
    if (Number.isInteger(cat) && cat > 0) { where.push('(p.category_id = ? OR p.category_id IN (SELECT id FROM categories WHERE parent_id = ?))'); args.push(cat, cat); }
    if (url.searchParams.get('featured') === '1') where.push('p.featured = 1');
    const sql = `SELECT p.* FROM products p ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY p.featured DESC, p.id DESC LIMIT 500`;
    const { results: products } = await env.DB.prepare(sql).bind(...args).all();
    if (products.length) {
      const { results: imgs } = await env.DB.prepare(
        `SELECT product_id, image_id FROM product_images WHERE product_id IN (SELECT id FROM (${sql.replace('SELECT p.*', 'SELECT p.id')})) ORDER BY position`).bind(...args).all();
      const map = {};
      for (const r of imgs) (map[r.product_id] ||= []).push(r.image_id);
      for (const p of products) p.images = map[p.id] || [];
    }
    return json({ products });
  }
  if (request.method === 'POST') {
    const c = await cleanProduct(env, await readJson(request));
    const r = await env.DB.prepare(
      'INSERT INTO products(category_id, name_ar, name_en, desc_ar, desc_en, price, old_price, featured, available) VALUES(?,?,?,?,?,?,?,?,?)')
      .bind(c.category_id, c.name_ar, c.name_en, c.desc_ar, c.desc_en, c.price, c.old_price, c.featured, c.available).run();
    const id = r.meta.last_row_id;
    try { await attachImages(env, id, c.images); }
    catch (e) { await env.DB.prepare('DELETE FROM products WHERE id=?').bind(id).run(); throw e; }
    return json({ id }, 201);
  }
  return methodNotAllowed();
});
