# منصة «خريطة + متجر» — Cloudflare Pages + D1

موقع خفيف لكل نشاط تجاري: خريطة الموقع والمعالم والمسارات، وكتالوج منتجات بسلة طلب عبر واتساب،
ولوحة تحكم محمية بخطوتين، وإحصاءات مجهولة. كل شيء يعمل على Cloudflare بلا خادم تديره.

```
public/        ← الوحيد الذي يُنشر علناً (الموقع + /admin)
functions/     ← واجهة API (Pages Functions)
lib/           ← شيفرة مشتركة للـ API (لا تُقدَّم للعامة)
db/schema.sql  ← جداول قاعدة البيانات
tools/         ← test.mjs · seed.mjs · build-routes.mjs
wrangler.toml  ← إعداد Cloudflare
```

## 1) الدخول بخطوتين (كيف يعمل)
1. **حساب Google:** يسجّل المدير بحسابه. يتحقق الخادم من توقيع رمز Google (RS256) ومن أن التطبيق هو تطبيقك،
   وأن البريد موثّق، وأنه ضمن `ADMIN_EMAILS`. غير ذلك → «لا تمتلك الصلاحية».
2. **المفتاح السري:** `ADMIN_KEY` المحفوظ كسر في Cloudflare. بعد نجاحه تُنشأ جلسة 12 ساعة (كوكي HttpOnly + Secure + SameSite=Strict).

حمايات إضافية: رمز Google يُستعمل مرة واحدة (nonce من الخادم) · قفل 15 دقيقة بعد 5 محاولات فاشلة · مقارنة المفتاح بزمن ثابت ·
حماية CSRF · تسجيل خروج من كل الأجهزة · سياسة CSP صارمة على /admin.

## 2) النشر (مرة واحدة لكل عميل)
```bash
npm install
npx wrangler login

# قاعدة البيانات
npx wrangler d1 create map-shop-db          # انسخ database_id إلى wrangler.toml
npm run db:remote                           # ينشئ الجداول

# مشروع Pages
npx wrangler pages project create map-shop --production-branch main
```
**Google OAuth** (مجاني): console.cloud.google.com ← APIs & Services ← Credentials ← Create OAuth client ID ←
*Web application* ← **Authorized JavaScript origins**: `https://اسم-مشروعك.pages.dev` (ونطاقك الخاص إن وُجد، و`http://localhost:8788` للتجربة).
لا تحتاج Redirect URI. في شاشة الموافقة (Consent screen) اختر *External* وأضف بريد المدير ضمن *Test users* أو انقر *Publish app*.
انسخ **Client ID** إلى `GOOGLE_CLIENT_ID` في `wrangler.toml`، وضع بريد المدير في `ADMIN_EMAILS`.

**الأسرار** (لا تُكتب في أي ملف):
```bash
npx wrangler pages secret put ADMIN_KEY --project-name map-shop        # مفتاح الدخول (12 حرفاً فأكثر)
npx wrangler pages secret put SESSION_SECRET --project-name map-shop   # مثال لتوليده: openssl rand -base64 48
```
ثم:
```bash
npm run deploy
```
افتح `https://اسم-مشروعك.pages.dev/admin/`.

> لا تضع `GOOGLE_JWKS_URL` ولا `CATALOG_TTL` في الإنتاج. هما للاختبار المحلي فقط.

## 3) تخصيص الموقع لعميل جديد
- `public/js/config.js`: الاسم، العنوان، الإحداثيات، المعالم، الألوان/النصوص.
- `public/assets/`: `logo.png` و`emblem.png` و`favicon.png` و`og.png` (صورة مشاركة 1200×630).
- `public/index.html`: استبدل `DOMAIN` (وسوم og وJSON-LD) بنطاق العميل.
- `wrangler.toml`: `name` و`database_id` و`ADMIN_EMAILS` و`GOOGLE_CLIENT_ID`. أسرار مستقلة لكل عميل.
- **لكل عميل** مشروع Pages وقاعدة D1 ومفتاح دخول خاص به، فلا تختلط بياناتهم.
- ساعات الدوام والهاتف وواتساب وتنبيه العيد: من لوحة التحكم ← الإعدادات (لا تحتاج نشراً).
- مسارات المعالم الدقيقة: `node tools/build-routes.mjs` ثم انشر.

## 4) التشغيل والاختبار محلياً
```bash
cp .dev.vars.example .dev.vars   # عدّل القيم
npm run db:local
npm run dev                      # http://localhost:8788
```
الاختبار الآلي (62 فحصاً للدخول والصلاحيات والمنتجات…): ضع في `.dev.vars` السطرين `GOOGLE_JWKS_URL=http://127.0.0.1:8799/certs` و`CATALOG_TTL=0`
ثم شغّل `npm run dev` وفي نافذة أخرى `npm test`. بيانات تجريبية: `npm run seed` (تحتاج صوراً في /tmp/seed).

## 5) صور المنتجات
افتراضياً تُحفظ في D1 (لا تحتاج بطاقة دفع). تُضغط تلقائياً في المتصفح إلى WebP بأبعاد ≤1000px (≈ 30–150 كيلوبايت).
لاستخدام R2 (أنسب للمتاجر الكبيرة): أنشئ bucket وأزل التعليق عن `[[r2_buckets]]` في `wrangler.toml`.

## 6) حدود يجب معرفتها
- يظهر تعديل المنتجات للزبائن خلال ≤ 45 ثانية (تخزين مؤقت على حافة Cloudflare).
- أقسام بمستويين (رئيسي/فرعي)، وحتى 5 صور لكل منتج، والطلب عبر واتساب (لا دفع إلكتروني).
- الإحصاءات مجهولة: لا IP ولا هوية، فلا تُحصي «زواراً فريدين» بل «زيارات».
- تراخيص الخرائط: صور Esri المجانية ومسارات OSRM العامة للتجربة/الاستخدام الخفيف. للبيع الفعلي استخدم مزوداً بترخيص تجاري.
