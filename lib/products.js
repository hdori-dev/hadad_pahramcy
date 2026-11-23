import { HttpError, str, intOrNull } from './http.js';

export async function cleanProduct(env, b) {
  const name_ar = str(b.name_ar, { max: 140, required: true, name: 'اسم المنتج' });
  const name_en = str(b.name_en, { max: 140 });
  const desc_ar = str(b.desc_ar, { max: 1500 });
  const desc_en = str(b.desc_en, { max: 1500 });
  const price = intOrNull(b.price, { max: 1_000_000_000 }) ?? 0;
  let old_price = intOrNull(b.old_price, { max: 1_000_000_000 });
  if (old_price !== null && old_price <= price) old_price = null;       // الخصم يحتاج سعراً أعلى قبله
  let category_id = b.category_id === '' || b.category_id === undefined ? null : intOrNull(b.category_id, { min: 1 });
  if (category_id !== null) {
    const c = await env.DB.prepare('SELECT id FROM categories WHERE id=?').bind(category_id).first();
    if (!c) throw new HttpError(400, 'القسم غير موجود');
  }
  let images = Array.isArray(b.images) ? b.images.map(String) : [];
  if (images.length > 5) throw new HttpError(400, 'الحد الأقصى 5 صور لكل منتج');
  images = [...new Set(images)];
  if (images.length) {
    const q = images.map(() => '?').join(',');
    const { results } = await env.DB.prepare(`SELECT id FROM images WHERE id IN (${q})`).bind(...images).all();
    if (results.length !== images.length) throw new HttpError(400, 'إحدى الصور غير موجودة. أعد رفعها.');
  }
  return {
    name_ar, name_en, desc_ar, desc_en, price, old_price, category_id, images,
    featured: b.featured ? 1 : 0,
    available: b.available === false || b.available === 0 ? 0 : 1
  };
}

export async function attachImages(env, productId, ids) {
  if (!ids.length) return;
  await env.DB.batch(ids.map((img, i) =>
    env.DB.prepare('INSERT INTO product_images(product_id, image_id, position) VALUES(?,?,?)').bind(productId, img, i)));
}
