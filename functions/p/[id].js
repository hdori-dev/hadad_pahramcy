// رابط منتج قابل للمشاركة: يعطي واتساب/إنستغرام معاينة (صورة + اسم + سعر) ثم يحوّل الزائر إلى صفحة المتجر
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function onRequestGet({ request, env, params }) {
  const url = new URL(request.url), id = Number(params.id);
  const dest = Number.isInteger(id) && id > 0 ? '/shop/?p=' + id : '/shop/';
  let title = 'المتجر', desc = '', image = url.origin + '/assets/og.png';
  if (Number.isInteger(id) && id > 0) {
    const p = await env.DB.prepare('SELECT id, name_ar, desc_ar, price FROM products WHERE id=?').bind(id).first();
    if (p) {
      const im = await env.DB.prepare('SELECT image_id FROM product_images WHERE product_id=? ORDER BY position LIMIT 1').bind(id).first();
      let cur = 'د.ع'; try { const c = await env.DB.prepare("SELECT value FROM settings WHERE key='currency_label'").first(); if (c && c.value) cur = c.value; } catch {}
      title = p.name_ar + ' — ' + Number(p.price).toLocaleString('en-US') + ' ' + cur;
      desc = (p.desc_ar || '').slice(0, 160);
      if (im) image = url.origin + '/api/img/' + im.image_id;
    }
  }
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${esc(image)}"><meta property="og:url" content="${esc(url.origin + '/p/' + (params.id || ''))}">
<meta name="twitter:card" content="summary_large_image"><meta http-equiv="refresh" content="0;url=${esc(dest)}"><link rel="canonical" href="${esc(dest)}"></head>
<body><a href="${esc(dest)}">${esc(title)}</a></body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60' } });
}
