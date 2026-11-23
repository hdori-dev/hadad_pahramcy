'use strict';
(function () {
  /* ================= أدوات ================= */
  const $ = (s, r = document) => r.querySelector(s);
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (['checked', 'value', 'disabled', 'selected'].includes(k)) el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat(Infinity)) { if (kid === null || kid === undefined || kid === false) continue; el.append(kid.nodeType ? kid : document.createTextNode(String(kid))); }
    return el;
  }
  const ICONS = {
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    img: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-9 9"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="m15 6-6 6 6 6"/></svg>',
    right: '<svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>'
  };
  const ico = n => { const t = document.createElement('template'); t.innerHTML = ICONS[n]; return t.content.firstChild; };
  const AR = '٠١٢٣٤٥٦٧٨٩';
  const nf = n => String(n).replace(/\d/g, d => AR[d]);
  const money = n => nf(Number(n).toLocaleString('en-US')).replace(/,/g, '٬');
  const imgUrl = id => '/api/img/' + id;

  let toastT;
  function toast(msg, bad) {
    const t = $('#toast'); t.textContent = msg; t.classList.toggle('bad', !!bad); t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600);
  }

  async function api(path, { method = 'GET', body, raw, type } = {}) {
    const opt = { method, credentials: 'same-origin', headers: {} };
    if (raw) { opt.body = raw; opt.headers['content-type'] = type; }
    else if (body !== undefined) { opt.body = JSON.stringify(body); opt.headers['content-type'] = 'application/json'; }
    let res;
    try { res = await fetch(path, opt); } catch { throw new Error('تعذّر الاتصال بالخادم. تحقق من الإنترنت.'); }
    let data = null; try { data = await res.json(); } catch { /* لا جسم */ }
    if (res.status === 401 && data && data.code === 'unauthenticated') { showLogin(); throw new Error('انتهت الجلسة، سجّل الدخول من جديد.'); }
    if (!res.ok) { const e = new Error((data && data.error) || 'حدث خطأ غير متوقع'); e.code = data && data.code; e.status = res.status; throw e; }
    return data;
  }

  /* ================= نوافذ ================= */
  function openModal({ title, small, body, buttons = [], persistent = false }) {
    const root = $('#modalRoot');
    const bg = h('div', { class: 'modal-bg', role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
    const close = () => { bg.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    const m = h('div', { class: 'modal' + (small ? ' small' : '') },
      h('div', { class: 'modal-head' }, h('h3', { text: title }), h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'إغلاق', onclick: close }, ico('x'))),
      h('div', { class: 'modal-body' }, body),
      buttons.length ? h('div', { class: 'modal-foot' }, buttons) : null);
    bg.append(m);
    if (!persistent) bg.addEventListener('mousedown', e => { if (e.target === bg) close(); });
    root.append(bg);
    const first = m.querySelector('input,select,textarea'); if (first) setTimeout(() => first.focus(), 30);
    return close;
  }
  function confirmBox(message, okText = 'حذف') {
    return new Promise(resolve => {
      let done = false;
      const fin = v => { if (!done) { done = true; resolve(v); } };
      const close = openModal({
        title: 'تأكيد', small: true, body: h('p', { text: message }),
        buttons: [
          h('button', { class: 'btn', type: 'button', onclick: () => { close(); fin(false); } }, 'إلغاء'),
          h('button', { class: 'btn danger', type: 'button', onclick: () => { close(); fin(true); } }, okText)]
      });
    });
  }

  /* ================= تسجيل الدخول ================= */
  let gsiPromise;
  const loadGsi = () => gsiPromise ||= new Promise((res, rej) => {
    const s = h('script', { src: 'https://accounts.google.com/gsi/client', async: true, defer: true });
    s.onload = res; s.onerror = () => { gsiPromise = null; rej(new Error('تعذّر تحميل خدمة Google. تحقق من الإنترنت.')); };
    document.head.append(s);
  });
  const loginErr = msg => { const e = $('#loginErr'); e.textContent = msg || ''; e.hidden = !msg; };

  async function showLogin(keepErr) {
    $('#app').hidden = true; $('#login').hidden = false;
    $('#step2').hidden = true; $('#step1').hidden = false;
    if (!keepErr) loginErr('');
    $('#cfgErr').hidden = true;
    try {
      const { nonce, clientId } = await api('/api/admin/nonce');
      if (!clientId || /ضع-معرّف/.test(clientId)) { $('#cfgErr').textContent = 'لم يُضبط GOOGLE_CLIENT_ID بعد (راجع README).'; $('#cfgErr').hidden = false; return; }
      await loadGsi();
      google.accounts.id.initialize({ client_id: clientId, nonce, callback: onCredential, ux_mode: 'popup', auto_select: false });
      const box = $('#gbtn'); box.textContent = '';
      google.accounts.id.renderButton(box, { type: 'standard', theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', width: 300, locale: 'ar' });
    } catch (e) { loginErr(e.message); }
  }
  async function onCredential(resp) {
    try {
      const r = await api('/api/admin/google', { method: 'POST', body: { credential: resp.credential } });
      loginErr(''); $('#step1').hidden = true; $('#step2').hidden = false;
      $('#whoEmail').textContent = r.email; $('#keyInput').value = ''; setTimeout(() => $('#keyInput').focus(), 30);
    } catch (e) { await showLogin(true); loginErr(e.message); }
  }
  $('#step2').addEventListener('submit', async ev => {
    ev.preventDefault();
    const btn = $('#keyBtn'); btn.disabled = true;
    try { await api('/api/admin/key', { method: 'POST', body: { key: $('#keyInput').value } }); loginErr(''); $('#keyInput').value = ''; await boot(); }
    catch (e) {
      if (e.code === 'pre_missing') { await showLogin(true); loginErr(e.message); }
      else { loginErr(e.message); $('#keyInput').value = ''; $('#keyInput').focus(); }
    } finally { btn.disabled = false; }
  });
  $('#backBtn').addEventListener('click', () => showLogin());
  $('#logoutBtn').addEventListener('click', async () => { try { await api('/api/admin/logout', { method: 'POST' }); } catch {} showLogin(); });

  /* ================= الهيكل والتنقل ================= */
  const state = { cats: [], statDays: 7, pf: { q: '', category: '', featured: false } };
  const VIEWS = { overview: ['نظرة عامة', viewOverview], products: ['المنتجات', viewProducts], categories: ['الأقسام', viewCategories], settings: ['الإعدادات', viewSettings] };

  async function boot() {
    const me = await api('/api/admin/me');
    $('#meEmail').textContent = me.email;
    $('#login').hidden = true; $('#app').hidden = false;
    route();
  }
  function route() {
    const name = VIEWS[location.hash.slice(1)] ? location.hash.slice(1) : 'overview';
    document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.view === name));
    $('#pageTitle').textContent = VIEWS[name][0]; $('#headActions').textContent = '';
    const v = $('#view'); v.textContent = ''; for (let i = 0; i < 3; i++) v.append(h('div', { class: 'skeleton' }));
    VIEWS[name][1]().catch(e => { v.textContent = ''; v.append(h('div', { class: 'err', text: e.message })); });
  }
  $('#nav').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { if (location.hash.slice(1) === b.dataset.view) route(); else location.hash = b.dataset.view; } });
  window.addEventListener('hashchange', () => { if (!$('#app').hidden) route(); });

  async function loadCats() { state.cats = (await api('/api/admin/categories')).categories; return state.cats; }
  const mains = () => state.cats.filter(c => c.parent_id === null);
  const subsOf = id => state.cats.filter(c => c.parent_id === id);
  const catPath = id => { const c = state.cats.find(x => x.id === id); if (!c) return ''; const p = c.parent_id ? state.cats.find(x => x.id === c.parent_id) : null; return p ? p.name_ar + ' ‹ ' + c.name_ar : c.name_ar; };
  function catSelect(sel, { allLabel, includeMainOnlyHint = true } = {}) {
    sel.textContent = '';
    sel.append(h('option', { value: '', text: allLabel }));
    for (const m of mains()) {
      const g = h('optgroup', { label: m.name_ar });
      g.append(h('option', { value: m.id, text: m.name_ar + (subsOf(m.id).length && includeMainOnlyHint ? ' (عام)' : '') }));
      for (const s of subsOf(m.id)) g.append(h('option', { value: s.id, text: '↳ ' + s.name_ar }));
      sel.append(g);
    }
    return sel;
  }

  /* ================= نظرة عامة ================= */
  const SRC = { direct: 'مباشر', ig: 'إنستغرام', qr: 'رمز QR', wa: 'واتساب', fb: 'فيسبوك', tg: 'تيليغرام' };
  async function viewOverview() {
    const draw = async () => {
      const s = await api('/api/admin/stats?days=' + state.statDays);
      const v = $('#view'); v.textContent = '';
      const T = s.totals;
      v.append(
        h('div', { class: 'stats' },
          stat('زيارات الصفحة', T.view, 'p'), stat('ضغطات الاتصال', T.call, 'b'), stat('ضغطات واتساب', T.whatsapp, 'b'),
          stat('طلبات الوصول', T.navigate, 'p'), stat('طلبات من السلة', T.order, 'p')),
        h('div', { class: 'cols' },
          h('div', { class: 'card' }, h('h3', { text: 'الزيارات اليومية' }), chart(s.daily)),
          h('div', { class: 'card' }, h('h3', { text: 'مصدر الزيارات' }), bars(s.sources.map(x => [SRC[x.s] || x.s, x.n])))),
        h('div', { class: 'card', style: null }, h('h3', { text: 'أكثر المنتجات اهتماماً' }),
          s.topProducts.length ? s.topProducts.map(p => h('div', { class: 'bar-row' }, h('span', { class: 'nm', text: p.name || '—' }), h('span', { class: 'muted', text: nf(p.views) + ' مشاهدة · ' + nf(p.adds) + ' إضافة للسلة' }))) : h('div', { class: 'empty', text: 'لا توجد بيانات بعد.' })),
        h('div', { class: 'hint', text: 'لمعرفة من أين يأتي زبائنك: ضع في بايو إنستغرام الرابط الذي ينتهي بـ ?src=ig، وعلى ستاند الطاولة رمز QR الخاص به ?src=qr. تجدهما جاهزين في «الإعدادات».' }));
    };
    const seg = h('div', { class: 'seg' }, [[7, '7 أيام'], [30, '30 يوماً'], [90, '90 يوماً']].map(([d, l]) =>
      h('button', { type: 'button', class: state.statDays === d ? 'on' : '', onclick: async ev => { state.statDays = d; seg.querySelectorAll('button').forEach(b => b.classList.remove('on')); ev.currentTarget.classList.add('on'); await draw(); } }, nf(l))));
    $('#headActions').append(seg);
    await draw();
  }
  const stat = (k, v, cls) => h('div', { class: 'stat ' + cls }, h('div', { class: 'k', text: k }), h('div', { class: 'v', text: nf(v || 0) }));
  function bars(rows) {
    if (!rows.length) return h('div', { class: 'empty', text: 'لا توجد بيانات بعد.' });
    const max = Math.max(...rows.map(r => r[1]));
    return rows.map(([n, c]) => h('div', { class: 'bar-row' }, h('span', { class: 'nm', text: n }), h('span', { class: 'tr' }, (() => { const i = h('i'); i.style.width = Math.max(4, c / max * 100) + '%'; return i; })()), h('span', { class: 'n', text: nf(c) })));
  }
  function chart(daily) {
    const NS = 'http://www.w3.org/2000/svg', W = 600, H = 170, pad = 22;
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'chart'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'مخطط الزيارات اليومية');
    const max = Math.max(1, ...daily.map(d => d.views)), n = daily.length, bw = (W / n), gap = Math.min(6, bw * .25);
    daily.forEach((d, i) => {
      const x = W - (i + 1) * bw + gap / 2, hh = Math.max(d.views ? 3 : 1.5, (H - pad - 8) * d.views / max);
      const r = document.createElementNS(NS, 'rect');
      for (const [k, v] of Object.entries({ x, y: H - pad - hh, width: Math.max(2, bw - gap), height: hh, rx: Math.min(5, bw / 3), fill: d.views ? '#1A8F83' : '#E3E9F0' })) r.setAttribute(k, v);
      const t = document.createElementNS(NS, 'title'); t.textContent = d.day + ' : ' + nf(d.views); r.append(t); svg.append(r);
    });
    [[0, daily[0]], [n - 1, daily[n - 1]]].forEach(([i, d], j) => {
      const t = document.createElementNS(NS, 'text'); t.setAttribute('x', j === 0 ? W - 2 : 2); t.setAttribute('y', H - 5); t.setAttribute('text-anchor', j === 0 ? 'end' : 'start'); t.setAttribute('font-size', '20'); t.setAttribute('fill', '#667689'); t.textContent = nf(d.day.slice(5)); svg.append(t);
    });
    return svg;
  }

  /* ================= المنتجات ================= */
  async function viewProducts() {
    await loadCats();
    const add = h('button', { class: 'btn primary', type: 'button', onclick: () => productModal() }, ico('plus'), 'منتج جديد');
    $('#headActions').append(add);
    const v = $('#view'); v.textContent = '';
    const q = h('input', { type: 'search', placeholder: 'ابحث باسم المنتج…', value: state.pf.q, 'aria-label': 'بحث' });
    const sel = catSelect(h('select', { 'aria-label': 'القسم' }), { allLabel: 'كل الأقسام', includeMainOnlyHint: false }); sel.value = state.pf.category;
    const fb = h('button', { class: 'chipbtn' + (state.pf.featured ? ' on' : ''), type: 'button' }, '★ المميزة فقط');
    const list = h('div', { class: 'plist' });
    v.append(h('div', { class: 'toolbar' }, q, sel, fb), list);
    let t; const reload = () => loadProducts(list);
    q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { state.pf.q = q.value; reload(); }, 250); });
    sel.addEventListener('change', () => { state.pf.category = sel.value; reload(); });
    fb.addEventListener('click', () => { state.pf.featured = !state.pf.featured; fb.classList.toggle('on', state.pf.featured); reload(); });
    await reload();
  }
  async function loadProducts(list) {
    const p = new URLSearchParams(); if (state.pf.q) p.set('q', state.pf.q); if (state.pf.category) p.set('category', state.pf.category); if (state.pf.featured) p.set('featured', '1');
    const { products } = await api('/api/admin/products?' + p);
    list.textContent = '';
    if (!products.length) { list.append(h('div', { class: 'card empty' }, state.pf.q || state.pf.category || state.pf.featured ? 'لا توجد منتجات مطابقة.' : 'لا توجد منتجات بعد. اضغط «منتج جديد» للبدء.')); return; }
    for (const pr of products) list.append(prow(pr, list));
  }
  function prow(p, list) {
    const th = p.images[0] ? h('img', { class: 'thumb', src: imgUrl(p.images[0]), alt: '', loading: 'lazy' }) : h('div', { class: 'thumb none' }, ico('img'));
    const refresh = () => loadProducts(list);
    const sw = h('input', { type: 'checkbox', checked: !!p.available, 'aria-label': 'متوفر' });
    sw.addEventListener('change', async () => { try { await api('/api/admin/products/' + p.id, { method: 'PATCH', body: { available: sw.checked } }); toast(sw.checked ? 'أصبح متوفراً' : 'أصبح غير متوفر'); refresh(); } catch (e) { sw.checked = !sw.checked; toast(e.message, true); } });
    return h('div', { class: 'prow' }, th,
      h('div', {},
        h('div', { class: 'nm' }, p.name_ar, p.featured ? h('span', { class: 'badge feat', text: '★ مميز' }) : null, !p.available ? h('span', { class: 'badge off', text: 'غير متوفر' }) : null),
        h('div', { class: 'meta' }, h('span', { class: 'price' }, money(p.price) + ' د.ع', p.old_price ? h('s', { text: money(p.old_price) }) : null), p.category_id ? h('span', { class: 'badge cat', text: catPath(p.category_id) }) : null)),
      h('div', { class: 'acts' },
        h('label', { class: 'switch', title: 'متوفر' }, sw, h('i')),
        h('button', { class: 'icon-btn star' + (p.featured ? ' on' : ''), type: 'button', title: 'مميز', 'aria-label': 'تبديل مميز', onclick: async () => { try { await api('/api/admin/products/' + p.id, { method: 'PATCH', body: { featured: !p.featured } }); refresh(); } catch (e) { toast(e.message, true); } } }, ico('star')),
        h('button', { class: 'icon-btn', type: 'button', title: 'تعديل', 'aria-label': 'تعديل', onclick: () => productModal(p, refresh) }, ico('edit')),
        h('button', { class: 'icon-btn danger', type: 'button', title: 'حذف', 'aria-label': 'حذف', onclick: async () => { if (await confirmBox(`حذف «${p.name_ar}» نهائياً مع صوره؟`)) { try { await api('/api/admin/products/' + p.id, { method: 'DELETE' }); toast('تم الحذف'); refresh(); } catch (e) { toast(e.message, true); } } } }, ico('trash'))));
  }

  async function compress(file) {
    let bmp; try { bmp = await createImageBitmap(file); } catch { throw new Error('تعذّرت قراءة الصورة. استخدم JPG أو PNG أو WebP.'); }
    const sc = Math.min(1, 1000 / Math.max(bmp.width, bmp.height)), w = Math.round(bmp.width * sc), hh = Math.round(bmp.height * sc);
    const c = h('canvas'); c.width = w; c.height = hh; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, hh); g.drawImage(bmp, 0, 0, w, hh);
    let blob = await new Promise(r => c.toBlob(r, 'image/webp', 0.82));
    if (!blob || blob.type !== 'image/webp') blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.86));
    return blob;
  }

  function productModal(p, done) {
    const isNew = !p; p = p || { name_ar: '', name_en: '', desc_ar: '', desc_en: '', price: '', old_price: '', category_id: null, featured: 0, available: 1, images: [] };
    let images = [...p.images];
    const f = {
      name_ar: h('input', { type: 'text', value: p.name_ar, maxlength: 140, required: true }),
      name_en: h('input', { type: 'text', value: p.name_en, maxlength: 140, dir: 'ltr' }),
      price: h('input', { type: 'number', min: 0, step: 250, inputmode: 'numeric', value: p.price ?? '' }),
      old_price: h('input', { type: 'number', min: 0, step: 250, inputmode: 'numeric', value: p.old_price ?? '' }),
      cat: catSelect(h('select'), { allLabel: '— بدون قسم —' }),
      desc_ar: h('textarea', { maxlength: 1500, value: p.desc_ar }),
      featured: h('input', { type: 'checkbox', checked: !!p.featured }),
      available: h('input', { type: 'checkbox', checked: !!p.available })
    };
    f.cat.value = p.category_id ?? '';
    const grid = h('div', { class: 'imgs' });
    const picker = h('input', { type: 'file', accept: 'image/*', multiple: true });
    const addBox = h('label', { class: 'addimg' }, h('span', {}, ico('plus'), 'أضف صورة'), picker);
    const renderImgs = () => {
      grid.textContent = '';
      images.forEach((id, i) => grid.append(h('div', { class: 'imgbox' + (i === 0 ? ' main' : '') },
        h('img', { src: imgUrl(id), alt: '' }), i === 0 ? h('span', { class: 'tag', text: 'الرئيسية' }) : null,
        h('div', { class: 'ctl' },
          i > 0 ? h('button', { type: 'button', title: 'اجعلها الرئيسية', 'aria-label': 'اجعلها الرئيسية', onclick: () => { images.unshift(images.splice(i, 1)[0]); renderImgs(); } }, ico('star')) : h('span'),
          h('button', { type: 'button', class: 'del', title: 'إزالة', 'aria-label': 'إزالة الصورة', onclick: () => { images.splice(i, 1); renderImgs(); } }, ico('trash'))))));
      if (images.length < 5) grid.append(addBox);
    };
    picker.addEventListener('change', async () => {
      const files = [...picker.files].slice(0, 5 - images.length); picker.value = '';
      for (const file of files) {
        const ph = h('div', { class: 'imgbox busy' }); grid.insertBefore(ph, addBox);
        try { const blob = await compress(file); const r = await api('/api/admin/upload', { method: 'POST', raw: blob, type: blob.type }); images.push(r.id); }
        catch (e) { toast(e.message, true); }
        ph.remove(); renderImgs();
      }
    });
    renderImgs();

    const body = h('form', { id: 'pform', onsubmit: e => e.preventDefault() },
      h('div', { class: 'field' }, h('span', { text: 'صور المنتج (حتى 5، الأولى هي الرئيسية)' }), grid),
      h('div', { class: 'grid2' },
        h('label', { class: 'field' }, h('span', { text: 'اسم المنتج *' }), f.name_ar),
        h('label', { class: 'field' }, h('span', { text: 'الاسم بالإنجليزية (اختياري)' }), f.name_en),
        h('label', { class: 'field' }, h('span', { text: 'السعر (د.ع)' }), f.price),
        h('label', { class: 'field' }, h('span', { text: 'السعر قبل الخصم (اختياري)' }), f.old_price, h('small', { text: 'إن وُضع أعلى من السعر يظهر مشطوباً مع نسبة الخصم.' }))),
      h('label', { class: 'field' }, h('span', { text: 'القسم' }), f.cat),
      h('label', { class: 'field' }, h('span', { text: 'الوصف' }), f.desc_ar),
      h('div', { class: 'grid2' },
        h('label', { class: 'check' }, f.featured, '★ منتج مميز (يظهر أولاً)'),
        h('label', { class: 'check' }, f.available, 'متوفر')));

    const save = h('button', { class: 'btn primary', type: 'button' }, isNew ? 'إضافة المنتج' : 'حفظ التعديلات');
    const close = openModal({ title: isNew ? 'منتج جديد' : 'تعديل المنتج', body, persistent: true, buttons: [h('button', { class: 'btn', type: 'button', onclick: () => close() }, 'إلغاء'), save] });
    save.addEventListener('click', async () => {
      if (!f.name_ar.value.trim()) { f.name_ar.focus(); toast('اسم المنتج مطلوب', true); return; }
      save.disabled = true;
      const payload = { name_ar: f.name_ar.value, name_en: f.name_en.value, desc_ar: f.desc_ar.value, price: f.price.value === '' ? 0 : Number(f.price.value), old_price: f.old_price.value === '' ? null : Number(f.old_price.value), category_id: f.cat.value === '' ? null : Number(f.cat.value), featured: f.featured.checked, available: f.available.checked, images };
      try { await api(isNew ? '/api/admin/products' : '/api/admin/products/' + p.id, { method: isNew ? 'POST' : 'PUT', body: payload }); close(); toast(isNew ? 'تمت إضافة المنتج' : 'تم الحفظ'); if (done) done(); else route(); }
      catch (e) { toast(e.message, true); save.disabled = false; }
    });
  }

  /* ================= الأقسام ================= */
  async function viewCategories() {
    await loadCats();
    $('#headActions').append(h('button', { class: 'btn primary', type: 'button', onclick: () => catModal(null, null) }, ico('plus'), 'قسم رئيسي'));
    const v = $('#view'); v.textContent = '';
    if (!mains().length) { v.append(h('div', { class: 'card empty', text: 'لا توجد أقسام. ابدأ بإضافة قسم رئيسي مثل «أدوية» أو «مستحضرات تجميل».' })); return; }
    const tree = h('div', { class: 'tree' });
    mains().forEach((m, mi, arr) => {
      const box = h('div', { class: 'cat-main' + (m.active ? '' : ' inactive') }, catLine(m, arr, mi));
      const subs = subsOf(m.id);
      subs.forEach((s, si) => box.append(h('div', { class: 'cat-sub' + (s.active ? '' : ' inactive') }, catLine(s, subs, si))));
      box.append(h('div', { class: 'cat-add' }, h('button', { class: 'btn sm', type: 'button', onclick: () => catModal(null, m.id) }, ico('plus'), 'قسم فرعي')));
      tree.append(box);
    });
    v.append(tree);
  }
  function catLine(c, siblings, idx) {
    const move = async d => {
      const ids = siblings.map(x => x.id); const j = idx + d; [ids[idx], ids[j]] = [ids[j], ids[idx]];
      try { await api('/api/admin/categories/reorder', { method: 'POST', body: { ids } }); route(); } catch (e) { toast(e.message, true); }
    };
    return h('div', { class: 'cat-line' },
      h('span', { class: 'nm', text: c.name_ar + (c.active ? '' : ' (مخفي)') }), h('span', { class: 'cnt', text: nf(c.products) + ' منتج' }),
      h('button', { class: 'icon-btn', type: 'button', title: 'تحريك للأعلى', 'aria-label': 'تحريك للأعلى', disabled: idx === 0, onclick: () => move(-1) }, ico('up')),
      h('button', { class: 'icon-btn', type: 'button', title: 'تحريك للأسفل', 'aria-label': 'تحريك للأسفل', disabled: idx === siblings.length - 1, onclick: () => move(1) }, ico('down')),
      h('button', { class: 'icon-btn', type: 'button', title: 'تعديل', 'aria-label': 'تعديل', onclick: () => catModal(c) }, ico('edit')),
      h('button', { class: 'icon-btn danger', type: 'button', title: 'حذف', 'aria-label': 'حذف', onclick: async () => {
        if (!(await confirmBox(`حذف القسم «${c.name_ar}»؟`))) return;
        try { await api('/api/admin/categories/' + c.id, { method: 'DELETE' }); toast('تم الحذف'); route(); } catch (e) { toast(e.message, true); }
      } }, ico('trash')));
  }
  function catModal(c, parentId) {
    const isNew = !c; const hasKids = c && subsOf(c.id).length > 0;
    const name = h('input', { type: 'text', value: c ? c.name_ar : '', maxlength: 80, required: true });
    const en = h('input', { type: 'text', value: c ? c.name_en : '', maxlength: 80, dir: 'ltr' });
    const par = h('select', { disabled: hasKids }); par.append(h('option', { value: '', text: '— قسم رئيسي —' })); for (const m of mains()) if (!c || m.id !== c.id) par.append(h('option', { value: m.id, text: m.name_ar }));
    par.value = c ? (c.parent_id ?? '') : (parentId ?? '');
    const act = h('input', { type: 'checkbox', checked: c ? !!c.active : true });
    const body = h('div', {}, h('label', { class: 'field' }, h('span', { text: 'اسم القسم *' }), name), h('label', { class: 'field' }, h('span', { text: 'الاسم بالإنجليزية (اختياري)' }), en),
      h('label', { class: 'field' }, h('span', { text: 'يتبع' }), par, hasKids ? h('small', { text: 'لهذا القسم أقسام فرعية فلا يمكن نقله تحت قسم آخر.' }) : null),
      h('label', { class: 'check' }, act, 'ظاهر للزبائن'));
    const save = h('button', { class: 'btn primary', type: 'button' }, 'حفظ');
    const close = openModal({ title: isNew ? 'قسم جديد' : 'تعديل القسم', small: true, body, buttons: [h('button', { class: 'btn', type: 'button', onclick: () => close() }, 'إلغاء'), save] });
    save.addEventListener('click', async () => {
      if (!name.value.trim()) { name.focus(); return; }
      save.disabled = true;
      const payload = { name_ar: name.value, name_en: en.value, active: act.checked, parent_id: par.value === '' ? null : Number(par.value) };
      try { await api(isNew ? '/api/admin/categories' : '/api/admin/categories/' + c.id, { method: isNew ? 'POST' : 'PUT', body: payload }); close(); toast('تم الحفظ'); route(); }
      catch (e) { toast(e.message, true); save.disabled = false; }
    });
  }

  /* ================= الإعدادات ================= */
  function qrCanvas(text) {
    const qr = qrcode(0, 'M'); qr.addData(text); qr.make();
    const n = qr.getModuleCount(), cell = 10, margin = 4, size = (n + margin * 2) * cell;
    const c = h('canvas'); c.width = c.height = size; const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, size, size); g.fillStyle = '#0F3D38';
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (qr.isDark(r, k)) g.fillRect((k + margin) * cell, (r + margin) * cell, cell, cell);
    return c;
  }
  async function viewSettings() {
    const { settings: s } = await api('/api/admin/settings');
    const v = $('#view'); v.textContent = '';
    const F = {
      phone: h('input', { type: 'tel', value: s.phone || '', dir: 'ltr', placeholder: '+9647XXXXXXXXX' }),
      whatsapp: h('input', { type: 'tel', value: s.whatsapp || '', dir: 'ltr', placeholder: '9647XXXXXXXXX' }),
      hours_open: h('input', { type: 'time', value: s.hours_open || '' }), hours_close: h('input', { type: 'time', value: s.hours_close || '' }),
      notice_active: h('input', { type: 'checkbox', checked: s.notice_active === '1' }),
      notice: h('input', { type: 'text', value: s.notice || '', maxlength: 160, placeholder: 'مثال: مغلق يوم الجمعة بمناسبة العيد' }),
      review_url: h('input', { type: 'url', value: s.review_url || '', dir: 'ltr', placeholder: 'https://g.page/r/…' }),
      currency_label: h('input', { type: 'text', value: s.currency_label || 'د.ع', maxlength: 12 }),
      order_greeting: h('input', { type: 'text', value: s.order_greeting || '', maxlength: 200, placeholder: 'مثال: مرحباً، أود طلب المنتجات التالية:' })
    };
    const save = h('button', { class: 'btn primary', type: 'button' }, 'حفظ الإعدادات');
    save.addEventListener('click', async () => {
      save.disabled = true;
      try {
        await api('/api/admin/settings', { method: 'PUT', body: { phone: F.phone.value, whatsapp: F.whatsapp.value, hours_open: F.hours_open.value, hours_close: F.hours_close.value, notice_active: F.notice_active.checked, notice: F.notice.value, review_url: F.review_url.value, currency_label: F.currency_label.value, order_greeting: F.order_greeting.value } });
        toast('تم حفظ الإعدادات. تظهر للزبائن خلال دقيقة.');
      } catch (e) { toast(e.message, true); } finally { save.disabled = false; }
    });

    const origin = location.origin, links = [['إنستغرام (للبايو)', origin + '/?src=ig'], ['رمز QR (ستاند/باب المحل)', origin + '/?src=qr']];
    const qrs = h('div', { class: 'qrs' }, links.map(([label, url]) => {
      const cv = qrCanvas(url);
      return h('div', { class: 'qrbox' }, h('strong', { text: label }), h('div', {}, cv), h('div', { class: 'u', text: url }),
        h('div', {}, h('button', { class: 'btn sm', type: 'button', onclick: () => cv.toBlob(b => { const a = h('a', { href: URL.createObjectURL(b), download: 'qr-' + url.split('=').pop() + '.png' }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }) }, 'تنزيل PNG'),
          ' ', h('button', { class: 'btn sm', type: 'button', onclick: async () => { try { await navigator.clipboard.writeText(url); toast('تم نسخ الرابط'); } catch { toast(url); } } }, 'نسخ الرابط')));
    }));

    v.append(
      h('div', { class: 'card form-card' }, h('h3', { text: 'التواصل والدوام' }),
        h('div', { class: 'grid2' }, h('label', { class: 'field' }, h('span', { text: 'رقم الهاتف (زر الاتصال)' }), F.phone), h('label', { class: 'field' }, h('span', { text: 'رقم واتساب (للطلبات)' }), F.whatsapp, h('small', { text: 'بصيغة دولية بلا صفر: 9647812200554' })),
          h('label', { class: 'field' }, h('span', { text: 'يفتح الساعة' }), F.hours_open), h('label', { class: 'field' }, h('span', { text: 'يغلق الساعة' }), F.hours_close)),
        h('small', { class: 'muted', text: 'اترك الوقتين فارغين لإخفاء شارة «مفتوح الآن». بتوقيت بغداد.' }),
        h('label', { class: 'field' }, h('span', { text: 'رابط تقييم جوجل (اختياري)' }), F.review_url)),
      h('div', { class: 'card form-card' }, h('h3', { text: 'شريط تنبيه أعلى الصفحة' }),
        h('label', { class: 'check' }, F.notice_active, 'إظهار التنبيه للزبائن'), h('label', { class: 'field' }, h('span', { text: 'نص التنبيه' }), F.notice)),
      h('div', { class: 'card form-card' }, h('h3', { text: 'الطلبات' }),
        h('div', { class: 'grid2' }, h('label', { class: 'field' }, h('span', { text: 'رمز العملة' }), F.currency_label), h('label', { class: 'field' }, h('span', { text: 'مقدمة رسالة الطلب' }), F.order_greeting))),
      h('div', { class: 'form-card' }, save),
      h('div', { class: 'card form-card' }, h('h3', { text: 'روابط تتبّع المصدر ورمز QR' }), h('p', { class: 'muted', text: 'استخدم كل رابط في مكانه ليُظهر لك لوح النظرة العامة من أين يأتي الزبائن.' }), qrs),
      h('div', { class: 'card form-card', style: null }, h('h3', { text: 'الأمان' }), h('p', { class: 'muted', text: 'إن فقدت جهازاً سجّلت منه الدخول، ألغِ كل الجلسات فوراً.' }),
        h('button', { class: 'btn danger', type: 'button', onclick: async () => { if (await confirmBox('سيُسجَّل خروجك من كل الأجهزة. متابعة؟', 'تسجيل الخروج من الكل')) { try { await api('/api/admin/logout-all', { method: 'POST' }); } catch {} showLogin(); } } }, 'تسجيل الخروج من كل الأجهزة')));
  }

  /* ================= البدء ================= */
  (async function init() {
    try { await boot(); } catch (e) { await showLogin(); }
  })();
})();
