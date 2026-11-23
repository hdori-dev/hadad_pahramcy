import { HttpError, str } from './http.js';
export const PUBLIC_KEYS = ['phone', 'whatsapp', 'hours_open', 'hours_close', 'notice', 'notice_active', 'review_url', 'currency_label', 'order_greeting', 'instagram'];

const hhmm = (v, n) => { v = String(v ?? '').trim(); if (v && !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) throw new HttpError(400, n + ': الصيغة HH:MM'); return v; };
const phone = (v, n) => { v = String(v ?? '').trim(); if (v && !/^\+?[0-9 ]{7,18}$/.test(v)) throw new HttpError(400, n + ' غير صالح'); return v.replace(/ /g, ''); };

export function cleanSettings(b) {
  const out = {};
  if ('phone' in b) out.phone = phone(b.phone, 'رقم الهاتف');
  if ('whatsapp' in b) out.whatsapp = phone(b.whatsapp, 'رقم واتساب');
  if ('hours_open' in b) out.hours_open = hhmm(b.hours_open, 'وقت الفتح');
  if ('hours_close' in b) out.hours_close = hhmm(b.hours_close, 'وقت الإغلاق');
  if ('notice' in b) out.notice = str(b.notice, { max: 160 });
  if ('notice_active' in b) out.notice_active = b.notice_active ? '1' : '0';
  if ('review_url' in b) {
    const u = str(b.review_url, { max: 300 });
    if (u && !/^https:\/\/[^\s]+$/i.test(u)) throw new HttpError(400, 'رابط التقييم يجب أن يبدأ بـ https://');
    out.review_url = u;
  }
  if ('currency_label' in b) out.currency_label = str(b.currency_label, { max: 12 }) || 'د.ع';
  if ('instagram' in b) {
    let u = String(b.instagram ?? '').trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/[/?#].*$/, '');
    if (u && !/^[A-Za-z0-9._]{1,30}$/.test(u)) throw new HttpError(400, 'اسم مستخدم إنستغرام غير صالح');
    out.instagram = u;
  }
  if ('order_greeting' in b) out.order_greeting = str(b.order_greeting, { max: 200 });
  return out;
}

export async function loadSettings(env) {
  const { results } = await env.DB.prepare('SELECT key, value FROM settings').all();
  const s = {};
  for (const r of results) if (PUBLIC_KEYS.includes(r.key)) s[r.key] = r.value;
  return s;
}
