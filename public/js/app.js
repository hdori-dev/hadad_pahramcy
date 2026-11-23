/* ==========================================================================
   صيدلية الحداد التعليمية — منطق الخريطة
   Vanilla JS + Leaflet. بلا Backend ولا مفاتيح API.
   ========================================================================== */
(function () {
  'use strict';

  var CFG = window.SITE_CONFIG;
  var $ = function (id) { return document.getElementById(id); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- رموز SVG (24x24) ---------- */
  var GLYPHS = {
    pharmacy: '<path d="M16.5 3.5 11 11" stroke-width="3"/><path d="M4 12.5h16a8 8 0 0 1-16 0z" fill="#fff"/><path d="M9 21h6"/>',
    building: '<path d="M5 21V5.5L12 3l7 2.5V21"/><path d="M9 21v-5h6v5"/><path d="M9 9h1.5M13.5 9H15M9 12.5h1.5M13.5 12.5H15"/>',
    statue: '<circle cx="12" cy="5.2" r="2.3" fill="#fff"/><path d="M12 8v9M7.5 11.5 12 9.5l4.5 2"/><path d="M8 21v-3.5h8V21"/>',
    bridge: '<path d="M3 18h18"/><path d="M4 18v-2M20 18v-2"/><path d="M4 16c2.2-6.5 13.800-6.500 16 0"/><path d="M8 17v-3.200M12 17v-4M16 17v-3.200"/>',
    hospital: '<path d="M12 6.5v11M6.500 12h11"/>'
  };
  function glyph(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (GLYPHS[name] || GLYPHS.building) + '</svg>';
  }

  /* ---------- الحالة ---------- */
  var lang = 'ar';
  try {
    var saved = localStorage.getItem('lang');
    if (saved === 'ar' || saved === 'en') lang = saved;
    else lang = CFG.defaultLang;
  } catch (e) { lang = CFG.defaultLang; }

  var map, baseGroup, currentLayerKey = CFG.defaultLayer;
  var markerObjs = [];          // {cfg, marker}
  var userMarker = null, userCircle = null, userLatLng = null, userRoute = null;
  var tileErrors = 0, tileErrorShown = false;
  var userTouchedMap = false;
  var toastTimer = null;
  var mainLatLng = L.latLng(CFG.main.lat, CFG.main.lng);

  function t(key) { return (CFG.ui[lang] && CFG.ui[lang][key]) || key; }
  function tr(obj) { return obj ? (obj[lang] || obj.ar || '') : ''; }

  /* ---------- أدوات ---------- */
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  function distanceM(a, b) { return a.distanceTo(b); }   // Haversine داخل Leaflet

  // أرقام عربية-هندية (٠١٢٣) عند واجهة العربية، فهي المعتادة في العراق
  function loc(str) {
    if (lang !== 'ar') return str;
    return String(str).replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.charAt(d); }).replace(/(\d|[٠-٩])\.(?=[٠-٩])/g, '$1٫').replace(/\.(?=[٠-٩])/g, '٫');
  }
  function fmtDist(m) {
    var km;
    if (m < 1000) return loc(Math.max(10, Math.round(m / 10) * 10) + ' ' + t('unitM'));
    km = m / 1000;
    return loc((km < 100 ? km.toFixed(1) : Math.round(km)) + ' ' + t('unitKm'));
  }

  function toast(msg, ms) {
    var el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, ms || 4500);
  }

  /* ---------- الجزء المرئي من الخريطة (بين الترويسة والبطاقة) ---------- */
  function visibleRect() {
    var W = window.innerWidth, H = $('app') ? $('app').clientHeight : window.innerHeight;
    var r = { l: 0, t: 0, r: W, b: H };
    var head = $('topbar').getBoundingClientRect();
    var card = $('info').getBoundingClientRect();
    var ctl = $('controls').getBoundingClientRect();
    if (head.width > W * 0.7) r.t = Math.max(r.t, head.bottom);
    else r.t = Math.max(r.t, head.bottom);
    if (card.width > W * 0.7) {
      r.b = Math.min(r.b, card.top);
    } else if (card.left + card.width / 2 < W / 2) {
      r.l = Math.max(r.l, card.right);
    } else {
      r.r = Math.min(r.r, card.left);
    }
    if (ctl.left + ctl.width / 2 > W / 2) r.r = Math.min(r.r, ctl.left);
    else r.l = Math.max(r.l, ctl.right);
    if (r.b - r.t < 120) { r.t = 0; r.b = H; }          // شاشة قصيرة جداً: لا إزاحة
    if (r.r - r.l < 120) { r.l = 0; r.r = W; }
    return r;
  }

  // مركز الخريطة الذي يجعل النقطة تظهر في وسط الجزء المرئي
  function centerFor(latlng, zoom) {
    var size = map.getSize();
    var v = visibleRect();
    var cx = (v.l + v.r) / 2, cy = (v.t + v.b) / 2;
    var p = map.project(latlng, zoom).add([size.x / 2 - cx, size.y / 2 - cy]);
    return map.unproject(p, zoom);
  }

  function focusOn(latlng, zoom, opts) {
    var c = centerFor(latlng, zoom);
    if (reduceMotion) map.setView(c, zoom, { animate: false });
    else map.flyTo(c, zoom, { duration: (opts && opts.duration) || 0.8 });
  }

  /* ---------- الخريطة ---------- */
  function buildLayer(key) {
    var def = CFG.layers[key];
    var layers = def.tiles.map(function (tl, idx) {
      var o = {
        maxNativeZoom: tl.maxNativeZoom,
        maxZoom: CFG.zoom.max,
        minZoom: CFG.zoom.min,
        crossOrigin: true,
        detectRetina: false
      };
      if (tl.subdomains) o.subdomains = tl.subdomains;
      var layer = L.tileLayer(tl.url, o);
      if (idx === 0) layer.on('tileerror', onTileError);   // الطبقة الأساسية فقط (طبقات الأسماء قد تغيب بعض المربعات)
      return layer;
    });
    return L.layerGroup(layers);
  }

  function onTileError() {
    tileErrors++;
    if (tileErrors >= 8 && !tileErrorShown) {
      tileErrorShown = true;
      toast(t('errTiles'), 6000);
    }
  }

  function setLayer(key) {
    if (!CFG.layers[key]) return;
    if (baseGroup) map.removeLayer(baseGroup);
    currentLayerKey = key;
    tileErrors = 0; tileErrorShown = false;
    baseGroup = buildLayer(key);
    baseGroup.addTo(map);
    // أرجع الطبقات الأساسية إلى الخلف
    baseGroup.eachLayer(function (l) { if (l.bringToBack) l.bringToBack(); });
    $('map').setAttribute('data-layer', key);
    renderLayersMenu();
    return baseGroup;
  }

  function renderLayersMenu() {
    var pop = $('layersPop');
    pop.textContent = '';
    Object.keys(CFG.layers).forEach(function (key) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'menuitemradio');
      b.setAttribute('aria-checked', key === currentLayerKey ? 'true' : 'false');
      var dot = document.createElement('span');
      dot.className = 'dot';
      var txt = document.createElement('span');
      txt.textContent = tr(CFG.layers[key].label);
      b.appendChild(dot); b.appendChild(txt);
      b.addEventListener('click', function () {
        setLayer(key);
        toggleLayersMenu(false);
      });
      pop.appendChild(b);
    });
  }

  function toggleLayersMenu(open) {
    var pop = $('layersPop'), btn = $('layersBtn');
    if (typeof open !== 'boolean') open = pop.hidden;
    pop.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      var cur = pop.querySelector('[aria-checked="true"]');
      if (cur) cur.focus();
    }
  }

  /* ---------- حجم الرموز مع التقريب ---------- */
  function updateScale() {
    var z = map.getZoom();
    var scale = clamp(1 + (z - 17) * 0.2, 0.55, 1.4);
    var el = $('map');
    el.style.setProperty('--scale', scale.toFixed(3));
    el.classList.toggle('show-labels', z >= 18);
  }

  /* ---------- الرموز ---------- */
  function makeIcon(cfg, isMain) {
    var inner = isMain ? '<img src="assets/emblem.png" alt="" draggable="false">' : glyph(cfg.icon);
    var html = '<div class="mk-pos' + (isMain ? ' main' : '') + '" style="--base:' + cfg.baseSize + 'px">' +
      (isMain ? '<span class="sonar"></span><span class="sonar s2"></span>' : '<span class="mk-hit"></span>') +
      '<div class="mk" style="--c:' + cfg.color + '">' + inner + '</div>' +
      '<span class="mk-label"></span></div>';
    return L.divIcon({ className: 'mk-wrap', html: html, iconSize: [0, 0], iconAnchor: [0, 0], popupAnchor: [0, -14] });
  }

  function renderMarkers() {
    markerObjs.forEach(function (o) { map.removeLayer(o.marker); });
    markerObjs = [];

    var all = [{ cfg: Object.assign({ id: 'pharmacy', lat: CFG.main.lat, lng: CFG.main.lng }, CFG.mainMarker), main: true }]
      .concat(CFG.markers.map(function (m) { return { cfg: m, main: false }; }));

    all.forEach(function (item) {
      var cfg = item.cfg;
      var name = item.main ? tr(CFG.business.name) : tr(cfg.name);
      var marker = L.marker([cfg.lat, cfg.lng], {
        icon: makeIcon(cfg, item.main),
        alt: name,
        title: name,
        keyboard: true,
        riseOnHover: true,
        zIndexOffset: item.main ? 1000 : 0
      }).addTo(map);
      marker.on('click', function () { if (item.main) closeRoute(true); else selectLandmark(cfg.id); });
      markerObjs.push({ cfg: cfg, marker: marker, main: item.main });
      // اسم الرمز (يظهر عند التقريب)
      var el = marker.getElement();
      if (el) {
        var lbl = el.querySelector('.mk-label');
        if (lbl) lbl.textContent = name;
        if (!item.main && cfg.id === selId) { var pos = el.querySelector('.mk-pos'); if (pos) pos.classList.add('sel'); }
      }
    });
  }


  /* ---------- المسار على الشوارع (OSRM) ---------- */
  var routeLayer = null, routeSeq = 0, routeCache = {};
  var ROUTE_FROM = '#1F5FBF', ROUTE_TO = '#22C7A9';

  function clearRoute() {
    routeSeq++;
    if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
  }

  function hex(h) { return [1, 3, 5].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
  function mix(a, b, k) {
    var A = hex(a), B = hex(b);
    return 'rgb(' + A.map(function (v, i) { return Math.round(v + (B[i] - v) * k); }).join(',') + ')';
  }

  function fetchRoute(cfg) {
    var R = CFG.routing;
    var pre = window.PRECOMPUTED_ROUTES && window.PRECOMPUTED_ROUTES[cfg.id];
    if (pre && pre.coords && pre.coords.length > 1) {
      return Promise.resolve({ coords: pre.coords, dist: pre.dist, dur: pre.dur + R.extraSeconds });
    }
    if (routeCache[cfg.id]) return Promise.resolve(routeCache[cfg.id]);
    var url = R.url + cfg.lng + ',' + cfg.lat + ';' + CFG.main.lng + ',' + CFG.main.lat +
      '?overview=full&geometries=geojson&alternatives=false&steps=false';
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, R.timeoutMs);
    return fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    }).then(function (j) {
      if (!j.routes || !j.routes[0]) throw new Error('no route');
      var rt = j.routes[0];
      var out = {
        coords: rt.geometry.coordinates.map(function (c) { return [c[1], c[0]]; }),
        dist: rt.distance,
        dur: rt.duration + R.extraSeconds
      };
      routeCache[cfg.id] = out;
      return out;
    });
  }

  function arMinutes(n) {
    if (n === 1) return 'دقيقة واحدة';
    if (n === 2) return 'دقيقتان';
    if (n >= 3 && n <= 10) return n + ' دقائق';
    return n + ' دقيقة';
  }
  function fmtTime(sec) {
    if (sec < 60) return t('routeLess');
    var m = Math.max(1, Math.round(sec / 60));
    return lang === 'ar' ? loc(arMinutes(m)) : m + ' min';
  }

  function drawRoute(coords, color, dashed) {
    if (routeLayer) map.removeLayer(routeLayer);
    var g = L.layerGroup();
    if (dashed) {
      g.addLayer(L.polyline(coords, { color: '#fff', weight: 8, opacity: .9, interactive: false }));
      g.addLayer(L.polyline(coords, { color: ROUTE_FROM, weight: 4, dashArray: '2 9', lineCap: 'round', interactive: false }));
    } else {
      g.addLayer(L.polyline(coords, { color: '#fff', weight: 10, opacity: .95, lineCap: 'round', lineJoin: 'round', interactive: false }));
      // تدرّج لوني: قطع صغيرة تتغيّر ألوانها من نقطة البداية إلى الصيدلية
      var n = coords.length, segs = Math.min(40, n - 1), step = (n - 1) / segs;
      for (var i = 0; i < segs; i++) {
        var a = Math.floor(i * step), b = Math.min(n - 1, Math.floor((i + 1) * step) + 1);
        g.addLayer(L.polyline(coords.slice(a, b + 1), {
          color: mix(ROUTE_FROM, ROUTE_TO, i / Math.max(1, segs - 1)),
          weight: 6, lineCap: 'round', lineJoin: 'round', interactive: false
        }));
      }
    }
    g.addTo(map);
    routeLayer = g;
    // ابقِ الرموز فوق الخط
    markerObjs.forEach(function (o) { if (o.marker._icon) o.marker.setZIndexOffset(o.main ? 1000 : 500); });
  }

  function fitRoute(coords) {
    var v = visibleRect();
    var b = L.latLngBounds(coords);
    map.flyToBounds(b, {
      paddingTopLeft: [v.l + 50, v.t + 190],
      paddingBottomRight: [(window.innerWidth - v.r) + 50, (($('app') ? $('app').clientHeight : window.innerHeight) - v.b) + 60],
      maxZoom: 18, duration: reduceMotion ? 0 : 0.8, animate: !reduceMotion
    });
  }

  function span(cls, txt) { var e = document.createElement('span'); e.className = cls; e.textContent = txt; return e; }

  // حالة معلومات المسار لكل نقطة: undefined = جارٍ الحساب، {ok:true,...} أو {ok:false}
  var routeState = {}, selId = null;

  function findCfg(id) { return CFG.markers.filter(function (m) { return m.id === id; })[0]; }

  function mapsUrl(cfg) {
    var from = cfg.lat + ',' + cfg.lng, to = CFG.main.lat + ',' + CFG.main.lng;
    if (isApple()) return 'https://maps.apple.com/?saddr=' + from + '&daddr=' + to;
    return 'https://www.google.com/maps/dir/?api=1&origin=' + from + '&destination=' + to;
  }

  function renderRouteView() {
    var cfg = findCfg(selId);
    if (!cfg) return;
    var st = routeState[cfg.id];
    $('rvIcon').style.setProperty('--c', cfg.color);
    $('rvIcon').innerHTML = glyph(cfg.icon);
    $('rvName').textContent = tr(cfg.name);
    $('rvType').textContent = tr(cfg.type);
    $('rvTimeLbl').textContent = t('routeTime') + ' · ' + t('routeByCar');
    $('rvDistLbl').textContent = t('routeDistance');
    $('rvNavLabel').textContent = t('routeFromHere');
    $('rvNav').href = mapsUrl(cfg);
    $('rvPharmLabel').textContent = t('navigate');
    $('rvPharmNav').href = navUrl();
    $('rvClose').setAttribute('aria-label', t('close'));
    $('rvClose').setAttribute('title', t('close'));
    var rv = $('routeView');
    rv.classList.toggle('loading', !st);
    if (!st) {
      $('rvTime').textContent = '…'; $('rvDist').textContent = '…'; $('rvNote').textContent = t('routeLoading');
    } else if (st.ok) {
      $('rvTime').textContent = fmtTime(st.dur);
      $('rvDist').textContent = fmtDist(st.dist);
      $('rvNote').textContent = t('routeNote');
    } else {
      $('rvTime').textContent = '—';
      $('rvDist').textContent = fmtDist(st.straight);
      $('rvNote').textContent = t('routeFail');
    }
  }

  function setRouteMode(on) {
    $('routeView').hidden = !on;
    $('mainView').hidden = on;
    $('info').classList.toggle('is-route', on);
    $('info').scrollTop = 0;
  }

  function markSelected(id) {
    markerObjs.forEach(function (o) {
      var el = o.marker.getElement && o.marker.getElement();
      var pos = el && el.querySelector('.mk-pos');
      if (pos) pos.classList.toggle('sel', !o.main && o.cfg.id === id);
    });
  }

  function selectLandmark(id) {
    var cfg = findCfg(id);
    if (!cfg) return;
    userTouchedMap = true;
    clearRoute();
    var seq = routeSeq;
    selId = id;
    track('route', id);
    delete routeState[id];
    markSelected(id);
    setRouteMode(true);
    renderRouteView();
    if (!(history.state && history.state.route)) { try { history.pushState({ route: 1 }, ''); } catch (e) {} }
    try { var hd = $('rvName'); hd.setAttribute('tabindex', '-1'); hd.focus({ preventScroll: true }); } catch (e) {}
    var from = L.latLng(cfg.lat, cfg.lng);
    var settle = function (coords) { setTimeout(function () { fitRoute(coords); }, 60); };   // بعد أن تتغير البطاقة
    fetchRoute(cfg).then(function (r) {
      if (seq !== routeSeq) return;
      routeState[id] = { ok: true, dur: r.dur, dist: r.dist };
      drawRoute(r.coords, cfg.color, false);
      renderRouteView();
      settle(r.coords);
    }).catch(function () {
      if (seq !== routeSeq) return;
      var line = [[cfg.lat, cfg.lng], [CFG.main.lat, CFG.main.lng]];
      routeState[id] = { ok: false, straight: distanceM(from, mainLatLng) };
      drawRoute(line, cfg.color, true);
      renderRouteView();
      settle(line);
    });
  }

  var pendingRefocus = true;
  function closeRoute(refocus) {   // يُستدعى من الواجهة: يمرّ عبر سجل التصفح ليعمل زر الرجوع
    if (selId !== null && history.state && history.state.route) { pendingRefocus = refocus; history.back(); return; }
    doCloseRoute(refocus);
  }
  function doCloseRoute(refocus) {
    var had = selId !== null;
    clearRoute();
    selId = null;
    markSelected(null);
    setRouteMode(false);
    if (userRoute) drawRoute(userRoute.coords, null, false);
    if (had && refocus) setTimeout(function () { if (userRoute) fitRoute(userRoute.coords); else focusOn(mainLatLng, CFG.main.zoom); }, 60);
  }
  window.addEventListener('popstate', function () { if (selId !== null) doCloseRoute(pendingRefocus); pendingRefocus = true; });

  /* ---------- الملاحة ---------- */
  function isApple() {
    var ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function navUrl() {
    var ll = CFG.main.lat + ',' + CFG.main.lng;
    if (isApple()) return 'https://maps.apple.com/?daddr=' + ll;
    return 'https://www.google.com/maps/dir/?api=1&destination=' + ll;   // بلا travelmode: يترك الاختيار للزائر
  }

  /* ---------- نصوص الواجهة ---------- */
  function renderText() {
    var html = document.documentElement;
    html.lang = lang;
    html.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = t('pageTitle');
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', t('metaDescription'));

    $('bizName').textContent = tr(CFG.business.name);
    $('infoCategory').textContent = tr(CFG.business.category);
    $('infoDesc').textContent = tr(CFG.business.description);
    $('addrLabel').textContent = t('address');
    $('infoAddress').textContent = tr(CFG.business.address);
    $('navLabel').textContent = t('navigate');
    $('navBtn').href = navUrl();
    $('nearbyLabel').textContent = t('nearby');
    $('creditText').textContent = t('creditText');
    $('creditBtn').textContent = t('creditBtn');
    updateNearbyToggle();
    var lt = $('loaderText');
    if (lt) lt.textContent = t('loading');
    $('map').setAttribute('aria-label', t('mapLabel'));

    var lb = $('langBtn');
    lb.textContent = t('langButton');
    lb.setAttribute('aria-label', t('langButtonLabel'));
    lb.setAttribute('lang', lang === 'ar' ? 'en' : 'ar');

    var labels = document.querySelectorAll('[data-i18n-label]');
    for (var i = 0; i < labels.length; i++) {
      var key = labels[i].getAttribute('data-i18n-label');
      labels[i].setAttribute('aria-label', t(key));
      labels[i].setAttribute('title', t(key));
    }
    // اتصال / موقع إلكتروني (اختياريان)
    var call = $('callBtn'), web = $('webBtn'), wa = $('waBtn');
    var B = CFG.business;
    if (B.phone) {
      call.hidden = false; call.href = 'tel:' + B.phone;
      call.setAttribute('aria-label', t('call') + ' ' + B.phone); call.setAttribute('title', t('call'));
    } else { call.hidden = true; }
    if (B.whatsapp) {
      wa.hidden = false; wa.href = 'https://wa.me/' + B.whatsapp.replace(/\D/g, '');
      wa.setAttribute('aria-label', t('whatsapp')); wa.setAttribute('title', t('whatsapp'));
    } else { wa.hidden = true; }
    if (B.website) {
      web.hidden = false; web.href = B.website;
      web.setAttribute('aria-label', t('website')); web.setAttribute('title', t('website'));
    } else { web.hidden = true; }
    var ph = $('storePhoto');
    if (B.photo) { ph.hidden = false; ph.src = B.photo; ph.alt = tr(B.name); } else { ph.hidden = true; }
    $('shareBtn').setAttribute('aria-label', t('share')); $('shareBtn').setAttribute('title', t('share'));
    $('copyAddr').setAttribute('aria-label', t('copyAddress')); $('copyAddr').setAttribute('title', t('copyAddress'));
    renderOpenStatus();
    renderExtras();

    renderNearby();
    renderLayersMenu();
    renderDistance();
  }

  /* ---------- حالة الدوام (توقيت بغداد) ---------- */
  function renderOpenStatus() {
    var el = $('openStatus'), H = CFG.business.hours;
    if (!H || !H.open || !H.close) { el.hidden = true; return; }
    var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Baghdad', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    var hh = +parts.filter(function (p) { return p.type === 'hour'; })[0].value % 24;
    var mm = +parts.filter(function (p) { return p.type === 'minute'; })[0].value;
    var now = hh * 60 + mm;
    function mins(x) { var a = x.split(':'); return +a[0] * 60 + +a[1]; }
    var o = mins(H.open), c = mins(H.close);
    var open = o <= c ? (now >= o && now < c) : (now >= o || now < c);
    function fmtT(x) {
      var a = x.split(':'), h = +a[0], m = a[1], pm = h >= 12, h12 = h % 12 || 12;
      var suffix = lang === 'ar' ? (pm ? 'م' : 'ص') : (pm ? 'PM' : 'AM');
      return loc(h12 + ':' + m + ' ' + suffix);
    }
    el.hidden = false;
    el.classList.toggle('closed', !open);
    el.textContent = open ? t('openNow') + ' · ' + t('untilTime').replace('{t}', fmtT(H.close))
                          : t('closedNow') + ' · ' + t('opensAtTime').replace('{t}', fmtT(H.open));
  }

  /* ---------- مشاركة ونسخ ---------- */
  function copyText(txt, okMsg) {
    var done = function () { toast(okMsg, 2200); };
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(done, done); return; }
    var ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta); done();
  }
  function shareSite() {
    track('share');
    var url = location.href.split('#')[0];
    var near = CFG.markers.map(function (m) { return { m: m, d: distanceM(L.latLng(m.lat, m.lng), mainLatLng) }; })
      .sort(function (x, y) { return x.d - y.d; }).slice(0, 3).map(function (x) { return tr(x.m.name); }).join(lang === 'ar' ? '، ' : ', ');
    var maps = 'https://www.google.com/maps/search/?api=1&query=' + CFG.main.lat + ',' + CFG.main.lng;
    var text = tr(CFG.business.name) + '\n' + tr(CFG.business.address) + (near ? '\n' + t('shareNear') + ': ' + near : '') + '\n' + t('shareLocation') + ': ' + maps;
    if (navigator.share) navigator.share({ title: tr(CFG.business.name), text: text, url: url }).catch(function () {});
    else copyText(text + '\n' + url, t('linkCopied'));
  }

  /* ---------- سحب الورقة السفلية (جوال) ---------- */
  function initSheetSwipe() {
    var grip = $('info'), startY = null, moved = 0, onGrip = false;
    function isGripArea(e) {
      var r = grip.getBoundingClientRect();
      return window.innerWidth < 840 && e.clientY - r.top < 54;
    }
    grip.addEventListener('pointerdown', function (e) {
      if (!isGripArea(e) || (e.target.closest && e.target.closest('a,button'))) { startY = null; return; }
      startY = e.clientY; moved = 0; onGrip = !!(e.target.closest && e.target.closest('#sheetGrip'));
    });
    window.addEventListener('pointermove', function (e) { if (startY !== null) moved = e.clientY - startY; });
    window.addEventListener('pointerup', function () {
      if (startY === null) return;
      var dy = moved; startY = null; moved = 0;
      if (Math.abs(dy) < 8) { if (selId === null && onGrip) toggleNearby(); return; }   // نقرة على المقبض
      if (dy < -30 && selId === null && $('nearPanel').hidden) toggleNearby();         // سحب للأعلى
      else if (dy > 30) { if (selId !== null) closeRoute(true); else if (!$('nearPanel').hidden) toggleNearby(); }   // سحب للأسفل
    });
    window.addEventListener('pointercancel', function () { startY = null; });
  }

  function updateNearbyToggle() {
    var open = !$('nearPanel').hidden;
    var b = $('nearbyToggle');
    var label = t(open ? 'hideNearby' : 'showNearby');
    b.setAttribute('aria-label', label);
    b.setAttribute('title', label);
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
    $('nearby').classList.toggle('open', open);
  }
  function toggleNearby() {
    var p = $('nearPanel');
    p.hidden = !p.hidden;
    updateNearbyToggle();
    if (!p.hidden) setTimeout(function () { $('info').scrollTo({ top: $('info').scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' }); }, 30);
  }

  function renderNearby() {
    var ul = $('nearList');
    ul.textContent = '';
    var items = CFG.markers.map(function (m) {
      return { m: m, d: distanceM(mainLatLng, L.latLng(m.lat, m.lng)) };
    }).sort(function (a, b) { return a.d - b.d; });

    items.forEach(function (it) {
      var li = document.createElement('li');
      li.className = 'near-item';
      var b = document.createElement('button');
      b.type = 'button';
      var ico = document.createElement('span');
      ico.className = 'near-ico';
      ico.style.setProperty('--c', it.m.color);
      ico.innerHTML = glyph(it.m.icon);
      var box = document.createElement('span');
      box.className = 'near-text';
      var n = document.createElement('span');
      n.className = 'near-name';
      n.textContent = tr(it.m.name);
      var d = document.createElement('span');
      d.className = 'near-dist';
      d.textContent = fmtDist(it.d);
      box.appendChild(n);
      b.appendChild(ico); b.appendChild(box); b.appendChild(d);
      b.addEventListener('click', function () { openMarker(it.m.id); });
      li.appendChild(b);
      ul.appendChild(li);
    });
  }

  function openMarker(id) {
    if (window.innerWidth < 840) { $('nearPanel').hidden = true; updateNearbyToggle(); }
    selectLandmark(id);
  }

  /* ---------- موقع الزائر والمسافة ---------- */
  function renderDistance() {
    var row = $('distRow');
    if (!userLatLng) { row.hidden = true; return; }
    row.hidden = false;
    $('distText').textContent = userRoute
      ? t('distanceByCar').replace('{t}', fmtTime(userRoute.dur)).replace('{d}', fmtDist(userRoute.dist))
      : t('distanceFromYou').replace('{d}', fmtDist(distanceM(userLatLng, mainLatLng)));
  }

  function loadUserRoute() {
    var me = { id: '__me', lat: userLatLng.lat, lng: userLatLng.lng };
    delete routeCache.__me;
    fetchRoute(me).then(function (r) {
      userRoute = r;
      renderDistance();
      if (selId === null) { clearRoute(); drawRoute(r.coords, null, false); fitRoute(r.coords); }
    }).catch(function () { /* تبقى المسافة بخط مستقيم */ });
  }

  function locate() {
    var btn = $('locateBtn');
    if (!('geolocation' in navigator)) { toast(t('errUnsupported')); return; }
    btn.classList.add('busy'); btn.disabled = true;
    toast(t('locating'), 3000);
    navigator.geolocation.getCurrentPosition(function (pos) {
      btn.classList.remove('busy'); btn.disabled = false;
      userLatLng = L.latLng(pos.coords.latitude, pos.coords.longitude);
      var acc = pos.coords.accuracy || 0;
      if (userMarker) map.removeLayer(userMarker);
      if (userCircle) map.removeLayer(userCircle);
      userCircle = L.circle(userLatLng, { radius: acc, color: '#1F5FBF', weight: 1, fillColor: '#1F5FBF', fillOpacity: 0.1, interactive: false }).addTo(map);
      userMarker = L.marker(userLatLng, {
        icon: L.divIcon({ className: 'mk-wrap', html: '<div class="me-dot" style="transform:translate(-50%,-50%)"></div>', iconSize: [0, 0] }),
        alt: t('youAreHere'), title: t('youAreHere'), keyboard: false, zIndexOffset: 900
      }).addTo(map);
      userMarker.bindPopup(function () {
        var d = document.createElement('div'); d.className = 'pop';
        d.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
        var s = document.createElement('strong'); s.textContent = t('youAreHere');
        d.appendChild(s); return d;
      });
      userRoute = null;
      renderDistance();
      userTouchedMap = true;
      var v = visibleRect();
      var bounds = L.latLngBounds([userLatLng, mainLatLng]);
      map.flyToBounds(bounds, {
        paddingTopLeft: [v.l + 40, v.t + 40],
        paddingBottomRight: [(window.innerWidth - v.r) + 40, (($('app') ? $('app').clientHeight : window.innerHeight) - v.b) + 40],
        maxZoom: 17, duration: reduceMotion ? 0 : 0.9, animate: !reduceMotion
      });
      loadUserRoute();
    }, function (err) {
      btn.classList.remove('busy'); btn.disabled = false;
      var msg = err && err.code === 1 ? t('errDenied') : err && err.code === 3 ? t('errTimeout') : t('errUnavailable');
      toast(msg, 6000);
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  }

  /* ---------- شاشة التحميل ---------- */
  var loaderStart = Date.now(), loaderDone = false;
  function hideLoader() {
    if (loaderDone) return;
    loaderDone = true;
    var wait = Math.max(0, 700 - (Date.now() - loaderStart));
    setTimeout(function () {
      var l = $('loader');
      l.classList.add('done');
      setTimeout(function () { if (l.parentNode) l.parentNode.removeChild(l); }, 700);
    }, wait);
  }

  /* ---------- اللغة ---------- */
  function setLang(next) {
    lang = next;
    try { localStorage.setItem('lang', lang); } catch (e) {}
    map.closePopup();
    renderText();
    renderMarkers();
    if (selId) renderRouteView();
    updateScale();
    document.dispatchEvent(new Event('sitelangchange'));
  }

  /* ---------- التشغيل ---------- */

  /* ---------- تتبّع مجهول (بلا IP ولا هوية) + مصدر الزيارة ?src= ---------- */
  var SRC = (function () {
    try {
      var p = new URLSearchParams(location.search).get('src');
      if (p) sessionStorage.setItem('src', p);
      return (sessionStorage.getItem('src') || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20);
    } catch (e) { return ''; }
  })();
  function track(type, ref) {
    try {
      var body = JSON.stringify({ type: type, src: SRC, ref: ref ? String(ref) : '' });
      if (navigator.sendBeacon) navigator.sendBeacon('/api/public/track', new Blob([body], { type: 'application/json' }));
      else fetch('/api/public/track', { method: 'POST', headers: { 'content-type': 'application/json' }, body: body, keepalive: true });
    } catch (e) {}
  }

  /* ---------- إعدادات تأتي من لوحة التحكم (تتجاوز config.js) ---------- */
  var appReady = false, pendingSettings = null;
  function applySettings(s) {
    if (!s) return;
    if (!appReady) { pendingSettings = s; return; }
    var B = CFG.business;
    if ('phone' in s) B.phone = s.phone || null;
    if ('whatsapp' in s) B.whatsapp = s.whatsapp || null;
    if ('hours_open' in s || 'hours_close' in s) B.hours = (s.hours_open && s.hours_close) ? { open: s.hours_open, close: s.hours_close } : null;
    if ('review_url' in s) B.reviewUrl = s.review_url || null;
    CFG.notice = (s.notice_active === '1' && s.notice) ? s.notice : '';
    renderText();
  }
  function renderExtras() {
    var rl = $('reviewLink'), url = CFG.business.reviewUrl;
    if (url) { rl.hidden = false; rl.href = url; $('reviewLabel').textContent = t('reviewLabel'); } else { rl.hidden = true; }
    var nb = $('notice'), txt = CFG.notice || '', dismissed = '';
    try { dismissed = sessionStorage.getItem('noticeX') || ''; } catch (e) {}
    if (txt && dismissed !== txt) { nb.hidden = false; $('noticeText').textContent = txt; } else { nb.hidden = true; }
  }

  function init() {
    map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
      minZoom: CFG.zoom.min,
      maxZoom: CFG.zoom.max,
      zoomSnap: 1,
      wheelPxPerZoomLevel: 90,
      worldCopyJump: false
    });

    renderText();
    map.setView(centerFor(mainLatLng, CFG.main.zoom), CFG.main.zoom, { animate: false });

    var g = setLayer(currentLayerKey);
    renderMarkers();
    updateScale();
    map.on('zoomend', updateScale);

    // إخفاء شاشة التحميل عند جاهزية الصور الأولى (مع مهلة أمان)
    var firstTile = g.getLayers()[0];
    firstTile.once('load', hideLoader);
    setTimeout(hideLoader, 6000);

    // إعادة التمركز بعد تحميل الخط (ارتفاع البطاقة قد يتغير) ما لم يتفاعل الزائر
    ['mousedown', 'touchstart', 'wheel', 'keydown'].forEach(function (ev) {
      $('map').addEventListener(ev, function () { userTouchedMap = true; }, { once: true, passive: true });
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        if (!userTouchedMap) map.setView(centerFor(mainLatLng, CFG.main.zoom), CFG.main.zoom, { animate: false });
      });
    }

    // الأزرار
    $('zoomInBtn').addEventListener('click', function () { map.zoomIn(); });
    $('zoomOutBtn').addEventListener('click', function () { map.zoomOut(); });
    $('locateBtn').addEventListener('click', locate);
    $('langBtn').addEventListener('click', function () { setLang(lang === 'ar' ? 'en' : 'ar'); });
    $('layersBtn').addEventListener('click', function () { toggleLayersMenu(); });
    $('nearbyToggle').addEventListener('click', toggleNearby);
    $('rvClose').addEventListener('click', function () { closeRoute(true); });
    $('shareBtn').addEventListener('click', shareSite);
    $('copyAddr').addEventListener('click', function () { copyText(tr(CFG.business.address), t('copied')); });
    initSheetSwipe();
    $('navBtn').addEventListener('click', function () { track('navigate'); });
    $('rvPharmNav').addEventListener('click', function () { track('navigate'); });
    $('callBtn').addEventListener('click', function () { track('call'); });
    $('waBtn').addEventListener('click', function () { track('whatsapp'); });
    $('reviewLink').addEventListener('click', function () { track('review'); });
    $('noticeX').addEventListener('click', function () {
      try { sessionStorage.setItem('noticeX', CFG.notice || ''); } catch (e) {}
      $('notice').hidden = true;
    });
    try { if (!sessionStorage.getItem('viewed')) { sessionStorage.setItem('viewed', '1'); track('view'); } } catch (e) { track('view'); }
    map.on('click', function () { if (selId) closeRoute(false); });

    // إغلاق قائمة الأنماط
    document.addEventListener('click', function (e) {
      var pop = $('layersPop');
      if (!pop.hidden && !pop.contains(e.target) && !$('layersBtn').contains(e.target)) toggleLayersMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { if (!$('layersPop').hidden) { toggleLayersMenu(false); $('layersBtn').focus(); } else if (selId) closeRoute(true); }
    });

    // إعادة تقدير الحجم عند تغيّر الاتجاه/الحجم
    window.addEventListener('resize', function () { map.invalidateSize(); });
    document.documentElement.setAttribute('data-ready', '1');
    appReady = true;
    if (pendingSettings) { var ps = pendingSettings; pendingSettings = null; applySettings(ps); }
  }

  // جسر للمتجر (shop.js)
  window.SiteApp = {
    CFG: CFG, track: track, applySettings: applySettings,
    lang: function () { return lang; }, loc: function (x) { return loc(x); },
    toast: function (m, ms) { toast(m, ms); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
