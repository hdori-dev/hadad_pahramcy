// يحسب مسار كل معلم إلى الصيدلية مرة واحدة ويحفظه في js/routes.js
// التشغيل (Node 18+):   node tools/build-routes.mjs
// بعد التشغيل يعمل الموقع فوراً ودون خدمة خارجية. راجع المسارات بصرياً على الخريطة قبل النشر.
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = { window: {} };
vm.runInNewContext(readFileSync(new URL('../js/config.js', import.meta.url), 'utf8'), ctx);
const CFG = ctx.window.SITE_CONFIG;
const out = {};

for (const m of CFG.markers) {
  const url = `https://router.project-osrm.org/route/v1/driving/${m.lng},${m.lat};${CFG.main.lng},${CFG.main.lat}?overview=full&geometries=geojson`;
  const r = await fetch(url).then(x => x.json());
  if (!r.routes?.[0]) { console.warn('تعذّر:', m.id); continue; }
  const rt = r.routes[0];
  out[m.id] = {
    coords: rt.geometry.coordinates.map(([lng, lat]) => [+lat.toFixed(5), +lng.toFixed(5)]),
    dist: Math.round(rt.distance),
    dur: Math.round(rt.duration)   // بالثواني، دون الثواني الإضافية (تُضاف من config.js)
  };
  console.log('✓', m.id, Math.round(rt.distance) + ' م', Math.round(rt.duration) + ' ث');
  await new Promise(r => setTimeout(r, 1100));   // احتراماً لحدود الخدمة العامة
}
writeFileSync(new URL('../js/routes.js', import.meta.url),
  '/* مولَّد بواسطة tools/build-routes.mjs */\nwindow.PRECOMPUTED_ROUTES = ' + JSON.stringify(out) + ';\n');
console.log('تم حفظ js/routes.js');
