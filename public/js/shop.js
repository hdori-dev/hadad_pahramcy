/* ==========================================================================
   المتجر: عرض المنتجات (الصفحة الرئيسية + صفحة /shop/) + السلة + إتمام الطلب
   + فاتورة PDF + الإرسال عبر واتساب / إنستغرام.
   يعمل مع الخريطة (SiteApp) وبدونها (صفحة المتجر).
   ========================================================================== */
(function () {
  'use strict';
  var CFG = window.SITE_CONFIG || { business: {}, defaultLang: 'ar' };
  var APP = window.SiteApp || null;

  /* ---------- اللغة ---------- */
  var ownLang = (function () { try { return localStorage.getItem('lang') || CFG.defaultLang || 'ar'; } catch (e) { return CFG.defaultLang || 'ar'; } })();
  function lang() { return APP ? APP.lang() : ownLang; }
  function loc(x) {
    x = String(x);
    if (lang() !== 'ar') return x;
    return x.replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.charAt(d); });
  }

  var STR = {
    ar: { shop: 'المنتجات والعروض', browse: 'تصفّح المنتجات', all: 'الكل', search: 'ابحث عن منتج…', add: 'أضف إلى السلة', unavailable: 'غير متوفر',
      cart: 'سلة المشتريات', total: 'الإجمالي', empty: 'السلة فارغة', clear: 'إفراغ السلة', note: 'ملاحظات للطلب (اختياري)', none: 'لا توجد منتجات مطابقة.',
      close: 'إغلاق', featuredT: 'منتجات مميزة', offersT: 'عروض وخصومات', allT: 'كل المنتجات', viewAll: 'عرض الكل', viewCart: 'عرض السلة', added: 'أُضيف إلى السلة',
      qty: 'الكمية', remove: 'إزالة', featured: 'مميز', checkout: 'إتمام الطلب', filters: 'تصفية', sort: 'الترتيب', sNew: 'الأحدث', sLow: 'الأقل سعراً', sHigh: 'الأعلى سعراً', sDisc: 'الأعلى خصماً',
      price: 'السعر', from: 'من', to: 'إلى', availOnly: 'المتوفر فقط', reset: 'إعادة ضبط', results: 'منتج', back: 'الخريطة', copyLink: 'نسخ رابط المنتج', copied: 'تم النسخ',
      yourInfo: 'بياناتك لإصدار الفاتورة', fName: 'الاسم الكامل', fPhone: 'رقم الهاتف', fAddr: 'العنوان', fAddrPh: 'المحافظة، المنطقة، أقرب نقطة دالة', recv: 'طريقة الاستلام', delivery: 'توصيل', pickup: 'استلام من الصيدلية',
      reqName: 'أدخل اسمك', reqPhone: 'أدخل رقم هاتف صحيح', reqAddr: 'أدخل عنوانك', makeInvoice: 'إنشاء الفاتورة', working: 'جارٍ إنشاء الفاتورة…', orderNo: 'رقم الطلب',
      ready: 'تم تجهيز طلبك', sendVia: 'أرسل الطلب عبر', viaWa: 'واتساب', viaIg: 'إنستغرام', dlPdf: 'تحميل الفاتورة PDF', sharePdf: 'مشاركة الفاتورة',
      tipWa: 'أرفق ملف الفاتورة في المحادثة لتأكيد أسرع.', tipIg: 'يُنسخ الطلب تلقائياً؛ الصقه في المحادثة.', igCopied: 'تم نسخ الطلب — الصقه في المحادثة',
      newOrder: 'إنهاء وطلب جديد', noChannel: 'لم يُضبط واتساب/إنستغرام للمتجر بعد. حمّل الفاتورة وتواصل معنا هاتفياً.', errGeneric: 'تعذّر إنشاء الطلب. حاول مرة أخرى.', offlineNote: 'لم يُحفظ الطلب في النظام (لا اتصال)، لكن الفاتورة جاهزة.',
      orderTitle: 'طلب جديد', name: 'الاسم', phone: 'الهاتف', addr: 'العنوان', products: 'المنتجات', totalL: 'الإجمالي', notes: 'ملاحظات', link: 'الرابط', mapLabel: 'الخريطة', pdfName: 'فاتورة', call: 'اتصل', orderNow: 'اطلب الآن',
      ctaT: 'جاهز للطلب؟', ctaS: 'اختر منتجاتك وأرسل الطلب إلى الصيدلية مباشرة عبر واتساب أو إنستغرام مع فاتورة مرتبة.', cats: 'الأقسام', off: 'خصم', ph: 'الاسم' },
    en: { shop: 'Products & offers', browse: 'Browse products', all: 'All', search: 'Search products…', add: 'Add to cart', unavailable: 'Unavailable',
      cart: 'Shopping cart', total: 'Total', empty: 'Your cart is empty', clear: 'Clear cart', note: 'Order notes (optional)', none: 'No matching products.',
      close: 'Close', featuredT: 'Featured', offersT: 'Offers & discounts', allT: 'All products', viewAll: 'View all', viewCart: 'View cart', added: 'Added to cart',
      qty: 'Quantity', remove: 'Remove', featured: 'Featured', checkout: 'Checkout', filters: 'Filters', sort: 'Sort', sNew: 'Newest', sLow: 'Price: low to high', sHigh: 'Price: high to low', sDisc: 'Biggest discount',
      price: 'Price', from: 'From', to: 'To', availOnly: 'In stock only', reset: 'Reset', results: 'products', back: 'Map', copyLink: 'Copy product link', copied: 'Copied',
      yourInfo: 'Your details for the invoice', fName: 'Full name', fPhone: 'Phone number', fAddr: 'Address', fAddrPh: 'City, area, nearest landmark', recv: 'Receiving', delivery: 'Delivery', pickup: 'Pickup from pharmacy',
      reqName: 'Enter your name', reqPhone: 'Enter a valid phone number', reqAddr: 'Enter your address', makeInvoice: 'Create invoice', working: 'Creating invoice…', orderNo: 'Order no.',
      ready: 'Your order is ready', sendVia: 'Send your order via', viaWa: 'WhatsApp', viaIg: 'Instagram', dlPdf: 'Download invoice PDF', sharePdf: 'Share invoice',
      tipWa: 'Attach the invoice PDF in the chat for faster confirmation.', tipIg: 'The order is copied; paste it in the chat.', igCopied: 'Order copied — paste it in the chat',
      newOrder: 'Finish & start new order', noChannel: 'WhatsApp/Instagram are not set up yet. Download the invoice and call us.', errGeneric: 'Could not create the order. Please try again.', offlineNote: 'Order was not saved (offline), but your invoice is ready.',
      orderTitle: 'New order', name: 'Name', phone: 'Phone', addr: 'Address', products: 'Products', totalL: 'Total', notes: 'Notes', link: 'Link', mapLabel: 'Map', pdfName: 'invoice', call: 'Call', orderNow: 'Order now',
      ctaT: 'Ready to order?', ctaS: 'Pick your products and send the order straight to the pharmacy on WhatsApp or Instagram, with a neat invoice.', cats: 'Categories', off: 'off', ph: 'Name' }
  };
  function s(k) { return (STR[lang()] || STR.ar)[k] || STR.ar[k] || k; }

  /* ---------- أدوات DOM ---------- */
  function h(tag, props) {
    var el = document.createElement(tag), kids = Array.prototype.slice.call(arguments, 2), k;
    props = props || {};
    for (k in props) {
      var v = props[k]; if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else if (k === 'hidden') el.hidden = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    (function add(list) { list.forEach(function (c) { if (c === null || c === undefined || c === false) return; if (Array.isArray(c)) return add(c); el.append(c.nodeType ? c : document.createTextNode(String(c))); }); })(kids);
    return el;
  }
  var P = {
    bag: '<path d="M6 7h12l-1 13H7L6 7z"/><path d="M9 7V6a3 3 0 0 1 6 0v1"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>', plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    img: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-9 9"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    wa: '<path fill="currentColor" stroke="none" d="M20.5 3.5A11 11 0 0 0 3.2 17.1L2 22l5-1.3A11 11 0 1 0 20.5 3.5zM12 20.2a9 9 0 0 1-4.6-1.3l-.3-.2-3 .8.8-2.9-.2-.3A9 9 0 1 1 12 20.2zm5-6.7c-.3-.1-1.6-.8-1.9-.9s-.5-.1-.6.1-.7.9-.9 1.1-.3.2-.6.1a7.4 7.4 0 0 1-3.7-3.2c-.3-.5.3-.5.8-1.5a.5.5 0 0 0 0-.5l-.9-2.1c-.2-.5-.5-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.8 11.8 0 0 0 4.6 4.1c1.7.7 2.4.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.6-.3z"/>',
    ig: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    dl: '<path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/>', share: '<path d="M12 15V4m0 0L8 8m4-4 4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', filter: '<path d="M4 6h16M7 12h10M10 18h4"/>', back: '<path d="m9 6 6 6-6 6"/>', down: '<path d="m6 9 6 6 6-6"/>',
    pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'
  };
  function ico(n) { var t = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); t.setAttribute('viewBox', '0 0 24 24'); t.setAttribute('aria-hidden', 'true'); t.innerHTML = P[n]; return t; }

  function nm(o) { return (lang() === 'en' && o.name_en) ? o.name_en : o.name_ar; }
  function ds(o) { return (lang() === 'en' && o.desc_en) ? o.desc_en : o.desc_ar; }
  function currency() { var c = (data && data.settings && data.settings.currency_label) || 'د.ع'; return (lang() === 'en' && c === 'د.ع') ? 'IQD' : c; }
  function num(n) { return loc(String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, lang() === 'ar' ? '٬' : ',')); }
  function money(n) { return num(n) + ' ' + currency(); }
  function img(id) { return '/api/img/' + id; }
  function discPct(p) { return p.old_price && p.old_price > p.price ? Math.round((p.old_price - p.price) / p.old_price * 100) : 0; }
  function track(t, r) { if (APP) APP.track(t, r); else { try { navigator.sendBeacon && navigator.sendBeacon('/api/public/track', new Blob([JSON.stringify({ type: t, ref: r ? String(r) : '' })], { type: 'application/json' })); } catch (e) {} } }
  var toastEl, toastT;
  function toast(msg, ms) {
    if (APP && document.getElementById('toast')) return APP.toast(msg, ms);
    if (!toastEl) { toastEl = h('div', { class: 'toast show-shop', role: 'status', 'aria-live': 'polite' }); document.body.append(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('show'); }, ms || 2500);
  }

  /* ---------- جهات التواصل (الإعدادات من لوحة التحكم تتجاوز config.js) ---------- */
  function contact() {
    var st = (data && data.settings) || {}, B = CFG.business || {};
    return {
      wa: String(st.whatsapp || B.whatsapp || '').replace(/\D/g, ''),
      phone: st.phone || B.phone || '',
      ig: String(st.instagram || B.instagram || '').replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, ''),
      name: (B.name && (B.name[lang()] || B.name.ar)) || document.title,
      address: (B.address && (B.address[lang()] || B.address.ar)) || '',
      greeting: st.order_greeting || ''
    };
  }

  /* ---------- الحالة ---------- */
  var data = null, byId = {}, cart = {}, ui = { c: null, sub: null, q: '', sort: 'new', min: '', max: '', avail: false };
  var listeners = [], loadWaiters = [];
  function onChange(fn) { listeners.push(fn); }
  function emit() { listeners.forEach(function (f) { try { f(); } catch (e) {} }); updateCartUI(); }

  function saveCart() { try { localStorage.setItem('cart_v1', JSON.stringify(cart)); } catch (e) {} }
  function loadCart() {
    try { var c = JSON.parse(localStorage.getItem('cart_v1') || '{}'); cart = {}; Object.keys(c).forEach(function (id) { var p = byId[id], q = c[id] | 0; if (p && p.available && q > 0) cart[id] = Math.min(q, 99); }); } catch (e) { cart = {}; }
  }
  function cartCount() { return Object.keys(cart).reduce(function (n, id) { return n + cart[id]; }, 0); }
  function cartTotal() { return Object.keys(cart).reduce(function (n, id) { return n + byId[id].price * cart[id]; }, 0); }

  function load() {
    return fetch('/api/public/catalog', { credentials: 'omit' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d) return null;
      data = d; byId = {}; d.products.forEach(function (p) { byId[p.id] = p; });
      if (APP) APP.applySettings(d.settings);
      loadCart();
      loadWaiters.splice(0).forEach(function (f) { f(d); });
      return d;
    }).catch(function () { return null; });
  }

  /* ---------- الورقة السفلية (منتج / سلة / بيانات / نتيجة) ---------- */
  var sheetBg, sheet, sheetOpen = false;
  function ensureSheet() {
    if (sheetBg) return;
    sheet = h('div', { class: 'sh-sheet', role: 'dialog', 'aria-modal': 'true' });
    sheetBg = h('div', { class: 'sh-sheet-bg', hidden: true, onclick: function (e) { if (e.target === sheetBg) closeSheet(); } }, sheet);
    document.body.append(sheetBg);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && sheetOpen) closeSheet(); });
    window.addEventListener('popstate', function () { if (sheetOpen && !(history.state && history.state.sheet)) hideSheet(); });
  }
  function showSheet(content) {
    ensureSheet(); sheet.textContent = ''; sheet.append(content); sheet.scrollTop = 0; sheetBg.hidden = false; document.body.classList.add('sheet-open');
    if (!sheetOpen) { sheetOpen = true; try { history.pushState({ sheet: 1 }, ''); } catch (e) {} }
    var f = sheet.querySelector('input, textarea'); if (f && matchMedia('(hover:hover)').matches) setTimeout(function () { f.focus({ preventScroll: true }); }, 40);
  }
  function hideSheet() { if (!sheetBg) return; sheetBg.hidden = true; sheetOpen = false; document.body.classList.remove('sheet-open'); }
  function closeSheet() { if (history.state && history.state.sheet) history.back(); else hideSheet(); }
  function sheetHead(title) { return h('div', { class: 'sheet-head' }, h('h3', {}, title), h('button', { class: 'sh-icon', type: 'button', 'aria-label': s('close'), onclick: closeSheet }, ico('x'))); }

  /* ---------- السلة ---------- */
  function addToCart(id, q) {
    var p = byId[id]; if (!p || !p.available) return;
    cart[id] = Math.min(99, (cart[id] || 0) + q); saveCart(); track('cart_add', id); emit(); toast(s('added'), 1300);
  }
  function setQty(id, q) { if (q <= 0) delete cart[id]; else cart[id] = Math.min(99, q); saveCart(); emit(); }

  var bar;
  function ensureBar() {
    if (bar || !document.body.classList.contains('shop-page')) return;
    bar = h('button', { class: 'cartbar', type: 'button', hidden: true, onclick: openCart }); document.body.append(bar);
  }
  function updateCartUI() {
    var n = cartCount();
    [].forEach.call(document.querySelectorAll('[data-cart-count]'), function (b) { b.hidden = !n; b.textContent = loc(String(n)); });
    [].forEach.call(document.querySelectorAll('[data-cart-open]'), function (b) { b.setAttribute('aria-label', s('cart')); });
    var cp = document.getElementById('cartPill'); if (cp) cp.hidden = !n;
    ensureBar();
    if (bar) { bar.hidden = !n || sheetOpen; if (n) { bar.textContent = ''; bar.append(h('span', { class: 'cb-n' }, loc(String(n))), h('span', { class: 'cb-t' }, s('viewCart')), h('b', {}, money(cartTotal()))); } }
  }

  function stepper(get, set) {
    var out = h('output', { class: 'qv', 'aria-live': 'polite' }, loc(String(get())));
    var upd = function () { out.textContent = loc(String(get())); };
    return h('div', { class: 'stepper', role: 'group', 'aria-label': s('qty') },
      h('button', { type: 'button', 'aria-label': '-', onclick: function () { set(get() - 1); upd(); } }, ico('minus')), out,
      h('button', { type: 'button', 'aria-label': '+', onclick: function () { set(get() + 1); upd(); } }, ico('plus')));
  }

  /* ---------- بطاقة منتج ---------- */
  function card(p, compact) {
    var d = discPct(p);
    var pic = p.images[0] ? h('img', { src: img(p.images[0]), alt: '', loading: 'lazy', decoding: 'async' }) : h('span', { class: 'noimg' }, ico('img'));
    return h('article', { class: 'pcard' + (compact ? ' compact' : '') + (p.available ? '' : ' off') },
      h('button', { class: 'pimg', type: 'button', 'aria-label': nm(p), onclick: function () { openProduct(p.id); } }, pic,
        p.featured ? h('span', { class: 'pstar', title: s('featured') }, '★') : null,
        d ? h('span', { class: 'pdisc' }, '-' + loc(String(d)) + '٪') : null),
      h('div', { class: 'pinfo' },
        h('button', { class: 'pname', type: 'button', onclick: function () { openProduct(p.id); } }, nm(p)),
        h('div', { class: 'pbottom' },
          h('div', { class: 'pprice' }, h('b', {}, money(p.price)), d ? h('s', {}, num(p.old_price)) : null),
          p.available ? h('button', { class: 'padd', type: 'button', 'aria-label': s('add') + ': ' + nm(p), onclick: function () { addToCart(p.id, 1); } }, ico('plus'))
                      : h('span', { class: 'poff' }, s('unavailable')))));
  }

  function openProduct(id) {
    var p = byId[id]; if (!p) return; track('product', id);
    var q = 1, d = discPct(p);
    var gallery = p.images.length
      ? h('div', { class: 'gallery', tabindex: '0' }, p.images.map(function (i) { return h('img', { src: img(i), alt: nm(p), loading: 'lazy' }); }))
      : h('div', { class: 'gallery none' }, h('span', { class: 'noimg' }, ico('img')));
    var addBtn = h('button', { type: 'button', class: 'btn-go', onclick: function () { addToCart(id, q); closeSheet(); } });
    var upd = function () { addBtn.textContent = s('add') + ' · ' + money(p.price * q); }; upd();
    showSheet(h('div', { class: 'pd' },
      h('button', { class: 'sh-icon sheet-x', type: 'button', 'aria-label': s('close'), onclick: closeSheet }, ico('x')), gallery,
      h('div', { class: 'pd-body' },
        h('h3', {}, nm(p), p.featured ? h('span', { class: 'pstar inline' }, '★') : null),
        h('div', { class: 'pd-price' }, h('b', {}, money(p.price)), d ? h('s', {}, num(p.old_price)) : null, d ? h('span', { class: 'pd-off' }, loc(String(d)) + '٪ ' + s('off')) : null),
        ds(p) ? h('p', { class: 'pd-desc' }, ds(p)) : null,
        p.available ? h('div', { class: 'pd-row' }, stepper(function () { return q; }, function (v) { q = Math.max(1, Math.min(99, v)); upd(); }), addBtn) : h('div', { class: 'poff big' }, s('unavailable')),
        h('button', { class: 'btn-link', type: 'button', onclick: function () { copyText(location.origin + '/p/' + id).then(function () { toast(s('copied'), 1500); }); } }, ico('link'), s('copyLink')))));
  }

  /* ---------- السلة (ورقة) ---------- */
  function openCart() {
    var ids = Object.keys(cart);
    if (!ids.length) { showSheet(h('div', { class: 'cart' }, sheetHead(s('cart')), h('div', { class: 'sh-empty' }, s('empty')))); return; }
    var totalEl = h('b', {}), listEl = h('div', { class: 'cart-list' });
    var redraw = function () {
      var left = Object.keys(cart); listEl.textContent = '';
      if (!left.length) { closeSheet(); return; }
      left.forEach(function (id) {
        var p = byId[id];
        listEl.append(h('div', { class: 'ci' },
          p.images[0] ? h('img', { src: img(p.images[0]), alt: '' }) : h('span', { class: 'noimg sm' }, ico('img')),
          h('div', { class: 'ci-m' }, h('div', { class: 'ci-n' }, nm(p)), h('div', { class: 'ci-p' }, money(p.price * cart[id])),
            stepper(function () { return cart[id] || 0; }, function (v) { setQty(id, v); redraw(); })),
          h('button', { class: 'sh-icon', type: 'button', 'aria-label': s('remove'), onclick: function () { setQty(id, 0); redraw(); } }, ico('trash'))));
      });
      totalEl.textContent = money(cartTotal());
    };
    showSheet(h('div', { class: 'cart' }, sheetHead(s('cart')), listEl,
      h('div', { class: 'cart-total' }, h('span', {}, s('total')), totalEl),
      h('button', { class: 'btn-go', type: 'button', onclick: openCheckout }, s('checkout')),
      h('button', { class: 'btn-link', type: 'button', onclick: function () { cart = {}; saveCart(); emit(); closeSheet(); } }, s('clear'))));
    redraw();
  }

  /* ---------- إتمام الطلب: الاسم + الهاتف + العنوان إجبارية ---------- */
  function savedCust() { try { return JSON.parse(localStorage.getItem('cust_v1') || '{}'); } catch (e) { return {}; } }
  function field(label, input, err) { return h('label', { class: 'fld' }, h('span', {}, label), input, err); }

  function openCheckout() {
    if (!cartCount()) return;
    var sv = savedCust(), method = sv.method === 'pickup' ? 'pickup' : 'delivery';
    var eName = h('small', { class: 'ferr', hidden: true, role: 'alert' }), ePhone = h('small', { class: 'ferr', hidden: true, role: 'alert' }), eAddr = h('small', { class: 'ferr', hidden: true, role: 'alert' });
    var iName = h('input', { type: 'text', autocomplete: 'name', maxlength: '80', value: sv.name || '', 'aria-required': 'true' });
    var iPhone = h('input', { type: 'tel', inputmode: 'tel', autocomplete: 'tel', dir: 'ltr', maxlength: '20', placeholder: '07xx xxx xxxx', value: sv.phone || '', 'aria-required': 'true' });
    var iAddr = h('textarea', { rows: '2', maxlength: '200', autocomplete: 'street-address', placeholder: s('fAddrPh'), 'aria-required': 'true' }); iAddr.value = sv.address || '';
    var iNote = h('textarea', { rows: '2', maxlength: '300', placeholder: s('note') });
    var seg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': s('recv') });
    var segBtns = {};
    ['delivery', 'pickup'].forEach(function (m) {
      segBtns[m] = h('button', { type: 'button', role: 'radio', 'aria-checked': m === method ? 'true' : 'false', class: m === method ? 'on' : '', onclick: function () {
        method = m; Object.keys(segBtns).forEach(function (k) { segBtns[k].className = k === m ? 'on' : ''; segBtns[k].setAttribute('aria-checked', k === m ? 'true' : 'false'); });
      } }, s(m));
      seg.append(segBtns[m]);
    });
    var go = h('button', { type: 'submit', class: 'btn-go' }, s('makeInvoice'));
    [[iName, eName], [iPhone, ePhone], [iAddr, eAddr]].forEach(function (pr) { pr[0].addEventListener('input', function () { if (!pr[1].hidden) { pr[1].hidden = true; pr[0].classList.remove('bad'); pr[0].setAttribute('aria-invalid', 'false'); } }); });
    function setErr(inp, el, msg) { el.hidden = !msg; el.textContent = msg || ''; inp.classList.toggle('bad', !!msg); inp.setAttribute('aria-invalid', msg ? 'true' : 'false'); return !msg; }
    var form = h('form', { class: 'co-form', novalidate: true, onsubmit: function (e) {
      e.preventDefault();
      var name = iName.value.trim(), phone = iPhone.value.replace(/[\s\-()]/g, '').replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }), addr = iAddr.value.trim();
      var ok1 = setErr(iName, eName, name.length < 2 ? s('reqName') : ''), ok2 = setErr(iPhone, ePhone, /^\+?[0-9]{7,16}$/.test(phone) ? '' : s('reqPhone')), ok3 = setErr(iAddr, eAddr, addr.length < 4 ? s('reqAddr') : '');
      if (!(ok1 && ok2 && ok3)) { (!ok1 ? iName : !ok2 ? iPhone : iAddr).focus(); return; }
      try { localStorage.setItem('cust_v1', JSON.stringify({ name: name, phone: phone, address: addr, method: method })); } catch (er) {}
      submitOrder({ name: name, phone: phone, address: addr, method: method, note: iNote.value.trim() }, go);
    } },
      h('p', { class: 'co-lead' }, s('yourInfo')),
      field(s('fName') + ' *', iName, eName), field(s('fPhone') + ' *', iPhone, ePhone), field(s('fAddr') + ' *', iAddr, eAddr),
      h('div', { class: 'fld' }, h('span', {}, s('recv')), seg), field(s('note'), iNote),
      h('div', { class: 'cart-total' }, h('span', {}, s('total') + ' (' + loc(String(cartCount())) + ')'), h('b', {}, money(cartTotal()))), go);
    showSheet(h('div', { class: 'cart' }, sheetHead(s('checkout')), form));
  }

  var lastOrder = null;
  function submitOrder(cust, btn) {
    btn.disabled = true; btn.textContent = s('working');
    var items = Object.keys(cart).map(function (id) { return { id: +id, qty: cart[id] }; });
    fetch('/api/public/order', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: cust.name, phone: cust.phone, address: cust.address, method: cust.method, note: cust.note, items: items }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (r) {
        if (!r.ok) { if (r.j && r.j.code === 'unavailable') { toast(r.j.error, 4000); btn.disabled = false; btn.textContent = s('makeInvoice'); return null; } throw new Error(r.j && r.j.error || 'err'); }
        return { saved: true, code: r.j.code, created_at: r.j.created_at, items: r.j.items.map(function (i) { return { id: i.id, name: lang() === 'en' && i.name_en ? i.name_en : i.name, qty: i.qty, price: i.price }; }), total: r.j.total };
      })
      .catch(function () {
        // دون اتصال: الفاتورة ما زالت ممكنة من بيانات الصفحة
        toast(s('offlineNote'), 4000);
        return { saved: false, code: '', created_at: Math.floor(Date.now() / 1000), items: items.map(function (i) { var p = byId[i.id]; return { id: i.id, name: nm(p), qty: i.qty, price: p.price }; }), total: cartTotal() };
      })
      .then(function (o) {
        if (!o) return;
        o.items.forEach(function (it) { var p = byId[it.id]; it.img = p && p.images[0] ? img(p.images[0]) : null; });
        lastOrder = { code: o.code, created_at: o.created_at, name: cust.name, phone: cust.phone, address: cust.address, method: cust.method, note: cust.note, items: o.items, total: o.total, saved: o.saved };
        track('order', o.code);
        return buildPdf(lastOrder).then(function (blob) { lastOrder.blob = blob; showResult(); }, function () { lastOrder.blob = null; showResult(); });
      });
  }

  function buildPdf(o) {
    var c = contact();
    return window.Invoice.build(o, { lang: lang(), currency: currency(), loc: loc, biz: { name: c.name, address: c.address, phone: c.phone, site: location.host } });
  }

  /* ---------- نص الطلب (واتساب/إنستغرام) ---------- */
  function orderText(o) {
    var c = contact(), L = [];
    L.push((c.greeting ? c.greeting + '\n\n' : '') + '🧾 ' + s('orderTitle') + (o.code ? ' #' + loc(o.code) : ''));
    L.push(s('name') + ': ' + o.name, s('phone') + ': ' + loc(o.phone), s('addr') + ': ' + o.address, s('recv') + ': ' + s(o.method), '', s('products') + ':');
    o.items.forEach(function (it, i) {
      L.push(loc(String(i + 1)) + ') ' + it.name + ' × ' + loc(String(it.qty)) + ' — ' + money(it.price * it.qty));
      L.push('   ' + location.origin + '/p/' + it.id);
    });
    L.push('', '💰 ' + s('totalL') + ': ' + money(o.total));
    if (o.note) L.push('', s('notes') + ': ' + o.note);
    return L.join('\n');
  }

  function copyText(t) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t).catch(function () { return legacyCopy(t); });
    return legacyCopy(t);
  }
  function legacyCopy(t) {
    return new Promise(function (res) {
      var ta = h('textarea', { style: 'position:fixed;opacity:0;top:0' }); ta.value = t; document.body.append(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) {} ta.remove(); res();
    });
  }
  function pdfFile(o) { return o.blob ? new File([o.blob], s('pdfName') + '-' + (o.code || 'order') + '.pdf', { type: 'application/pdf' }) : null; }

  function showResult() {
    var o = lastOrder, c = contact(), text = orderText(o), file = pdfFile(o);
    var canShare = !!(file && navigator.canShare && navigator.canShare({ files: [file] }));
    var btns = [];
    if (c.wa) btns.push(h('a', { class: 'send wa', href: 'https://wa.me/' + c.wa + '?text=' + encodeURIComponent(text), target: '_blank', rel: 'noopener', onclick: function () { track('whatsapp'); } }, ico('wa'), h('span', {}, s('viaWa'))));
    if (c.ig) btns.push(h('a', { class: 'send ig', href: 'https://ig.me/m/' + c.ig, target: '_blank', rel: 'noopener', onclick: function () { copyText(text).then(function () { toast(s('igCopied'), 4500); }); } }, ico('ig'), h('span', {}, s('viaIg'))));
    var dl = file ? h('button', { type: 'button', class: 'btn-soft', onclick: function () {
      var a = h('a', { href: URL.createObjectURL(file), download: file.name }); document.body.append(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    } }, ico('dl'), s('dlPdf')) : null;
    var sh = canShare ? h('button', { type: 'button', class: 'btn-soft', onclick: function () { navigator.share({ files: [file], text: text }).catch(function () {}); } }, ico('share'), s('sharePdf')) : null;
    showSheet(h('div', { class: 'cart res' }, sheetHead(s('ready')),
      h('div', { class: 'res-ok' }, h('span', { class: 'res-tick' }, ico('check')),
        o.code ? h('div', {}, h('small', {}, s('orderNo')), h('b', { dir: 'ltr' }, '#' + loc(o.code))) : null,
        h('div', { class: 'res-total' }, money(o.total))),
      btns.length ? h('p', { class: 'res-h' }, s('sendVia')) : h('p', { class: 'cart-warn' }, s('noChannel')),
      h('div', { class: 'sends' }, btns),
      btns.length ? h('p', { class: 'res-tip' }, c.wa ? s('tipWa') : s('tipIg')) : null,
      h('div', { class: 'row2' }, dl, sh),
      h('button', { class: 'btn-link', type: 'button', onclick: function () { cart = {}; saveCart(); emit(); closeSheet(); } }, s('newOrder'))));
  }

  /* ---------- التصفية ---------- */
  function mainCats() { return data.categories.filter(function (c) { return c.parent_id === null; }); }
  function inCat(p) {
    if (ui.sub) return p.category_id === ui.sub;
    if (ui.c) return p.category_id === ui.c || data.categories.some(function (c) { return c.id === p.category_id && c.parent_id === ui.c; });
    return true;
  }
  function filtered() {
    var q = ui.q.toLowerCase(), mn = ui.min === '' ? null : +ui.min, mx = ui.max === '' ? null : +ui.max;
    var list = data.products.filter(function (p) {
      if (!inCat(p)) return false;
      if (q && (p.name_ar + ' ' + p.name_en + ' ' + (p.desc_ar || '')).toLowerCase().indexOf(q) < 0) return false;
      if (ui.avail && !p.available) return false;
      if (mn !== null && p.price < mn) return false;
      if (mx !== null && p.price > mx) return false;
      return true;
    });
    if (ui.sort === 'low') list.sort(function (a, b) { return a.price - b.price; });
    else if (ui.sort === 'high') list.sort(function (a, b) { return b.price - a.price; });
    else if (ui.sort === 'disc') list.sort(function (a, b) { return discPct(b) - discPct(a); });
    else if (ui.sort === 'new') list.sort(function (a, b) { return b.id - a.id; });
    return list;
  }

  /* ==================== الصفحة الرئيسية: قسم المنتجات تحت الخريطة ==================== */
  function mountHome(root) {
    function render() {
      if (!data || !data.products.length) { root.hidden = true; return; }
      var c = contact(), cats = mainCats(), shown = data.products.slice(0, 6);
      root.hidden = false; root.textContent = '';
      if (!document.body.classList.contains('has-home')) { document.body.classList.add('has-home'); window.dispatchEvent(new Event('resize')); }
      root.append(
        h('div', { class: 'home-in' },
          h('h2', { class: 'home-t' }, s('shop')),
          cats.length ? h('nav', { class: 'catrow', 'aria-label': s('cats') }, cats.map(function (k) { return h('a', { class: 'catchip', href: '/shop/?c=' + k.id }, nm(k)); })) : null,
          h('div', { class: 'pgrid' }, shown.map(function (p) { return card(p, false); })),
          h('a', { class: 'btn-go home-all', href: '/shop/' }, s('viewAll') + ' (' + loc(String(data.products.length)) + ')'),
          h('div', { class: 'home-contact' },
            c.wa ? h('a', { class: 'cta-ic wa', href: 'https://wa.me/' + c.wa, target: '_blank', rel: 'noopener', 'aria-label': 'WhatsApp' }, ico('wa')) : null,
            c.ig ? h('a', { class: 'cta-ic ig', href: 'https://instagram.com/' + c.ig, target: '_blank', rel: 'noopener', 'aria-label': 'Instagram' }, ico('ig')) : null,
            c.phone ? h('a', { class: 'cta-ic', href: 'tel:' + c.phone, 'aria-label': s('call') }, ico('phone')) : null)));
    }
    onChange(render);
    document.addEventListener('sitelangchange', function () { render(); updateCartUI(); });
    var btn = document.getElementById('shopBtn');
    function wire() {
      if (!btn) return;
      btn.hidden = !(data && data.products.length);
      document.getElementById('shopLabel').textContent = s('browse');
      btn.onclick = function () { root.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); };
      var b = document.getElementById('shopCount'); if (b) b.hidden = true;
    }
    onChange(wire);
    document.addEventListener('sitelangchange', wire);
    bindCartButtons();
    load().then(function () { render(); wire(); emit(); });
  }

  /* ==================== صفحة /shop/ ==================== */
  function mountPage(root) {
    document.body.classList.add('shop-page');
    var qs = new URLSearchParams(location.search);
    if (qs.get('c')) ui.c = +qs.get('c') || null;
    if (qs.get('q')) ui.q = qs.get('q');
    if (['low', 'high', 'disc', 'new'].indexOf(qs.get('sort')) > -1) ui.sort = qs.get('sort');
    var openId = +qs.get('p') || null;

    var els = {};
    els.langBtn = h('button', { class: 'pill', type: 'button', lang: 'en', onclick: function () { ownLang = lang() === 'ar' ? 'en' : 'ar'; try { localStorage.setItem('lang', ownLang); } catch (e) {} applyLang(); renderAll(); } });
    els.search = h('input', { type: 'search', class: 'sp-q', autocomplete: 'off', value: ui.q, oninput: function () { ui.q = els.search.value.trim(); renderBody(); sync(); } });
    els.chips = h('div', { class: 'chips' }); els.sub = h('div', { class: 'chips sub' });
    els.sort = h('select', { class: 'sp-sort', onchange: function () { ui.sort = els.sort.value; renderBody(); sync(); } });
    els.min = h('input', { type: 'number', inputmode: 'numeric', min: '0', class: 'sp-num', oninput: function () { ui.min = els.min.value; renderBody(); } });
    els.max = h('input', { type: 'number', inputmode: 'numeric', min: '0', class: 'sp-num', oninput: function () { ui.max = els.max.value; renderBody(); } });
    els.avail = h('input', { type: 'checkbox', onchange: function () { ui.avail = els.avail.checked; renderBody(); } });
    els.panel = h('div', { class: 'sp-panel', hidden: true });
    els.fbtn = h('button', { class: 'sp-fbtn', type: 'button', 'aria-expanded': 'false', onclick: function () { var o = els.panel.hidden; els.panel.hidden = !o; els.fbtn.setAttribute('aria-expanded', o ? 'true' : 'false'); } });
    els.count = h('span', { class: 'sp-count' });
    els.body = h('div', { class: 'sp-body' });
    els.title = h('h1', {}); els.sub1 = h('p', {});
    els.cartBtn = h('button', { class: 'sh-icon cartbtn', type: 'button', 'data-cart-open': '' }, ico('bag'), h('b', { 'data-cart-count': '', hidden: true }));
    els.reset = h('button', { class: 'btn-link', type: 'button', onclick: function () { ui = { c: ui.c, sub: ui.sub, q: '', sort: 'new', min: '', max: '', avail: false }; els.search.value = ''; syncControls(); renderBody(); sync(); } });
    els.back = h('a', { class: 'back', href: '/' }, ico('pin'), h('span', {}));

    root.append(
      h('header', { class: 'sp-head' },
        h('div', { class: 'sp-bar' }, els.back, h('div', { class: 'sp-actions' }, els.langBtn, els.cartBtn)),
        h('div', { class: 'sp-hero' }, els.title, els.sub1),
        h('div', { class: 'sp-search' }, ico('search'), els.search)),
      h('div', { class: 'sp-tools' }, els.chips, els.sub,
        h('div', { class: 'sp-row' }, els.fbtn, els.sort, els.count),
        els.panel),
      els.body);
    els.panel.append(
      h('div', { class: 'sp-grp' }, h('span', {}, s('price')), h('div', { class: 'sp-range' }, els.min, h('i', {}, '—'), els.max)),
      h('label', { class: 'sp-chk' }, els.avail, h('span', {})), els.reset);

    function applyLang() {
      document.documentElement.lang = lang(); document.documentElement.dir = lang() === 'ar' ? 'rtl' : 'ltr';
      els.langBtn.textContent = lang() === 'ar' ? 'English' : 'عربي';
      document.title = (contact().name || '') + ' — ' + s('shop');
    }
    function syncControls() {
      els.search.placeholder = s('search'); els.title.textContent = s('shop'); els.sub1.textContent = contact().name;
      els.back.querySelector('span').textContent = s('back');
      els.fbtn.textContent = ''; els.fbtn.append(ico('filter'), s('filters'));
      els.sort.textContent = '';
      [['new', 'sNew'], ['low', 'sLow'], ['high', 'sHigh'], ['disc', 'sDisc']].forEach(function (o) { els.sort.append(h('option', { value: o[0] }, s(o[1]))); });
      els.sort.value = ui.sort; els.min.value = ui.min; els.max.value = ui.max; els.avail.checked = ui.avail;
      els.min.placeholder = s('from'); els.max.placeholder = s('to'); els.avail.nextSibling.textContent = s('availOnly'); els.reset.textContent = s('reset');
    }
    function sync() {
      var p = new URLSearchParams(); if (ui.c) p.set('c', ui.c); if (ui.q) p.set('q', ui.q); if (ui.sort !== 'new') p.set('sort', ui.sort);
      try { history.replaceState(history.state, '', location.pathname + (p.toString() ? '?' + p : '')); } catch (e) {}
    }
    function renderChips() {
      var mk = function (label, on, fn) { return h('button', { type: 'button', class: 'sh-chip' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', onclick: fn }, label); };
      els.chips.textContent = ''; var mains = mainCats(); els.chips.hidden = !mains.length;
      els.chips.append(mk(s('all'), !ui.c, function () { ui.c = null; ui.sub = null; renderChips(); renderBody(); sync(); }));
      mains.forEach(function (m) { els.chips.append(mk(nm(m), ui.c === m.id, function () { ui.c = m.id; ui.sub = null; renderChips(); renderBody(); sync(); })); });
      var subs = ui.c ? data.categories.filter(function (c) { return c.parent_id === ui.c; }) : [];
      els.sub.textContent = ''; els.sub.hidden = !subs.length;
      if (subs.length) {
        els.sub.append(mk(s('all'), !ui.sub, function () { ui.sub = null; renderChips(); renderBody(); }));
        subs.forEach(function (c) { els.sub.append(mk(nm(c), ui.sub === c.id, function () { ui.sub = c.id; renderChips(); renderBody(); })); });
      }
    }
    function renderBody() {
      var list = filtered();
      els.count.textContent = loc(String(list.length)) + ' ' + s('results');
      els.body.textContent = '';
      if (!list.length) { els.body.append(h('div', { class: 'sh-empty' }, s('none'))); return; }
      els.body.append(h('div', { class: 'pgrid' }, list.map(function (p) { return card(p, false); })));
    }
    function renderAll() { if (!data) return; applyLang(); syncControls(); renderChips(); renderBody(); updateCartUI(); }

    applyLang(); syncControls();
    els.body.append(h('div', { class: 'sh-empty' }, '…'));
    bindCartButtons();
    onChange(function () {});
    load().then(function (d) {
      if (!d) { els.body.textContent = ''; els.body.append(h('div', { class: 'sh-empty' }, s('errGeneric'))); return; }
      renderAll(); emit();
      if (openId && byId[openId]) openProduct(openId);
    });
  }

  function bindCartButtons() {
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-cart-open]'); if (!b || b.__shopBound) return;
      if (data) { e.preventDefault(); openCart(); }
    });
  }

  window.Shop = { mountHome: mountHome, mountPage: mountPage };
})();
