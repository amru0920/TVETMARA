/* ================================================================
   init.js — MULA APLIKASI
   Diload PALING AKHIR supaya semua modul sudah sedia.
   ================================================================ */

/* Buka terus tab tertentu dari URL, cth "?tab=jadual".
   Digunakan oleh shortcut app (tekan lama ikon di skrin utama). */
function _tabDariURL() {
  try {
    const t = new URLSearchParams(location.search).get('tab');
    if (['kedudukan', 'keputusan', 'jadual', 'streaming'].includes(t)) state.tab = t;
  } catch (e) { /* URL pelik — biar tab asal */ }
}

(async () => {
  _tabDariURL();
  await muatData();
  render();
  mulaAutoStatus();
})();
