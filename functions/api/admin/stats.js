import { json, handle, methodNotAllowed } from '../../../lib/http.js';
import { baghdadDay } from '../../../lib/time.js';

export const onRequest = handle(async ({ request, env }) => {
  if (request.method !== 'GET') return methodNotAllowed();
  const days = [7, 30, 90].includes(+new URL(request.url).searchParams.get('days')) ? +new URL(request.url).searchParams.get('days') : 7;
  const from = baghdadDay(-(days - 1));

  const [totals, series, sources, prods] = await Promise.all([
    env.DB.prepare('SELECT type, COUNT(*) AS n FROM events WHERE day >= ? GROUP BY type').bind(from).all(),
    env.DB.prepare("SELECT day, COUNT(*) AS n FROM events WHERE type='view' AND day >= ? GROUP BY day").bind(from).all(),
    env.DB.prepare("SELECT CASE WHEN src='' THEN 'direct' ELSE src END AS s, COUNT(*) AS n FROM events WHERE type='view' AND day >= ? GROUP BY s ORDER BY n DESC LIMIT 8").bind(from).all(),
    env.DB.prepare("SELECT ref, type, COUNT(*) AS n FROM events WHERE type IN ('product','cart_add') AND ref != '' AND day >= ? GROUP BY ref, type").bind(from).all()
  ]);

  const t = {}; for (const r of totals.results) t[r.type] = r.n;
  const byDay = {}; for (const r of series.results) byDay[r.day] = r.n;
  const daily = []; for (let i = days - 1; i >= 0; i--) { const d = baghdadDay(-i); daily.push({ day: d, views: byDay[d] || 0 }); }

  const agg = {};
  for (const r of prods.results) { const o = (agg[r.ref] ||= { id: r.ref, views: 0, adds: 0 }); if (r.type === 'product') o.views = r.n; else o.adds = r.n; }
  const top = Object.values(agg).sort((a, b) => (b.views + b.adds * 2) - (a.views + a.adds * 2)).slice(0, 5);
  if (top.length) {
    const ids = top.map(x => Number(x.id)).filter(Number.isInteger);
    if (ids.length) {
      const { results } = await env.DB.prepare(`SELECT id, name_ar FROM products WHERE id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all();
      const names = Object.fromEntries(results.map(r => [String(r.id), r.name_ar]));
      for (const x of top) x.name = names[x.id] || '(محذوف)';
    }
  }
  return json({ days, totals: t, daily, sources: sources.results, topProducts: top });
});
