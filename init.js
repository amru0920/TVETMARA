/* ================================================================
   init.js — MULA APLIKASI
   Diload PALING AKHIR supaya semua modul sudah sedia.
   ================================================================ */

/* Buka terus tab tertentu dari URL, cth "?tab=jadual".
   Digunakan oleh shortcut app (tekan lama ikon di skrin utama). */
function _tabDariURL() {
  try {
    const t = new URLSearchParams(location.search).get('tab');
    if (['kedudukan', 'keputusan', 'mata'].includes(t)) state.tab = t;
  } catch (e) { /* URL pelik — biar tab asal */ }
}

(async () => {
  _tabDariURL();
  await muatData();

  /* JANGAN render() di sini.

     muatData() hanya MENDAFTAR onSnapshot lalu terus pulang — ia tidak
     menunggu data pertama. render() pada ketika ini melukis data benih
     demo yang ditetapkan dalam app.js (pasukan MRSM, jadual 2025),
     menyebabkan kilasan pasukan palsu dan permintaan logo yang 404.

     Setiap laluan dalam muatData() sudah merender sendiri bila data
     sedia: snapshot -> renderSelamat(), dokumen tiada atau ralat ->
     muatDataOffline() -> render().

     Jaring keselamatan: kalau server senyap tanpa ralat, skrin akan
     tersekat pada "Menghubungkan...". Selepas 12 saat, guna salinan
     tempatan supaya pengguna tidak terpandang skrin mati. */
  setTimeout(() => {
    const el = document.getElementById('main-content');
    if (el && el.querySelector('[data-menunggu]')) {
      console.warn('[MULA] Server senyap 12s — guna salinan tempatan.');
      muatDataOffline();
    }
  }, 12000);

  mulaAutoStatus();
})();
