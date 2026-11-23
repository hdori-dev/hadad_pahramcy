/* ==========================================================================
   فاتورة الطلب PDF — تُرسم على Canvas (فيدعم العربية والاتجاه RTL بدقة)
   ثم تُضمَّن صفحاتها في ملف PDF بسيط. بلا مكتبات خارجية.
   Invoice.build(order, opts) → Promise<Blob>
     order: { code, created_at, name, phone, address, method, note, total, items:[{name, qty, price, img}] }
     opts : { lang:'ar'|'en', biz:{name,address,phone,site}, currency, loc:fn }
   ========================================================================== */
(function () {
  'use strict';
  var W = 1240, H = 1754, M = 70, CW = W - 2 * M;           // A4 @150dpi
  var C = { primary: '#1A8F83', dark: '#0F6B62', ink: '#17212F', muted: '#667689', line: '#E3E9F0', soft: '#F4F6F9', pale: '#E8F5F3', white: '#FFFFFF' };
  var L10 = {
    ar: { invoice: 'فاتورة', cust: 'بيانات العميل', ord: 'تفاصيل الطلب', name: 'الاسم', phone: 'الهاتف', addr: 'العنوان', no: 'رقم الطلب', date: 'التاريخ', recv: 'طريقة الاستلام',
      delivery: 'توصيل إلى العنوان', pickup: 'استلام من الصيدلية', cnt: 'عدد القطع', idx: '#', item: 'المنتج', qty: 'الكمية', price: 'السعر', line: 'الإجمالي',
      sub: 'المجموع', total: 'المبلغ الإجمالي', notes: 'ملاحظات', thanks: 'شكراً لثقتكم بنا', cont: 'تابع', page: 'صفحة', foot: 'طلب مبدئي يُؤكَّد من قِبل الصيدلية عبر واتساب أو الهاتف.' },
    en: { invoice: 'INVOICE', cust: 'Customer details', ord: 'Order details', name: 'Name', phone: 'Phone', addr: 'Address', no: 'Order no.', date: 'Date', recv: 'Receiving',
      delivery: 'Delivery to address', pickup: 'Pickup from pharmacy', cnt: 'Items', idx: '#', item: 'Product', qty: 'Qty', price: 'Price', line: 'Total',
      sub: 'Subtotal', total: 'Grand total', notes: 'Notes', thanks: 'Thank you for your order', cont: 'cont.', page: 'Page', foot: 'This is a preliminary order, confirmed by the pharmacy via WhatsApp or phone.' }
  };

  function loadImg(src) { return new Promise(function (res) { if (!src) return res(null); var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; }); }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  function build(order, opts) {
    var lang = opts.lang === 'en' ? 'en' : 'ar', rtl = lang === 'ar', T = L10[lang], biz = opts.biz || {};
    var loc = opts.loc || function (x) { return x; };
    var cur = opts.currency || 'د.ع';
    function ltr(x) { return rtl ? '\u202D' + x + '\u202C' : x; }
    function num(n) { return loc(String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, rtl ? '٬' : ',')); }
    function money(n) { return num(n) + ' ' + cur; }
    function dateStr(ts) {          // بتوقيت بغداد (UTC+3) دائماً
      var d = new Date(((ts || Date.now() / 1000) + 3 * 3600) * 1000), p = function (n) { return (n < 10 ? '0' : '') + n; };
      return ltr(loc(d.getUTCFullYear() + '/' + p(d.getUTCMonth() + 1) + '/' + p(d.getUTCDate()) + '   ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes())));
    }
    var FONT = 'Cairo, system-ui, Tahoma, sans-serif';

    var fontsReady = Promise.all(['400', '600', '700'].map(function (w) { return document.fonts && document.fonts.load ? document.fonts.load(w + ' 28px Cairo', 'مرحبا Abc 123') : null; })).catch(function () {});
    var thumbs = Promise.all(order.items.map(function (it) { return loadImg(it.img); }));
    var logo = loadImg(opts.logo || '/assets/logo.png');

    return Promise.all([fontsReady, thumbs, logo]).then(function (r) {
      var imgs = r[1], logoImg = r[2], pages = [], cv, g;

      function newPage() {
        cv = document.createElement('canvas'); cv.width = W; cv.height = H; g = cv.getContext('2d');
        g.fillStyle = C.white; g.fillRect(0, 0, W, H); pages.push(cv); return pages.length;
      }
      /* x = إزاحة من حافة البداية (يمين في العربية/يسار في الإنجليزية)، w = العرض */
      function left(x, w) { return rtl ? W - M - x - w : M + x; }
      function text(str, x, y, w, align, size, weight, color) {
        str = String(str == null ? '' : str);
        g.font = weight + ' ' + size + 'px ' + FONT; g.fillStyle = color; g.textBaseline = 'middle';
        g.direction = rtl ? 'rtl' : 'ltr';
        var Lx = left(x, w), a = align === 'center' ? 'center' : (((align === 'start') !== rtl) ? 'left' : 'right');
        g.textAlign = a; g.fillText(str, a === 'left' ? Lx : a === 'right' ? Lx + w : Lx + w / 2, y);
      }
      function fit(str, maxW, size, weight) {
        g.font = weight + ' ' + size + 'px ' + FONT; str = String(str);
        if (g.measureText(str).width <= maxW) return str;
        while (str.length > 1 && g.measureText(str + '…').width > maxW) str = str.slice(0, -1);
        return str + '…';
      }
      function wrap(str, maxW, size, weight, maxLines) {
        g.font = weight + ' ' + size + 'px ' + FONT;
        var words = String(str).split(/\s+/), lines = [], cur = '';
        words.forEach(function (w) {
          var t = cur ? cur + ' ' + w : w;
          if (g.measureText(t).width <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; }
        });
        if (cur) lines.push(cur);
        if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = fit(lines[maxLines - 1] + ' …', maxW, size, weight); }
        return lines;
      }
      function rect(x, y, w, h, fill, rad, stroke) {
        var Lx = left(x, w); rr(g, Lx, y, w, h, rad || 0);
        if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.stroke(); }
      }

      /* ---------- الترويسة ---------- */
      function headerFirst() {
        g.fillStyle = C.primary; g.fillRect(0, 0, W, 250);
        g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.arc(rtl ? 120 : W - 120, 30, 210, 0, 7); g.fill();
        g.beginPath(); g.arc(rtl ? 330 : W - 330, 270, 120, 0, 7); g.fill();
        rect(0, 48, 200, 150, C.white, 26);
        if (logoImg) { var s = Math.min(170 / logoImg.width, 120 / logoImg.height), lw = logoImg.width * s, lh = logoImg.height * s; g.drawImage(logoImg, left(0, 200) + (200 - lw) / 2, 48 + (150 - lh) / 2, lw, lh); }
        var ns = 44; g.font = '700 44px ' + FONT; while (ns > 28 && (g.font = '700 ' + ns + 'px ' + FONT, g.measureText(biz.name || '').width > 460)) ns -= 2;
        text(fit(biz.name || '', 460, ns, 700), 226, 92, 460, 'start', ns, 700, C.white);
        text(fit(biz.address || '', 460, 24, 400), 226, 140, 460, 'start', 24, 400, 'rgba(255,255,255,.9)');
        text(ltr(loc(biz.phone || '')), 226, 178, 460, 'start', 25, 600, C.white);
        text(T.invoice, 700, 88, 400, 'end', 62, 700, C.white);
        text(ltr('#' + loc(order.code || '—')), 700, 150, 400, 'end', 36, 700, 'rgba(255,255,255,.95)');
        text(dateStr(order.created_at), 700, 194, 400, 'end', 23, 400, 'rgba(255,255,255,.85)');
      }
      function headerNext(n) {
        g.fillStyle = C.primary; g.fillRect(0, 0, W, 110);
        text(biz.name || '', 0, 55, 700, 'start', 34, 700, C.white);
        text(T.invoice + ' ' + ltr('#' + loc(order.code || '—')) + ' — ' + T.cont, 700, 55, 400, 'end', 28, 600, C.white);
      }
      function footer(n, total) {
        var y = H - 128;
        g.strokeStyle = C.line; g.lineWidth = 2; g.beginPath(); g.moveTo(M, y); g.lineTo(W - M, y); g.stroke();
        text(T.thanks, 0, y + 30, CW, 'center', 27, 700, C.primary);
        text(fit((biz.address || '') + (biz.phone ? '  •  ' + ltr(loc(biz.phone)) : '') + (biz.site ? '  •  ' + biz.site : ''), CW - 160, 20, 400), 0, y + 66, CW, 'center', 20, 400, C.muted);
        text(T.foot, 0, y + 94, CW - 200, 'start', 17, 400, C.muted);
        text(T.page + ' ' + loc(n + ' / ' + total), CW - 200, y + 94, 200, 'end', 18, 600, C.muted);
      }
      function card(x, y, w, h, title, rows) {
        rect(x, y, w, h, C.soft, 26);
        rect(x + 26, y + 30, 8, 30, C.primary, 4);
        text(title, x + 48, y + 45, w - 70, 'start', 26, 700, C.dark);
        var yy = y + 98;
        rows.forEach(function (rw) {
          text(rw[0], x + 26, yy, 160, 'start', 21, 400, C.muted);
          var lines = rw[2] ? wrap(rw[1], w - 215, 24, 600, 2) : [fit(rw[1], w - 215, 24, 600)];
          lines.forEach(function (ln, i) { text(ln, x + 190, yy + i * 30, w - 216, 'start', 24, 600, C.ink); });
          yy += (lines.length > 1 ? 30 : 0) + 44;
        });
      }
      function tableHead(y) {
        rect(0, y, CW, 64, C.pale, 16);
        var o = [[0, 60, 'center', T.idx], [60, 530, 'start', T.item], [590, 110, 'center', T.qty], [700, 190, 'end', T.price], [890, 210, 'end', T.line]];
        o.forEach(function (c) { text(c[3], c[0] + (c[2] === 'start' ? 16 : c[2] === 'end' ? -16 : 0), y + 33, c[1], c[2], 23, 700, C.dark); });
      }
      var ROW = 78;
      function row(i, it, y) {
        if (i % 2 === 1) rect(0, y, CW, ROW, '#FAFBFC', 0);
        g.strokeStyle = C.line; g.lineWidth = 1.5; g.beginPath(); g.moveTo(M, y + ROW); g.lineTo(W - M, y + ROW); g.stroke();
        var cy = y + ROW / 2;
        text(loc(String(i + 1)), 0, cy, 60, 'center', 22, 600, C.muted);
        var im = imgs[i], ts = 56, tx = 76;
        g.save(); rr(g, left(tx, ts), cy - ts / 2, ts, ts, 12); g.clip();
        if (im) { var sc = Math.max(ts / im.width, ts / im.height); g.drawImage(im, left(tx, ts) + (ts - im.width * sc) / 2, cy - ts / 2 + (ts - im.height * sc) / 2, im.width * sc, im.height * sc); }
        else { g.fillStyle = C.soft; g.fillRect(left(tx, ts), cy - ts / 2, ts, ts); }
        g.restore();
        var nl = wrap(it.name, 530 - 56 - 36 - 16, 24, 600, 2);
        nl.forEach(function (ln, k) { text(ln, tx + ts + 16, cy + (k - (nl.length - 1) / 2) * 30, 530 - (tx - 60) - ts - 16, 'start', 24, 600, C.ink); });
        text(loc(String(it.qty)), 590, cy, 110, 'center', 25, 700, C.ink);
        text(num(it.price), 700, cy, 174, 'end', 23, 400, C.muted);
        text(money(it.price * it.qty), 890, cy, 194, 'end', 24, 700, C.dark);
      }

      /* ---------- التقسيم إلى صفحات ---------- */
      var LIMIT = H - 150, hasNote = !!(order.note && order.note.trim());
      var totalsH = 330 + (hasNote ? 20 : 0);
      var items = order.items, plans = [], idx = 0, p1 = true, y0, pageRows;
      while (idx < items.length || !plans.length) {
        y0 = p1 ? 604 : 244; pageRows = Math.max(1, Math.floor((LIMIT - y0) / ROW));
        var take = Math.min(pageRows, items.length - idx); plans.push({ from: idx, to: idx + take, first: p1 }); idx += take; p1 = false;
        if (idx >= items.length) break;
      }
      var last = plans[plans.length - 1], lastY = (last.first ? 604 : 244) + (last.to - last.from) * ROW;
      var totalsOnNew = lastY + totalsH > LIMIT;
      var totalPages = plans.length + (totalsOnNew ? 1 : 0);

      plans.forEach(function (pl, pi) {
        var n = newPage();
        if (pl.first) {
          headerFirst();
          card(0, 290, 540, 250, T.cust, [[T.name, order.name], [T.phone, ltr(loc(order.phone))], [T.addr, order.address, true]]);
          card(560, 290, 540, 250, T.ord, [[T.no, ltr('#' + loc(order.code || '—'))], [T.date, dateStr(order.created_at)], [T.recv, order.method === 'pickup' ? T.pickup : T.delivery], [T.cnt, loc(String(items.reduce(function (s, i) { return s + i.qty; }, 0)))]]);
          tableHead(560);
        } else { headerNext(n); tableHead(150); }
        var y = pl.first ? 624 : 214;
        for (var i = pl.from; i < pl.to; i++) { row(i, items[i], y); y += ROW; }
        if (pi === plans.length - 1 && !totalsOnNew) totals(y + 30);
        footer(n, totalPages);
      });
      if (totalsOnNew) { var nn = newPage(); headerNext(nn); totals(170); footer(nn, totalPages); }

      function totals(y) {
        var cnt = items.reduce(function (s, i) { return s + i.qty; }, 0);
        rect(580, y, 520, 64, C.soft, 16);
        text(T.sub + ' (' + loc(String(cnt)) + ')', 600, y + 33, 260, 'start', 23, 600, C.muted);
        text(money(order.total), 840, y + 33, 240, 'end', 25, 700, C.ink);
        rect(580, y + 78, 520, 112, C.primary, 22);
        text(T.total, 606, y + 134, 200, 'start', 26, 700, 'rgba(255,255,255,.9)');
        text(money(order.total), 780, y + 134, 296, 'end', 40, 700, C.white);
        if (hasNote) {
          rect(0, y, 540, 190, C.white, 22, C.line);
          text(T.notes, 24, y + 36, 490, 'start', 24, 700, C.dark);
          wrap(order.note.trim(), 490, 22, 400, 4).forEach(function (ln, k) { text(ln, 24, y + 80 + k * 32, 490, 'start', 22, 400, C.ink); });
        }
      }

      /* ---------- PDF ---------- */
      return Promise.all(pages.map(function (c) {
        return new Promise(function (res) { c.toBlob(function (b) { b.arrayBuffer().then(function (ab) { res(new Uint8Array(ab)); }); }, 'image/jpeg', 0.9); });
      })).then(function (jpegs) { return makePdf(jpegs); });
    });
  }

  function makePdf(jpegs) {
    var enc = new TextEncoder(), chunks = [], off = 0, xref = [], PW = 595.28, PH = 841.89;
    function push(x) { var b = typeof x === 'string' ? enc.encode(x) : x; chunks.push(b); off += b.length; }
    function obj(n, head, stream) {
      xref[n] = off;
      push(n + ' 0 obj\n' + head + (stream ? '\nstream\n' : '\n'));
      if (stream) { push(stream); push('\nendstream\n'); }
      push('endobj\n');
    }
    push('%PDF-1.4\n'); push(new Uint8Array([0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A]));
    var kids = jpegs.map(function (_, i) { return (3 + 3 * i) + ' 0 R'; }).join(' ');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Count ' + jpegs.length + ' /Kids [' + kids + '] >>');
    jpegs.forEach(function (j, i) {
      var p = 3 + 3 * i, content = 'q ' + PW + ' 0 0 ' + PH + ' 0 0 cm /Im0 Do Q';
      obj(p, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /XObject << /Im0 ' + (p + 2) + ' 0 R >> >> /Contents ' + (p + 1) + ' 0 R >>');
      obj(p + 1, '<< /Length ' + content.length + ' >>', content);
      obj(p + 2, '<< /Type /XObject /Subtype /Image /Width ' + W + ' /Height ' + H + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + j.length + ' >>', j);
    });
    var n = 3 + 3 * jpegs.length, xo = off, s = 'xref\n0 ' + n + '\n0000000000 65535 f \n';
    for (var k = 1; k < n; k++) s += ('0000000000' + xref[k]).slice(-10) + ' 00000 n \n';
    push(s + 'trailer\n<< /Size ' + n + ' /Root 1 0 R >>\nstartxref\n' + xo + '\n%%EOF');
    return new Blob(chunks, { type: 'application/pdf' });
  }

  window.Invoice = { build: build };
})();
