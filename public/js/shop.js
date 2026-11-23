/* ==========================================================================
   المتجر: كتالوج المنتجات + السلة + إرسال الطلب عبر واتساب
   يعتمد على window.SiteApp (من app.js) وعلى /api/public/catalog
   ========================================================================== */
(function () {
  'use strict';
  var A = window.SiteApp; if (!A) return;
  var CFG = A.CFG;

  var STR = {
    ar: { shop: 'المنتجات والعروض', all: 'الكل', search: 'ابحث عن منتج…', add: 'أضف إلى السلة', addShort: 'أضف', unavailable: 'غير متوفر',
      cart: 'السلة', total: 'الإجمالي', sendOrder: 'أرسل الطلب عبر واتساب', empty: 'السلة فارغة', clear: 'إفراغ السلة', note: 'ملاحظات للطلب (اختياري)',
      none: 'لا توجد منتجات مطابقة.', close: 'إغلاق', featuredT: 'منتجات مميزة', allT: 'كل المنتجات', moreT: 'المزيد من المنتجات', greeting: 'مرحباً، أود طلب المنتجات التالية:',
      noWa: 'الطلب عبر واتساب غير متاح حالياً. يمكنك الاتصال بنا.', viewCart: 'عرض السلة', added: 'أُضيف إلى السلة', qty: 'الكمية', remove: 'إزالة',
      off: 'خصم', items: 'منتج', sent: 'تم تجهيز الطلب في واتساب', featured: 'مميز' },
    en: { shop: 'Products & offers', all: 'All', search: 'Search products…', add: 'Add to cart', addShort: 'Add', unavailable: 'Unavailable',
      cart: 'Cart', total: 'Total', sendOrder: 'Send order on WhatsApp', empty: 'Your cart is empty', clear: 'Clear cart', note: 'Order notes (optional)',
      none: 'No matching products.', close: 'Close', featuredT: 'Featured', allT: 'All products', moreT: 'More products', greeting: 'Hello, I would like to order:',
      noWa: 'WhatsApp ordering is unavailable right now. Please call us.', viewCart: 'View cart', added: 'Added to cart', qty: 'Quantity', remove: 'Remove',
      off: 'off', items: 'items', sent: 'Order prepared in WhatsApp', featured: 'Featured' }
  };
  function s(k) { return (STR[A.lang()] || STR.ar)[k] || STR.ar[k] || k; }

  /* ---------- أدوات ---------- */
  function h(tag, props) {
    var el = document.createElement(tag), kids = Array.prototype.slice.call(arguments, 2), k;
    props = props || {};
    for (k in props) {
      var v = props[k]; if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'hidden') el.hidden = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    (function add(list) { list.forEach(function (c) { if (c === null || c === undefined || c === false) return; if (Array.isArray(c)) return add(c); el.append(c.nodeType ? c : document.createTextNode(String(c))); }); })(kids);
    return el;
  }
  var ICON = {
    bag: '<svg viewBox="0 0 24 24"><path d="M6 7h12l-1 13H7L6 7z"/><path d="M9 7V6a3 3 0 0 1 6 0v1"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    minus: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    wa: '<svg viewBox="0 0 24 24"><path fill="currentColor" stroke="none" d="M20.5 3.5A11 11 0 0 0 3.2 17.1L2 22l5-1.3A11 11 0 1 0 20.5 3.5zM12 20.2a9 9 0 0 1-4.6-1.3l-.3-.2-3 .8.8-2.9-.2-.3A9 9 0 1 1 12 20.2zm5-6.7c-.3-.1-1.6-.8-1.9-.9s-.5-.1-.6.1-.7.9-.9 1.1-.3.2-.6.1a7.4 7.4 0 0 1-3.7-3.2c-.3-.5.3-.5.8-1.5a.5.5 0 0 0 0-.5l-.9-2.1c-.2-.5-.5-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.8 11.8 0 0 0 4.6 4.1c1.7.7 2.4.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.6-.3z"/></svg>',
    img: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-9 9"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
  };
  function ico(n) { var t = document.createElement('template'); t.innerHTML = ICON[n]; return t.content.firstChild; }

  function nm(o) { return (A.lang() === 'en' && o.name_en) ? o.name_en : o.name_ar; }
  function ds(o) { return (A.lang() === 'en' && o.desc_en) ? o.desc_en : o.desc_ar; }
  function currency() {
    var c = (data && data.settings && data.settings.currency_label) || 'د.ع';
    return (A.lang() === 'en' && c === 'د.ع') ? 'IQD' : c;
  }
  function num(n) { return A.loc(String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, A.lang() === 'ar' ? '٬' : ',')); }
  function money(n) { return num(n) + ' ' + currency(); }
  function img(id) { return '/api/img/' + id; }

  /* ---------- الحالة ---------- */
  var data = null, byId = {}, cart = {}, ui = { main: null, sub: null, q: '' };
  var root, els = {}, shopOpen = false, sheetOpen = false;

  function saveCart() { try { localStorage.setItem('cart_v1', JSON.stringify(cart)); } catch (e) {} }
  function loadCart() {
    try { var c = JSON.parse(localStorage.getItem('cart_v1') || '{}'); cart = {}; Object.keys(c).forEach(function (id) { var p = byId[id], q = c[id] | 0; if (p && p.available && q > 0) cart[id] = Math.min(q, 99); }); } catch (e) { cart = {}; }
  }
  function cartCount() { return Object.keys(cart).reduce(function (n, id) { return n + cart[id]; }, 0); }
  function cartTotal() { return Object.keys(cart).reduce(function (n, id) { return n + byId[id].price * cart[id]; }, 0); }

  /* ---------- تحميل الكتالوج ---------- */
  function load() {
    fetch('/api/public/catalog', { credentials: 'omit' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d) return;
      data = d; byId = {}; d.products.forEach(function (p) { byId[p.id] = p; });
      A.applySettings(d.settings);
      loadCart();
      if (d.products.length) { document.getElementById('shopBtn').hidden = false; refreshButton(); }
    }).catch(function () { /* الموقع يعمل دون المتجر */ });
  }
  function refreshButton() {
    document.getElementById('shopLabel').textContent = s('shop');
    var b = document.getElementById('shopCount'), n = cartCount();
    b.hidden = !n; b.textContent = A.loc(String(n));
  }

  /* ---------- بناء الواجهة ---------- */
  function build() {
    if (root) return;
    els.close = h('button', { class: 'sh-icon', type: 'button', onclick: closeShop }, ico('x'));
    els.title = h('h2', { class: 'sh-title' });
    els.cartBtn = h('button', { class: 'sh-icon cartbtn', type: 'button', onclick: openCart }, ico('bag'), h('b', { hidden: true }));
    els.search = h('input', { type: 'search', class: 'sh-search-in', autocomplete: 'off', oninput: function () { ui.q = els.search.value.trim(); renderBody(); } });
    els.chips = h('div', { class: 'chips', role: 'tablist' });
    els.sub = h('div', { class: 'chips sub' });
    els.body = h('div', { class: 'sh-body' });
    els.bar = h('button', { class: 'cartbar', type: 'button', hidden: true, onclick: openCart });
    els.sheet = h('div', { class: 'sh-sheet' });
    els.sheetBg = h('div', { class: 'sh-sheet-bg', hidden: true, onclick: function (e) { if (e.target === els.sheetBg) closeSheet(); } }, els.sheet);
    root = h('div', { class: 'shop', role: 'dialog', 'aria-modal': 'true', hidden: true },
      h('div', { class: 'shop-panel' },
        h('div', { class: 'sh-head' }, els.close, els.title, els.cartBtn),
        h('div', { class: 'sh-search' }, ico('search'), els.search),
        els.chips, els.sub, els.body, els.bar),
      els.sheetBg);
    document.body.append(root);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && shopOpen) { if (sheetOpen) closeSheet(); else closeShop(); } });
  }

  function renderStatic() {
    els.title.textContent = s('shop');
    els.close.setAttribute('aria-label', s('close')); els.cartBtn.setAttribute('aria-label', s('cart'));
    els.search.placeholder = s('search'); els.search.setAttribute('aria-label', s('search'));
    root.setAttribute('aria-label', s('shop'));
    var n = cartCount(), b = els.cartBtn.querySelector('b'); b.hidden = !n; b.textContent = A.loc(String(n));
  }

  function renderChips() {
    var mains = data.categories.filter(function (c) { return c.parent_id === null; });
    els.chips.textContent = '';
    var mk = function (label, on, fn) { return h('button', { type: 'button', class: 'sh-chip' + (on ? ' on' : ''), role: 'tab', 'aria-selected': on ? 'true' : 'false', onclick: fn }, label); };
    els.chips.append(mk(s('all'), !ui.main, function () { ui.main = null; ui.sub = null; renderChips(); renderBody(); }));
    mains.forEach(function (m) { els.chips.append(mk(nm(m), ui.main === m.id, function () { ui.main = m.id; ui.sub = null; renderChips(); renderBody(); })); });
    els.chips.hidden = mains.length === 0;
    var subs = ui.main ? data.categories.filter(function (c) { return c.parent_id === ui.main; }) : [];
    els.sub.textContent = ''; els.sub.hidden = !subs.length;
    if (subs.length) {
      els.sub.append(mk(s('all'), !ui.sub, function () { ui.sub = null; renderChips(); renderBody(); }));
      subs.forEach(function (c) { els.sub.append(mk(nm(c), ui.sub === c.id, function () { ui.sub = c.id; renderChips(); renderBody(); })); });
    }
  }

  function inFilter(p) {
    if (ui.sub) return p.category_id === ui.sub;
    if (ui.main) {
      if (p.category_id === ui.main) return true;
      return data.categories.some(function (c) { return c.id === p.category_id && c.parent_id === ui.main; });
    }
    return true;
  }
  function matchQ(p) { return !ui.q || (p.name_ar + ' ' + p.name_en).toLowerCase().indexOf(ui.q.toLowerCase()) > -1; }

  function card(p, compact) {
    var disc = p.old_price && p.old_price > p.price ? Math.round((p.old_price - p.price) / p.old_price * 100) : 0;
    var pic = p.images[0] ? h('img', { src: img(p.images[0]), alt: '', loading: 'lazy', decoding: 'async' }) : h('span', { class: 'noimg' }, ico('img'));
    return h('article', { class: 'pcard' + (compact ? ' compact' : '') + (p.available ? '' : ' off') },
      h('button', { class: 'pimg', type: 'button', 'aria-label': nm(p), onclick: function () { openProduct(p.id); } }, pic,
        p.featured ? h('span', { class: 'pstar', title: s('featured') }, '★') : null,
        disc ? h('span', { class: 'pdisc' }, '-' + A.loc(String(disc)) + '٪') : null),
      h('div', { class: 'pinfo' },
        h('button', { class: 'pname', type: 'button', onclick: function () { openProduct(p.id); } }, nm(p)),
        h('div', { class: 'pbottom' },
          h('div', { class: 'pprice' }, h('b', {}, money(p.price)), p.old_price && p.old_price > p.price ? h('s', {}, num(p.old_price)) : null),
          p.available ? h('button', { class: 'padd', type: 'button', 'aria-label': s('add') + ': ' + nm(p), onclick: function () { addToCart(p.id, 1); } }, ico('plus'))
                      : h('span', { class: 'poff' }, s('unavailable')))));
  }

  function renderBody() {
    var list = data.products.filter(function (p) { return inFilter(p) && matchQ(p); });
    els.body.textContent = '';
    if (!list.length) { els.body.append(h('div', { class: 'sh-empty' }, s('none'))); return; }
    var plain = !ui.main && !ui.sub && !ui.q, feat = plain ? list.filter(function (p) { return p.featured && p.available; }) : [];
    var rest = feat.length ? list.filter(function (p) { return feat.indexOf(p) < 0; }) : list;
    if (feat.length) {
      els.body.append(h('h3', { class: 'sh-h' }, '★ ' + s('featuredT')), h('div', { class: 'hscroll' }, feat.map(function (p) { return card(p, true); })));
      if (rest.length) els.body.append(h('h3', { class: 'sh-h' }, s('moreT')));
    }
    if (rest.length) els.body.append(h('div', { class: 'pgrid' }, rest.map(function (p) { return card(p, false); })));
  }

  function renderBar() {
    var n = cartCount();
    els.bar.hidden = !n;
    if (n) { els.bar.textContent = ''; els.bar.append(h('span', { class: 'cb-n' }, A.loc(String(n))), h('span', { class: 'cb-t' }, s('viewCart')), h('b', {}, money(cartTotal()))); }
    renderStatic(); refreshButton();
  }

  function renderAll() { if (!root) return; renderStatic(); renderChips(); renderBody(); renderBar(); }

  /* ---------- فتح/إغلاق ---------- */
  function openShop() {
    if (!data) return; build(); renderAll();
    root.hidden = false; shopOpen = true; document.body.classList.add('shop-open');
    var app = document.getElementById('app'); if (app && 'inert' in app) app.inert = true;
    try { history.pushState({ shop: 1 }, ''); } catch (e) {}
    setTimeout(function () { els.close.focus(); }, 30);
  }
  function hideAll() {
    if (!root) return;
    root.hidden = true; els.sheetBg.hidden = true; shopOpen = false; sheetOpen = false; document.body.classList.remove('shop-open');
    var app = document.getElementById('app'); if (app && 'inert' in app) app.inert = false;
    var b = document.getElementById('shopBtn'); if (b) b.focus();
  }
  function closeShop() { if (history.state && (history.state.shop)) history.back(); else hideAll(); }
  function showSheet(content) {
    els.sheet.textContent = ''; els.sheet.append(content); els.sheetBg.hidden = false;
    if (!sheetOpen) { sheetOpen = true; try { history.pushState({ shop: 2 }, ''); } catch (e) {} }
    var f = els.sheet.querySelector('button, input, textarea'); if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 30);
  }
  function closeSheet() { if (history.state && history.state.shop === 2) history.back(); else hideSheet(); }
  function hideSheet() { if (!root) return; els.sheetBg.hidden = true; sheetOpen = false; }
  window.addEventListener('popstate', function () {
    var st = history.state;
    if (!shopOpen) return;
    if (!st || !st.shop) hideAll(); else if (st.shop === 1 && sheetOpen) hideSheet();
  });

  /* ---------- السلة ---------- */
  function addToCart(id, q) {
    var p = byId[id]; if (!p || !p.available) return;
    cart[id] = Math.min(99, (cart[id] || 0) + q); saveCart(); A.track('cart_add', id); renderBar();
    A.toast(s('added'), 1400);
  }
  function setQty(id, q) { if (q <= 0) delete cart[id]; else cart[id] = Math.min(99, q); saveCart(); renderBar(); }

  function stepper(get, set) {
    var out = h('output', { class: 'qv', 'aria-live': 'polite' }, A.loc(String(get())));
    var upd = function () { out.textContent = A.loc(String(get())); };
    return h('div', { class: 'stepper', role: 'group', 'aria-label': s('qty') },
      h('button', { type: 'button', 'aria-label': '-', onclick: function () { set(get() - 1); upd(); } }, ico('minus')), out,
      h('button', { type: 'button', 'aria-label': '+', onclick: function () { set(get() + 1); upd(); } }, ico('plus')));
  }

  function openProduct(id) {
    var p = byId[id]; if (!p) return; A.track('product', id);
    var q = 1, disc = p.old_price && p.old_price > p.price;
    var gallery = p.images.length
      ? h('div', { class: 'gallery', tabindex: '0', 'aria-label': nm(p) }, p.images.map(function (i) { return h('img', { src: img(i), alt: nm(p), loading: 'lazy' }); }))
      : h('div', { class: 'gallery none' }, h('span', { class: 'noimg' }, ico('img')));
    var addBtn = h('button', { type: 'button', class: 'btn-go', onclick: function () { addToCart(id, q); closeSheet(); } });
    var upd = function () { addBtn.textContent = s('add') + ' · ' + money(p.price * q); };
    upd();
    var content = h('div', { class: 'pd' },
      h('button', { class: 'sh-icon sheet-x', type: 'button', 'aria-label': s('close'), onclick: closeSheet }, ico('x')),
      gallery,
      h('div', { class: 'pd-body' },
        h('h3', {}, nm(p), p.featured ? h('span', { class: 'pstar inline' }, '★') : null),
        h('div', { class: 'pd-price' }, h('b', {}, money(p.price)), disc ? h('s', {}, num(p.old_price)) : null),
        ds(p) ? h('p', { class: 'pd-desc' }, ds(p)) : null,
        p.available ? h('div', { class: 'pd-row' }, stepper(function () { return q; }, function (v) { q = Math.max(1, Math.min(99, v)); upd(); }), addBtn)
                    : h('div', { class: 'poff big' }, s('unavailable'))));
    showSheet(content);
  }

  function openCart() {
    var ids = Object.keys(cart), content;
    var note = h('textarea', { class: 'cart-note', rows: '2', maxlength: '300', placeholder: s('note'), 'aria-label': s('note') });
    if (!ids.length) {
      content = h('div', { class: 'cart' }, h('div', { class: 'cart-head' }, h('h3', {}, s('cart')), h('button', { class: 'sh-icon', type: 'button', 'aria-label': s('close'), onclick: closeSheet }, ico('x'))), h('div', { class: 'sh-empty' }, s('empty')));
      return showSheet(content);
    }
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
    var wa = (CFG.business.whatsapp || '').replace(/\D/g, '');
    var send = h('button', { type: 'button', class: 'btn-go wa', onclick: function () {
      var G = (data.settings && data.settings.order_greeting) || s('greeting');
      var lines = [G, ''];
      Object.keys(cart).forEach(function (id) { var p = byId[id]; lines.push('• ' + nm(p) + ' × ' + A.loc(String(cart[id])) + ' — ' + money(p.price * cart[id])); });
      lines.push('', s('total') + ': ' + money(cartTotal()));
      if (note.value.trim()) lines.push('', note.value.trim());
      A.track('order');
      window.open('https://wa.me/' + wa + '?text=' + encodeURIComponent(lines.join('\n')), '_blank', 'noopener');
      A.toast(s('sent'), 2500);
    } }, ico('wa'), s('sendOrder'));
    content = h('div', { class: 'cart' },
      h('div', { class: 'cart-head' }, h('h3', {}, s('cart')), h('button', { class: 'sh-icon', type: 'button', 'aria-label': s('close'), onclick: closeSheet }, ico('x'))),
      listEl, note,
      h('div', { class: 'cart-total' }, h('span', {}, s('total')), totalEl),
      wa ? send : h('p', { class: 'cart-warn' }, s('noWa')),
      h('button', { class: 'btn-link', type: 'button', onclick: function () { cart = {}; saveCart(); renderBar(); closeSheet(); } }, s('clear')));
    showSheet(content); redraw();
  }

  /* ---------- ربط ---------- */
  document.getElementById('shopBtn').addEventListener('click', openShop);
  document.addEventListener('sitelangchange', function () {
    if (data) { refreshButton(); if (shopOpen) { renderAll(); if (sheetOpen) hideSheet(); } }
  });
  load();
})();
