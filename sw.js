/* ================================================================
   sw.js — SERVICE WORKER SPARTA XIII
   ================================================================
   Tujuan: benarkan aplikasi dipasang ke skrin utama telefon
   (shortcut) tetapi kandungan KEKAL LIVE.

   Strategi:
   · Halaman & kod (HTML/JS/CSS) → NETWORK FIRST
     Sentiasa ambil versi terbaru dari server. Cache hanya jadi
     simpanan kecemasan bila internet putus.
   · Gambar/maskot/ikon → STALE WHILE REVALIDATE
     Papar segera dari cache, kemas kini di belakang tabir.
   · Firebase / Firestore / Google Fonts → TIDAK DISENTUH langsung.
     Semua permintaan luar domain dibiar lalu terus ke rangkaian,
     supaya sync masa-nyata (onSnapshot) tak terjejas.

   PENTING: naikkan nombor VERSI setiap kali kod dikemas kini,
   supaya cache lama dibuang automatik.
   ================================================================ */

const VERSI       = 'v13';
const CACHE_SHELL = 'sparta-shell-' + VERSI;
const CACHE_MEDIA = 'sparta-media-' + VERSI;

/* Fail teras aplikasi — disimpan semasa pemasangan */
const SHELL = [
  './',
  './index.html',
  './style.css',
  './config.js',
  './data.js',
  './auth.js',
  './format.js',
  './roundrobin.js',
  './streaming.js',
  './peringkat.js',
  './badminton.js',
  './cetak.js',
  './keputusan.js',
  './jadual.js',
  './tetapan.js',
  './log_aktiviti.js',
  './app.js',
  './firebase.js',
  './init.js',
  './pwa.js',
  './manifest.json',
  './assets/logo-sparta-xiii.png',
  './assets/maskot-sparta-xiii.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
];


/* ================================================================
   PASANG — simpan fail teras
   ================================================================ */
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_SHELL);
    /* addAll() gagal semua kalau satu fail tersasar — jadi simpan
       satu per satu supaya pemasangan tetap berjaya. */
    await Promise.all(SHELL.map(async (url) => {
      try { await cache.add(new Request(url, { cache: 'reload' })); }
      catch (err) { console.warn('[SW] Langkau cache:', url); }
    }));
    self.skipWaiting();
  })());
});


/* ================================================================
   AKTIF — buang cache versi lama
   ================================================================ */
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const nama = await caches.keys();
    await Promise.all(
      nama.filter(n => n.startsWith('sparta-') && n !== CACHE_SHELL && n !== CACHE_MEDIA)
          .map(n => caches.delete(n))
    );
    await self.clients.claim();
  })());
});


/* ================================================================
   AMBIL — pilih strategi ikut jenis permintaan
   ================================================================ */
self.addEventListener('fetch', (e) => {
  const req = e.request;

  /* Hanya GET. POST/PUT (tulis ke Firebase) dibiar terus ke rangkaian. */
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  /* Domain luar (Firestore, Google Fonts, YouTube embed) — jangan sentuh.
     Ini yang memastikan skor kekal masa-nyata. */
  if (url.origin !== self.location.origin) return;

  /* Buka halaman / navigasi */
  if (req.mode === 'navigate') {
    e.respondWith(rangkaianDulu(req, CACHE_SHELL, './index.html'));
    return;
  }

  /* Gambar & font — papar cepat, kemas kini di belakang */
  if (req.destination === 'image' || req.destination === 'font') {
    e.respondWith(cacheDuluKemasBelakang(req, CACHE_MEDIA));
    return;
  }

  /* Selebihnya (JS, CSS, manifest) — sentiasa cuba rangkaian dulu */
  e.respondWith(rangkaianDulu(req, CACHE_SHELL));
});


/* ================================================================
   STRATEGI
   ================================================================ */

/* Rangkaian dulu; guna cache hanya bila offline */
async function rangkaianDulu(req, namaCache, gantian) {
  try {
    const res = await fetch(req);
    if (res && res.ok && res.type === 'basic') {
      const cache = await caches.open(namaCache);
      cache.put(req, res.clone());
    }
    return res;
  } catch (err) {
    const cached = await caches.match(req);
    if (cached) return cached;
    if (gantian) {
      const asas = await caches.match(gantian);
      if (asas) return asas;
    }
    throw err;
  }
}

/* Papar dari cache serta-merta, muat turun versi baru di belakang tabir */
async function cacheDuluKemasBelakang(req, namaCache) {
  const cache  = await caches.open(namaCache);
  const cached = await cache.match(req);

  const segar = fetch(req).then(res => {
    if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
    return res;
  }).catch(() => null);

  return cached || (await segar) || Response.error();
}


/* ================================================================
   MESEJ DARI HALAMAN — pasang versi baharu serta-merta
   ================================================================ */
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
