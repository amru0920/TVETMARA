/* ================================================================
   pwa.js — PASANG SPARTA XIII KE SKRIN UTAMA TELEFON
   ================================================================
   · Daftar service worker (sw.js)
   · Papar kad "Pasang Aplikasi" di bawah hero banner
   · Butang Pasang → guna prompt asli Chrome/Edge kalau ada,
     kalau tidak papar modal arahan manual (Android / iPhone)
   · Beritahu pengguna bila ada versi baharu

   Nota: aplikasi tetap LIVE. Ia cuma shortcut ke laman web yang
   sama — data masih datang terus dari Firebase secara masa-nyata.
   ================================================================ */

var _promptPasang = null;                   /* event beforeinstallprompt */
var _KUNCI_SIAP   = 'sparta_pasang_siap';   /* ingat pemasangan berjaya */

/* Papar kad ajakan "Install SPARTA XIII" di bawah hero banner?
   Ditetapkan false: kad itu memakan ruang pada papan kedudukan awam.

   Pemasangan TIDAK dimatikan — manifest, service worker dan
   pwaPasang() semuanya kekal, jadi pengguna masih boleh memasang
   melalui menu pelayar (Chrome: ⋮ → Pasang aplikasi). Tukar kepada
   true untuk mengembalikan kad itu. */
var PAPAR_KAD_PASANG = false;


/* ================================================================
   PENGESANAN PERANTI
   ================================================================ */
function pwaIsIOS() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) ||
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/* Sudah dipasang & dibuka sebagai app? */
function pwaSudahDipasang() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}


/* ================================================================
   KAD PASANG
   ================================================================ */
function pwaPaparKad() {
  const kad = document.getElementById('pwa-kad');
  if (!kad) return;

  /* Kad dimatikan — lihat PAPAR_KAD_PASANG di atas */
  if (!PAPAR_KAD_PASANG) { kad.style.display = 'none'; return; }

  /* Jangan ganggu kalau sedang dibuka sebagai app terpasang */
  if (pwaSudahDipasang()) { kad.style.display = 'none'; return; }

  /* Sudah pernah pasang? Jangan ajak lagi walaupun dibuka dalam pelayar.
     (Chrome tak hantar beforeinstallprompt untuk app yang sudah dipasang,
     jadi tanpa semakan ini kad akan mengganggu tanpa henti.) */
  try {
    if (localStorage.getItem(_KUNCI_SIAP)) { kad.style.display = 'none'; return; }
  } catch (e) { /* localStorage disekat — teruskan papar */ }

  /* Tiada ingatan lain: kad muncul semula setiap kali halaman dibuka.
     "×" hanya menyembunyikannya buat kali ini sahaja. */

  kad.style.display = 'block';
}

function pwaTutupKad() {
  const kad = document.getElementById('pwa-kad');
  if (kad) kad.style.display = 'none';
}


/* ================================================================
   BUTANG PASANG
   ================================================================ */
async function pwaPasang() {
  /* Chrome / Edge Android — guna dialog pemasangan rasmi */
  if (_promptPasang) {
    _promptPasang.prompt();
    const { outcome } = await _promptPasang.userChoice;
    _promptPasang = null;
    if (outcome === 'accepted') pwaTutupKad();
    return;
  }
  /* Safari iOS & pelayar lain — tunjuk arahan manual */
  pwaBukaArahan();
}


/* ================================================================
   MODAL ARAHAN MANUAL
   ================================================================ */
function pwaBukaArahan() {
  const m = document.getElementById('pwa-modal');
  if (!m) return;
  m.style.display = 'flex';
  pwaTukarTab(pwaIsIOS() ? 'ios' : 'android');
}

function pwaTutupArahan(e) {
  /* Kalau dipanggil dari overlay, tutup hanya bila klik di luar kotak */
  if (e && e.target && e.target.id !== 'pwa-modal') return;
  const m = document.getElementById('pwa-modal');
  if (m) m.style.display = 'none';
}

function pwaTukarTab(jenis) {
  document.querySelectorAll('.pwa-tab').forEach(b =>
    b.classList.toggle('aktif', b.dataset.pwaTab === jenis));
  document.querySelectorAll('.pwa-langkah').forEach(d =>
    d.style.display = d.dataset.pwaPanel === jenis ? 'block' : 'none');
}


/* ================================================================
   DAFTAR SERVICE WORKER
   ================================================================ */
function pwaDaftarSW() {
  /* Semak nilainya, bukan sekadar kewujudan kunci: sesetengah
     pelayar dalam-app mendedahkan navigator.serviceWorker sebagai
     undefined, lalu .register() membaling TypeError. */
  if (!navigator.serviceWorker) return;
  /* Service worker perlu HTTPS (atau localhost) */
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;

  /* Tiada ajakan "Muat Semula" lagi. Versi baharu tetap sampai sendiri:
     sw.js memanggil skipWaiting() semasa pasang dan clients.claim()
     semasa aktif, manakala HTML/JS/CSS guna strategi rangkaian-dahulu.
     Jadi kod terbaru diambil pada kali berikut halaman dibuka. */
  navigator.serviceWorker.register('sw.js')
    .catch(err => console.warn('[PWA] Service worker gagal daftar:', err));
}


/* ================================================================
   MULA
   ================================================================ */
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();          /* halang bar automatik Chrome */
  _promptPasang = e;
  pwaPaparKad();
});

window.addEventListener('appinstalled', () => {
  _promptPasang = null;
  try { localStorage.setItem(_KUNCI_SIAP, '1'); } catch (e) {}
  const kad = document.getElementById('pwa-kad');
  if (kad) kad.style.display = 'none';
  pwaTutupArahan();
});

document.addEventListener('DOMContentLoaded', () => {
  pwaDaftarSW();
  /* Kad sentiasa dipapar selagi aplikasi belum dipasang — tak kira
     pelayar. Sebabnya:
       · Chrome Android  → butang Pasang guna dialog rasmi (sekali tekan)
       · Safari iPhone   → tiada beforeinstallprompt, butang buka arahan
       · Pelayar lain    → butang buka arahan manual
     Pengguna yang tak berminat boleh tekan × untuk sembunyikannya. */
  pwaPaparKad();
});
