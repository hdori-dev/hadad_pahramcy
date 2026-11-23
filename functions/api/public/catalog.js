import { json, handle, methodNotAllowed } from '../../../lib/http.js';
import { loadSettings } from '../../../lib/settings.js';

export const onRequest = handle(async (ctx) => {
  const { request, env } = ctx;
  if (request.method !== 'GET') return methodNotAllowed();
  // تخزين مؤقت قصير على حافة Cloudflare لتخفيف القراءات من D1
  const ttl = env.CATALOG_TTL === undefined ? 45 : Number(env.CATALOG_TTL);       // ثوانٍ؛ 0 = بلا تخزين (للاختبار)
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).origin + '/api/public/catalog', { method: 'GET' });
  if (ttl > 0) { const hit = await cache.match(cacheKey); if (hit) return hit; }

  const [settings, cats, prods, imgs] = await Promise.all([
    loadSettings(env),
    env.DB.prepare('SELECT id, parent_id, name_ar, name_en FROM categories WHERE active=1 ORDER BY (parent_id IS NOT NULL), sort, id').all(),
    env.DB.prepare('SELECT id, category_id, name_ar, name_en, desc_ar, desc_en, price, old_price, featured, available FROM products ORDER BY featured DESC, id DESC LIMIT 1000').all(),
    env.DB.prepare('SELECT product_id, image_id FROM product_images ORDER BY position').all()
  ]);
  const map = {}; for (const r of imgs.results) (map[r.product_id] ||= []).push(r.image_id);
  const activeCats = new Set(cats.results.map(c => c.id));
  const products = prods.results
    .filter(p => p.category_id === null || activeCats.has(p.category_id))      // منتجات الأقسام المعطّلة تختفي
    .map(p => ({ ...p, images: map[p.id] || [] }));

  const res = json({ settings, categories: cats.results, products }, 200, { 'cache-control': 'public, max-age=20, stale-while-revalidate=60' });
  if (ttl > 0) {
    const copy = new Response(res.clone().body, res);
    copy.headers.set('cache-control', 'public, max-age=' + ttl);
    ctx.waitUntil(cache.put(cacheKey, copy));
  }
  return res;
});
