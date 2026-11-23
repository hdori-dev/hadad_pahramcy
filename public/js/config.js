/* ==========================================================================
   إعدادات الموقع / Site configuration
   كل ما يخص المحتوى والخرائط في هذا الملف. عدّل هنا دون لمس بقية الكود.
   Everything content- or tile-related lives here.
   ========================================================================== */
window.SITE_CONFIG = {
  defaultLang: 'ar',

  business: {
    name: { ar: 'صيدلية الحداد التعليمية', en: 'Al-Haddad Educational Pharmacy' },
    category: { ar: 'صيدلية تعليمية', en: 'Educational Pharmacy' },
    description: {
      ar: 'صيدلية تجمع بين خدمات الصيدلة والتدريب والتثقيف الصحي في مدينة الناصرية.',
      en: 'A pharmacy that combines pharmaceutical services, training, and health education in Nasiriyah.'
    },
    address: {
      ar: 'الناصرية - قرب ماس مول - عمارة مكة سنتر',
      en: 'Nasiriyah – Near Mass Mall – Makkah Center Building'
    },
    phone: '+9647812200554',      // زر الاتصال (null = مخفي)
    whatsapp: '+9647812200554',   // زر واتساب (null = مخفي)
    website: null,                // مثال: 'https://example.com'
    photo: null,                  // صورة واجهة الصيدلية، مثال: 'assets/storefront.jpg' (تظهر في قسم التفاصيل)
    // ساعات الدوام (توقيت بغداد). مثال: { open: '09:00', close: '23:00' } — null = لا تُعرض شارة «مفتوح الآن»
    hours: null
  },

  // الموقع الرئيسي والتقريب الأولي
  main: { lat: 31.04005724258767, lng: 46.24170560412786, zoom: 17 },

  zoom: { min: 12, max: 19 },

  // خدمة المسارات (OSRM العامة، بلا مفتاح). بدّل الرابط عند الانتقال لخدمة أخرى.
  routing: { url: 'https://router.project-osrm.org/route/v1/driving/', extraSeconds: 30, timeoutMs: 10000 },

  defaultLayer: 'satellite',

  // ألوان الهوية (نفس القيم في css/style.css)
  colors: { primary: '#1A8F83', secondary: '#1F5FBF' },

  /* نقاط الاهتمام.  icon: pharmacy | building | statue | bridge | hospital
     baseSize = الحجم بالبكسل عند مستوى التقريب 17، ويتناسب مع التقريب/التبعيد */
  markers: [
    {
      id: 'mass-mall', icon: 'building', color: '#1F5FBF', baseSize: 28,
      lat: 31.03969647899802, lng: 46.24137572017099,
      name: { ar: 'ماس مول', en: 'Mass Mall' },
      type: { ar: 'مبنى تجاري', en: 'Commercial building' },
      description: null
    },
    {
      id: 'abu-tahseen-statue', icon: 'statue', color: '#1F5FBF', baseSize: 28,
      lat: 31.04020777643765, lng: 46.2410926707962,
      name: { ar: 'تمثال الشهيد أبو تحسين الصالحي', en: 'Martyr Abu Tahseen Al-Salehi Statue' },
      type: { ar: 'تمثال', en: 'Statue' },
      description: null
    },
    {
      id: 'al-nasr-bridge', icon: 'bridge', color: '#1F5FBF', baseSize: 28,
      lat: 31.043922117706465, lng: 46.24360101610379,
      name: { ar: 'جسر النصر', en: 'Al-Nasr Bridge' },
      type: { ar: 'جسر', en: 'Bridge' },
      description: null
    },
    {
      id: 'al-rahman-hospital', icon: 'hospital', color: '#1A8F83', baseSize: 28,
      lat: 31.032378945219598, lng: 46.23644370836844,
      name: { ar: 'مستشفى الرحمن الأهلي', en: 'Al-Rahman Private Hospital' },
      type: { ar: 'مستشفى', en: 'Hospital' },
      description: null
    },
    {
      id: 'al-azhar-hospital', icon: 'hospital', color: '#1A8F83', baseSize: 28,
      lat: 31.034837910142997, lng: 46.234066781819045,
      name: { ar: 'مستشفى الأزهر الأهلي', en: 'Al-Azhar Private Hospital' },
      type: { ar: 'مستشفى', en: 'Hospital' },
      description: null
    }
  ],

  // أيقونة الصيدلية الرئيسية
  mainMarker: { icon: 'pharmacy', color: '#1A8F83', baseSize: 44 },

  /* ======================================================================
     مزوّدو صور الخريطة (Tile providers)
     ----------------------------------------------------------------------
     لا يوجد مفتاح API. كل مزوّد له شروط استخدام وحدود، ويجب إبقاء الإسناد.
     لتغيير المزوّد (مثلاً لمزوّد مدفوع بمفتاح) عدّل الرابط هنا فقط.
     maxNativeZoom: أعلى مستوى تتوفر عنده الصور فعلاً؛ فوقه تُكبَّر الصورة
     بدل أن تظهر مربعات فارغة.
     ====================================================================== */
  layers: {
    hybrid: {
      label: { ar: 'هجين', en: 'Hybrid' },
      tiles: [
        { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', maxNativeZoom: 18 },
        { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', maxNativeZoom: 18 },
        { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', maxNativeZoom: 18 }
      ],
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community'
    },
    satellite: {
      label: { ar: 'قمر صناعي', en: 'Satellite' },
      tiles: [
        { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', maxNativeZoom: 18 }
      ],
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community'
    },
    standard: {
      label: { ar: 'عادي', en: 'Standard' },
      tiles: [
        { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', maxNativeZoom: 19 }
      ],
      attribution: 'Esri'
    },
    light: {
      label: { ar: 'فاتح مبسّط', en: 'Minimal Light' },
      tiles: [
        { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', maxNativeZoom: 16 }
      ],
      attribution: 'Esri'
    },
    dark: {
      label: { ar: 'داكن', en: 'Dark' },
      tiles: [
        { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', maxNativeZoom: 16 }
      ],
      attribution: 'Esri'
    },
    terrain: {
      label: { ar: 'تضاريس', en: 'Terrain' },
      tiles: [
        { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', maxNativeZoom: 18 }
      ],
      attribution: 'Esri'
    }
  },

  /* نصوص الواجهة */
  ui: {
    ar: {
      langButton: 'English',
      langButtonLabel: 'Switch to English',
      pageTitle: 'صيدلية الحداد التعليمية | الناصرية',
      metaDescription: 'موقع صيدلية الحداد التعليمية في الناصرية على الخريطة، مع المعالم القريبة وزر الوصول بالملاحة.',
      address: 'العنوان',
      navigate: 'الوصول إلى الصيدلية',
      nearby: 'معالم قريبة',
      showNearby: 'عرض المعالم القريبة',
      hideNearby: 'إخفاء المعالم القريبة',
      nearbyHint: 'المسافة عن الصيدلية',
      zoomIn: 'تكبير',
      zoomOut: 'تصغير',
      locate: 'موقعي',
      fullscreen: 'ملء الشاشة',
      exitFullscreen: 'إنهاء ملء الشاشة',
      layers: 'نمط الخريطة',
      mapLabel: 'خريطة موقع صيدلية الحداد التعليمية',
      distanceFromYou: 'تبعد عنك {d} تقريباً (مسافة بخط مستقيم وليست مسافة الطريق)',
      locating: 'جارٍ تحديد موقعك…',
      errDenied: 'لم يُسمح بالوصول إلى موقعك. فعّل إذن الموقع من إعدادات المتصفح ثم حاول مجدداً.',
      errUnavailable: 'تعذّر تحديد موقعك حالياً.',
      errTimeout: 'انتهت مهلة تحديد الموقع، حاول مرة أخرى.',
      errUnsupported: 'متصفحك لا يدعم تحديد الموقع.',
      errTiles: 'تعذّر تحميل جزء من صور الخريطة. تحقق من اتصالك بالإنترنت.',
      youAreHere: 'موقعك الحالي',
      mapData: 'مصدر الخريطة',
      mapStyle: 'نمط الخريطة',
      call: 'اتصال',
      website: 'الموقع الإلكتروني',
      unitM: 'م',
      unitKm: 'كم',
      loading: 'جارٍ التحميل',
      routeLoading: 'جارٍ حساب المسار…',
      routeByCar: 'بالسيارة',
      routeLess: 'أقل من دقيقة',
      routeFail: 'تعذّر رسم المسار حالياً، يظهر خط مستقيم تقريبي.',
      routeNote: 'تقدير تقريبي لمدة القيادة، ويشمل 30 ثانية إضافية',
      routeViaRoad: 'عبر الطريق',
      routeStraight: 'خط مستقيم',
      routeTime: 'مدة الوصول',
      routeDistance: 'المسافة',
      routeOpenMaps: 'افتح المسار في الخرائط',
      close: 'إغلاق',
      creditText: 'أنشئ خريطة لعملك التجاري مع Blaze',
      creditBtn: 'أنشئ الآن',
      whatsapp: 'واتساب',
      share: 'مشاركة',
      copyAddress: 'نسخ العنوان',
      copied: 'تم نسخ العنوان',
      linkCopied: 'تم نسخ الرابط',
      openNow: 'مفتوح الآن',
      closedNow: 'مغلق الآن',
      untilTime: 'حتى {t}',
      opensAtTime: 'يفتح {t}',
      routeFromHere: 'افتح مسار هذا المعلم في الخرائط',
      distanceByCar: 'تبعد عنك {t} بالسيارة تقريباً ({d})',
      swipeHint: 'اسحب لعرض المزيد',
      reviewLabel: 'قيّمنا على خرائط جوجل',
      shareNear: 'قرب',
      shareLocation: 'الموقع على الخريطة'
    },
    en: {
      langButton: 'العربية',
      langButtonLabel: 'التبديل إلى العربية',
      pageTitle: 'Al-Haddad Educational Pharmacy | Nasiriyah',
      metaDescription: 'Location of Al-Haddad Educational Pharmacy in Nasiriyah on the map, with nearby landmarks and one-tap navigation.',
      address: 'Address',
      navigate: 'Get directions',
      nearby: 'Nearby landmarks',
      showNearby: 'Show nearby landmarks',
      hideNearby: 'Hide nearby landmarks',
      nearbyHint: 'Distance from pharmacy',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
      locate: 'My location',
      fullscreen: 'Fullscreen',
      exitFullscreen: 'Exit fullscreen',
      layers: 'Map style',
      mapLabel: 'Map showing Al-Haddad Educational Pharmacy',
      distanceFromYou: 'About {d} from you (straight-line distance, not by road)',
      locating: 'Finding your location…',
      errDenied: 'Location access was denied. Enable location permission in your browser settings and try again.',
      errUnavailable: 'Your location is unavailable right now.',
      errTimeout: 'Locating timed out, please try again.',
      errUnsupported: 'Your browser does not support geolocation.',
      errTiles: 'Some map tiles failed to load. Please check your internet connection.',
      youAreHere: 'Your location',
      mapData: 'Map data',
      mapStyle: 'Map style',
      call: 'Call',
      website: 'Website',
      unitM: 'm',
      unitKm: 'km',
      loading: 'Loading',
      routeLoading: 'Calculating route…',
      routeByCar: 'By car',
      routeLess: 'Under 1 min',
      routeFail: 'Could not draw the route now; showing an approximate straight line.',
      routeNote: 'Approximate driving time, including 30 extra seconds',
      routeViaRoad: 'by road',
      routeStraight: 'straight line',
      routeTime: 'Travel time',
      routeDistance: 'Distance',
      routeOpenMaps: 'Open route in Maps',
      close: 'Close',
      creditText: 'Get a map for your business with Blaze',
      creditBtn: 'Create yours',
      whatsapp: 'WhatsApp',
      share: 'Share',
      copyAddress: 'Copy address',
      copied: 'Address copied',
      linkCopied: 'Link copied',
      openNow: 'Open now',
      closedNow: 'Closed now',
      untilTime: 'until {t}',
      opensAtTime: 'opens {t}',
      routeFromHere: 'Open this landmark\'s route in Maps',
      distanceByCar: 'About {t} from you by car ({d})',
      swipeHint: 'Swipe for more',
      reviewLabel: 'Rate us on Google Maps',
      shareNear: 'Near',
      shareLocation: 'Location on the map'
    }
  }
};
