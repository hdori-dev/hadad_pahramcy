import { handle, methodNotAllowed, readJson } from '../../../lib/http.js';
import { baghdadDay } from '../../../lib/time.js';

const TYPES = new Set(['view', 'product', 'cart_add', 'order', 'call', 'whatsapp', 'navigate', 'share', 'route', 'review']);

export const onRequest = handle(async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed();
  const url = new URL(request.url), origin = request.headers.get('origin');
  if (origin && origin !== url.origin) return new Response(null, { status: 204 });       // تجاهل الطلبات من مواقع أخرى
  let b; try { b = await readJson(request, 1024); } catch { return new Response(null, { status: 204 }); }
  if (!TYPES.has(b.type)) return new Response(null, { status: 204 });
  const src = String(b.src || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20);
  const ref = String(b.ref || '').replace(/[^\w.-]/g, '').slice(0, 40);
  await env.DB.prepare('INSERT INTO events(ts, day, type, src, ref) VALUES(?,?,?,?,?)')
    .bind(Math.floor(Date.now() / 1000), baghdadDay(), b.type, src, ref).run();
  return new Response(null, { status: 204 });
});
