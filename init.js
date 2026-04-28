/* ================================================================
   init.js — MULA APLIKASI
   Diload PALING AKHIR supaya semua modul sudah sedia.
   ================================================================ */
(async () => {
  await muatData();
  render();
  mulaAutoStatus();
})();