import { fail } from '../../../lib/http.js';
import { getImage } from '../../../lib/store.js';

export const onRequestGet = async ({ params, env }) => {
  const id = String(params.id || '');
  if (!/^[A-Za-z0-9]{8,40}$/.test(id)) return fail(404, 'غير موجود');
  const img = await getImage(env, id);
  if (!img) return fail(404, 'غير موجود');
  return new Response(img.body, {
    headers: {
      'content-type': img.mime,
      'cache-control': 'public, max-age=31536000, immutable',     // المعرّف عشوائي والمحتوى لا يتغير
      'x-content-type-options': 'nosniff'
    }
  });
};
