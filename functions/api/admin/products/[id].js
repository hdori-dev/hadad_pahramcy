import { json, handle, readJson, HttpError, methodNotAllowed } from '../../../../lib/http.js';
import { cleanProduct } from '../../../../lib/products.js';
import { gcOrphans } from '../../../../lib/store.js';

export const onRequest = handle(async ({ request, env, params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw new HttpError(400, 'معرّف غير صالح');
  const cur = await env.DB.prepare('SELECT * FROM products WHERE id=?').bind(id).first();
  if (!cur) throw new HttpError(404, 'المنتج غير موجود');
  const { results: oldImgs } = await env.DB.prepare('SELECT image_id FROM product_images WHERE product_id=?').bind(id).all();
  const oldIds = oldImgs.map(r => r.image_id);

  if (request.method === 'PUT') {
    const c = await cleanProduct(env, await readJson(request));
    await env.DB.batch([
      env.DB.prepare(`UPDATE products SET category_id=?, name_ar=?, name_en=?, desc_ar=?, desc_en=?, price=?, old_price=?, featured=?, available=?, updated_at=unixepoch() WHERE id=?`)
        .bind(c.category_id, c.name_ar, c.name_en, c.desc_ar, c.desc_en, c.price, c.old_price, c.featured, c.available, id),
      env.DB.prepare('DELETE FROM product_images WHERE product_id=?').bind(id),
      ...c.images.map((img, i) => env.DB.prepare('INSERT INTO product_images(product_id, image_id, position) VALUES(?,?,?)').bind(id, img, i))
    ]);
    await gcOrphans(env, oldIds.filter(x => !c.images.includes(x)));
    return json({ ok: true });
  }

  if (request.method === 'PATCH') {         // تبديل سريع لـ «مميز» أو «متوفر»
    const b = await readJson(request);
    const featured = b.featured === undefined ? cur.featured : (b.featured ? 1 : 0);
    const available = b.available === undefined ? cur.available : (b.available ? 1 : 0);
    await env.DB.prepare('UPDATE products SET featured=?, available=?, updated_at=unixepoch() WHERE id=?').bind(featured, available, id).run();
    return json({ ok: true });
  }

  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM products WHERE id=?').bind(id).run();
    await gcOrphans(env, oldIds);
    return json({ ok: true });
  }
  return methodNotAllowed();
});
