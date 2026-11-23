// تخزين الصور: R2 إن وُجد الربط IMAGES، وإلا جدول images في D1
const MAX_BYTES = 1_500_000;
export const MAX_IMAGE_BYTES = MAX_BYTES;

export function sniffMime(u8) {
  if (u8.length > 12 && u8[0] === 0xFF && u8[1] === 0xD8 && u8[2] === 0xFF) return 'image/jpeg';
  if (u8.length > 8 && u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4E && u8[3] === 0x47) return 'image/png';
  if (u8.length > 12 && String.fromCharCode(...u8.slice(0, 4)) === 'RIFF' && String.fromCharCode(...u8.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}

export async function putImage(env, id, mime, buf) {
  if (env.IMAGES) {
    await env.IMAGES.put(id, buf, { httpMetadata: { contentType: mime } });
    await env.DB.prepare('INSERT INTO images(id, mime, size, data) VALUES(?,?,?,NULL)').bind(id, mime, buf.byteLength).run();
  } else {
    await env.DB.prepare('INSERT INTO images(id, mime, size, data) VALUES(?,?,?,?)').bind(id, mime, buf.byteLength, buf).run();
  }
}

export async function getImage(env, id) {
  const row = await env.DB.prepare('SELECT mime, data FROM images WHERE id=?').bind(id).first();
  if (!row) return null;
  if (env.IMAGES) {
    const o = await env.IMAGES.get(id);
    return o ? { mime: row.mime, body: o.body } : null;
  }
  let d = row.data;
  if (!d) return null;
  if (Array.isArray(d)) d = Uint8Array.from(d);
  return { mime: row.mime, body: d };
}

export async function deleteImages(env, ids) {
  for (const id of ids) {
    if (env.IMAGES) { try { await env.IMAGES.delete(id); } catch {} }
    await env.DB.prepare('DELETE FROM images WHERE id=?').bind(id).run();
  }
}

// يحذف الصور غير المرتبطة بأي منتج (والأقدم من ساعة، لتفادي حذف صورة رُفعت للتوّ ولم تُحفظ بعد)
export async function gcOrphans(env, onlyIds = null) {
  const cutoff = Math.floor(Date.now() / 1000) - 3600;
  let rows;
  if (onlyIds && onlyIds.length) {
    const q = onlyIds.map(() => '?').join(',');
    rows = await env.DB.prepare(`SELECT id FROM images WHERE id IN (${q}) AND id NOT IN (SELECT image_id FROM product_images)`).bind(...onlyIds).all();
  } else {
    rows = await env.DB.prepare('SELECT id FROM images WHERE created_at < ? AND id NOT IN (SELECT image_id FROM product_images)').bind(cutoff).all();
  }
  await deleteImages(env, (rows.results || []).map(r => r.id));
}
