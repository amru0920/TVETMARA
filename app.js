/* ================================================================
   app.js — OTAK UTAMA APLIKASI SPEKMA
   ================================================================
   simpanData() dan muatData() diurus oleh firebase.js
   ================================================================ */

/* state dideklarasi dalam data.js — isi nilai betul di sini.

   pasukan/sukan/jadual SENGAJA dibiar kosong. Dahulu ia disemai
   dengan PASUKAN_ASAL/SUKAN_ASAL/JADUAL_ASAL (pasukan MRSM dan jadual
   2025 demo). Akibatnya:
     · skrin melukis pasukan palsu sekelip mata sebelum data server
       tiba, dan meminta fail logo yang memang tiada (ralat 404)
     · lebih bahaya, data demo itu pernah tertulis ke pangkalan data
       sebenar dan mencemarkan jadual pertandingan

   Kosong lebih selamat: kalau server belum jawab, skrin menunggu;
   kalau offline, muatDataOffline() memulihkan salinan localStorage.
   Pemalar ASAL itu dikekalkan dalam data.js/jadual.js sebagai rujukan.

   staff & password kekal disemai supaya admin masih boleh log masuk
   ketika sambungan gagal. */
Object.assign(state, {
  pasukan:       [],
  sukan:         [],
  jadual:        [],
  staff:         [...STAFF_ASAL],
  password:      PASSWORD_TETAP,
  formatSukan:   { ...FORMAT_ASAL },
  kumpulanSukan: JSON.parse(JSON.stringify(KUMPULAN_ASAL)),
});


/* ================================================================
   BERSIHKAN STATUS (LIVE > 4 jam → reset)
   ================================================================ */
/* ================================================================
   STATUS PAPARAN — dikira, TIDAK PERNAH disimpan
   ================================================================
   Dahulu tiga fungsi mengubah m.status secara automatik mengikut jam
   (Akan Datang -> LIVE bila masa tiba; LIVE -> Akan Datang selepas
   4 jam). Mutasi itu berlaku pada salinan TEMPATAN yang mungkin
   lapuk, kemudian gabungan menganggapnya "perubahan saya" dan
   menulisnya ke server — memadam status yang admin lain baru simpan,
   yang seterusnya menyembunyikan skor mereka.

   Sekarang status automatik dikira semasa render sahaja. Hanya
   pilihan admin yang benar-benar disimpan.
   ================================================================ */
function statusPaparan(m) {
  if (!m) return 'akan_datang';
  const asal = m.status || 'akan_datang';

  /* Pilihan admin sentiasa menang */
  if (asal === 'selesai') return 'selesai';
  if (!m.tarikh || !m.masa) return asal;

  const bezaJam = (new Date() - new Date(m.tarikh + 'T' + m.masa + ':00')) / 3600000;
  const adaSkor = (m.scoreRumah || 0) > 0 || (m.scoreTamu || 0) > 0;

  /* Masa sudah tiba (dalam 4 jam) -> papar LIVE */
  if (asal === 'akan_datang' && bezaJam >= 0 && bezaJam < 4) return 'sedang_berlangsung';

  /* LIVE lebih 4 jam tanpa sebarang skor -> lampu basi, papar Akan Datang */
  if (asal === 'sedang_berlangsung' && bezaJam >= 4 && !adaSkor) return 'akan_datang';

  return asal;
}

/* Salinan rekod dengan status paparan — untuk render, bukan untuk simpan */
function utkPapar(m) {
  return m ? Object.assign({}, m, { status: statusPaparan(m) }) : m;
}


/* ================================================================
   KIRA KEDUDUKAN
   ================================================================ */
function getKedudukan() {
  /* PINGAT dan MATA kini dua sumber yang BERASINGAN:
       · pingat  \u2190 tab Pingat (siapa Tempat 1/2/3 setiap kategori)
       · mata    \u2190 tab Mata  (markah dimuat naik melalui CSV)
     Kedudukan pingat tidak lagi memberi sebarang mata. */
  const medal = {};
  (state.pasukan || []).forEach(p => { medal[p] = [0, 0, 0]; });

  (state.sukan || []).forEach(s => (s.acara || []).forEach(a => {
    const r = state.keputusan[a.id];
    if (!r) return;
    [1, 2, 3].forEach(pos => {
      const nama = r[pos];
      if (nama && medal[nama]) medal[nama][pos - 1]++;
    });
  }));

  return (state.pasukan || []).map(p => ({
    nama:   p,
    emas:   medal[p][0],
    perak:  medal[p][1],
    gangsa: medal[p][2],
    mata:   jumlahMata(p),
  })).sort((a, b) =>
    b.mata - a.mata || b.emas - a.emas ||
    b.perak - a.perak || b.gangsa - a.gangsa
  );
}

function countDone(s) {
  return s.acara.filter(a => state.keputusan[a.id]?.[1]).length;
}
function totalAcara()   { return state.sukan.reduce((n, s) => n + s.acara.length, 0); }
function totalSelesai() { return Object.values(state.keputusan).filter(r => r[1]).length; }


/* ================================================================
   RENDER — TAB KEDUDUKAN
   ================================================================ */
function renderKedudukan() {
  const standings = getKedudukan();
  const rows = standings.map((t, i) => `
    <tr class="${i < 3 ? 'top3' : ''}">
      <td><span class="rank ${i===0?'r1':i===1?'r2':i===2?'r3':''}">${i + 1}</span></td>
      <td>
        ${i === 0 ? '<div class="leader-bar"></div>' : ''}
        <div class="team-cell">
          ${htmlLogoPusat(t.nama, 30)}
          <span class="team-name">${t.nama}</span>
        </div>
      </td>
      <td><span class="medal-dot m-e">${t.emas   || '—'}</span></td>
      <td><span class="medal-dot m-p">${t.perak  || '—'}</span></td>
      <td><span class="medal-dot m-g">${t.gangsa || '—'}</span></td>
      <td><span class="pts-badge">${t.mata}</span></td>
    </tr>
  `).join('');

  return `
    <div class="stats-bar">
      <div class="stat-card">
        <div class="stat-num">${state.pasukan.length}</div>
        <div class="stat-lbl">Pusat</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">${(state.sukan || []).length}</div>
        <div class="stat-lbl">Sukan</div>
      </div>
    </div>
    <table class="stand-table">
      <thead>
        <tr>
          <th style="width:40px">#</th>
          <th>Pasukan</th>
          <th>🥇</th><th>🥈</th><th>🥉</th>
          <th>Mata</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}


/* ================================================================
   RENDER UTAMA
   ================================================================ */
function render() {
  const tabList = ['kedudukan', 'keputusan', 'mata'];
  document.querySelectorAll('.topbar-nav .nav-btn').forEach((btn, i) => {
    if (tabList[i]) btn.classList.toggle('active', tabList[i] === state.tab);
  });
  const tetapanBtn = document.querySelector('.tetapan-btn');
  if (tetapanBtn) tetapanBtn.classList.toggle('active', state.tab === 'tetapan');

  /* Bar navigasi bawah (telefon) */
  document.querySelectorAll('.bawah-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.tab === state.tab));

  /* Kawalan staff tersembunyi sehingga logo ditekan 5 kali */
  if (typeof kemasPandanganStaff === 'function') kemasPandanganStaff();

  /* Jadual dan Live sudah dibuang dari navigasi. Kodnya dikekalkan,
     tetapi apa-apa keadaan lama (URL ?tab=, sesi tersimpan) dialihkan
     supaya skrin tidak kekal kosong. */
  if (state.tab === 'jadual' || state.tab === 'streaming') state.tab = 'kedudukan';

  const el = document.getElementById('main-content');
  if (!el) return;

  /* Paparan dibina semula — amaran segerak tak relevan lagi */
  if (typeof tutupToastSegerak === 'function') tutupToastSegerak();

  if      (state.tab === 'kedudukan') el.innerHTML = renderKedudukan();
  else if (state.tab === 'keputusan') el.innerHTML = renderKeputusan();
  else if (state.tab === 'mata')      el.innerHTML = renderMata();
  else if (state.tab === 'jadual')    el.innerHTML = renderJadual();
  else if (state.tab === 'streaming') el.innerHTML = state.streamTab === 'urus' && state.staffLogin
                                                        ? renderUrusStreaming()
                                                        : renderStreaming();
  else if (state.tab === 'tetapan')   el.innerHTML = renderTetapan();
}


/* ================================================================
   NAVIGASI
   ================================================================ */
function setTab(tab) {
  if (tab === 'tetapan' && !state.staffLogin) { bukaPanelLogin(); return; }
  state.tab               = tab;
  state.selectedSukan     = null;
  state.editingAcara      = null;
  state.editingPerlawanan = null;
  if (tab !== 'jadual') state.jadualSukanTab = null;
  if (tab !== 'mata')   state.mataPusat = null;
  if (tab === 'jadual') semakAutoStatus();
  render();
}

function pilihSukan(id)  { state.selectedSukan = id; state.editingAcara = null; render(); }
function goBack()        { state.selectedSukan = null; state.editingAcara = null; render(); }

/* Butang terakhir bar bawah — log masuk, atau terus ke Tetapan */
function bawahStaff() {
  if (state.staffLogin) setTab('tetapan');
  else bukaPanelLogin();
}

function togolJadualPenuh(sukanId) {
  state.jadualPenuhMode = state.jadualPenuhMode === sukanId ? null : sukanId;
  state.drawMode = null;
  render();
}

function togolDrawMode(sukanId) {
  state.drawMode        = state.drawMode === sukanId ? null : sukanId;
  state.jadualPenuhMode = null;
  render();
}


/* ================================================================
   MULA APLIKASI
   muatData() dipanggil dari firebase.js selepas data diload
   ================================================================ */
/* dimulakan dari init.js */

/* ================================================================
   PENYEGERAKAN SELAMAT — bila beberapa admin guna serentak
   ================================================================
   Masalah: onSnapshot mencetuskan render() setiap kali MANA-MANA
   admin menyimpan. render() menulis semula innerHTML, jadi borang
   yang admin lain sedang isi terus lenyap di tengah jalan.

   Penyelesaian: state SENTIASA dikemas kini dari server (supaya
   tiada data hilang semasa simpan), tetapi PAPARAN ditangguhkan
   selagi ada borang terbuka. Bila admin tekan Simpan atau Batal,
   render() biasa berjalan dan terus memaparkan data terkini.
   ================================================================ */

/* Bila kali terakhir pengguna menaip?

   document.activeElement sahaja tidak memadai. Admin selalu menaip
   nama kategori, lalu menatal atau klik di tempat lain sebelum
   menekan Tambah. Ketika itu fokus sudah keluar dari medan, dan
   render() akan memadam apa yang baru ditaip.

   Jadi kita beri tempoh perlindungan selepas ketukan kekunci
   terakhir. Guna fasa tangkap supaya medan dalam modal pun dikesan. */
var _masaTaipTerakhir = 0;
var TEMPOH_TAIP = 15000;
document.addEventListener('input',
  () => { _masaTaipTerakhir = Date.now(); }, true);

/* Adakah pengguna sedang mengisi sesuatu? */
function adaBorangTerbuka() {
  if (Date.now() - _masaTaipTerakhir < TEMPOH_TAIP) return true;

  if (state.editingPerlawanan || state.editingAcara ||
      state.bracketEdit || state.rrEditingMatch) return true;

  /* Muat naik CSV: dialog fail OS menarik fokus keluar dari halaman,
     jadi activeElement sahaja tidak memadai. Lihat csvSedangDiisi(). */
  if (typeof csvSedangDiisi === 'function' && csvSedangDiisi()) return true;

  /* Panel Tetapan tiada bendera edit — semak kursor pengguna pula */
  const el = document.activeElement;
  return !!(el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName));
}

/* Dipanggil oleh onSnapshot, bukan oleh tindakan pengguna */
function renderSelamat() {
  if (adaBorangTerbuka()) { paparToastSegerak(); return; }
  render();
}

/* Beritahu admin bahawa data berubah, tanpa mengganggu borang */
var _masaToastSegerak = null;
function paparToastSegerak() {
  const t = document.getElementById('sync-toast');
  if (!t) return;
  t.style.display = 'flex';
  clearTimeout(_masaToastSegerak);
  _masaToastSegerak = setTimeout(() => { t.style.display = 'none'; }, 6000);
}

function tutupToastSegerak() {
  const t = document.getElementById('sync-toast');
  if (t) t.style.display = 'none';
  clearTimeout(_masaToastSegerak);
}


/* ================================================================
   AMARAN SIMPAN GAGAL
   ================================================================
   simpanData() dulu hanya console.warn bila Firebase menolak tulisan.
   Semasa pertandingan itu bermakna skor hilang secara senyap dan admin
   hanya sedar selepas muat semula. Sekarang ia dipapar terus.
   ================================================================ */
function paparRalatSimpan(e) {
  const t = document.getElementById('ralat-toast');
  if (!t) { alert('Gagal simpan ke server: ' + (e && e.message ? e.message : e)); return; }
  const msg = document.getElementById('ralat-toast-teks');
  if (msg) {
    msg.textContent =
      (e && e.code === 'permission-denied')
        ? 'VERSI LAMA — server menolak simpanan anda. Skor BELUM tersimpan. ' +
          'Tutup aplikasi sepenuhnya dan buka semula (atau Ctrl+Shift+R), ' +
          'kemudian masukkan semula.'
      : (e && e.code === 'belum-sedia')
        ? 'Data server belum dimuat sepenuhnya. Simpanan DIHALANG untuk ' +
          'melindungi jadual sebenar. Muat semula halaman dan cuba lagi.'
      : (e && e.code === 'mismatch')
        ? 'Simpanan TIDAK mendarat di server (' + (e.medan || []).join(', ') + '). ' +
          'Kemungkinan admin lain menimpanya pada masa yang sama — sila periksa dan simpan semula.'
        : 'Gagal simpan ke server. Skor BELUM tersimpan — semak internet dan cuba simpan semula.';
  }
  t.style.display = 'flex';
}

function tutupRalatSimpan() {
  const t = document.getElementById('ralat-toast');
  if (t) t.style.display = 'none';
}


/* ================================================================
   AMARAN KONFLIK SUNTINGAN
   ================================================================
   Bila borang dibuka, kita rakam rupa rekod itu pada saat itu.
   Kerana onSnapshot sentiasa mengemas kini state walaupun borang
   terbuka, rekod dalam state akan berubah kalau admin lain
   menyimpannya. Jadi semasa Simpan, cukup bandingkan semula —
   tiada bacaan tambahan ke server diperlukan.

   Kalau ia berubah, admin diberitahu dan DIA yang putuskan.
   Tiada apa-apa ditimpa tanpa pengetahuannya.
   ================================================================ */

var _asasEdit = null;   /* { kunci, cap } */

function mulaJejakKonflik(kunci, rekod) {
  _asasEdit = {
    kunci: kunci,
    cap:   JSON.stringify(rekod === undefined ? null : rekod),
    /* Salinan rekod SEPERTI YANG DIPAPAR dalam borang. Inilah dasar
       sebenar niat admin: apa-apa medan yang mereka tidak sentuh akan
       sama dengan salinan ini, jadi ia mesti dikira "bukan perubahan
       saya" dan nilai server dikekalkan. */
    rekod: (rekod === undefined || rekod === null)
      ? null : JSON.parse(JSON.stringify(rekod)),
  };
}

function lupakanJejakKonflik() { _asasEdit = null; }

/* Dibaca oleh simpanData() dalam firebase.js */
function asasBorang() { return _asasEdit; }

/* Pulangkan true kalau selamat diteruskan.
   teksMereka / teksSaya = ringkasan pendek untuk dipapar. */
function izinSimpanKonflik(kunci, rekodSekarang, teksMereka, teksSaya) {
  if (!_asasEdit || _asasEdit.kunci !== kunci) return true;

  const cap = JSON.stringify(rekodSekarang === undefined ? null : rekodSekarang);
  if (cap === _asasEdit.cap) return true;      /* tiada sesiapa menyentuhnya */

  return confirm(
    '\u26a0 ADMIN LAIN BARU MENGUBAH REKOD INI\n\n' +
    'Semasa borang anda terbuka, seseorang menyimpan perubahan.\n\n' +
    'Di server sekarang:\n   ' + teksMereka + '\n\n' +
    'Yang anda masukkan:\n   ' + teksSaya + '\n\n' +
    'OK    = simpan nilai ANDA (menimpa nilai mereka)\n' +
    'Batal = buang suntingan anda dan lihat nilai mereka'
  );
}

/* Ringkasan pendek satu perlawanan, untuk dialog di atas */
function ringkasPerlawanan(m) {
  if (!m) return '(rekod sudah dipadam)';
  const skor = (m.status === 'akan_datang')
    ? 'belum bermula'
    : (m.scoreRumah || 0) + ' - ' + (m.scoreTamu || 0);
  return (m.rumah || '?') + ' ' + skor + ' ' + (m.tamu || '?') +
         '   [' + (m.masa || '-') + ', ' + (m.gelanggang || '-') + ']';
}


/* ================================================================
   AKSES STAFF TERSEMBUNYI
   ================================================================
   Butang Staff disembunyikan daripada orang awam. Tekan logo
   SPARTA lima kali berturut-turut untuk mendedahkannya.

   Ini menyembunyikan, bukan mengunci — kata laluan tetap menjaga
   akses sebenar. Tujuannya supaya orang awam tidak tergoda menekan
   butang yang bukan untuk mereka.
   ================================================================ */

var _klikLogo      = 0;
var _masaKlikLogo  = null;
var _staffTerbuka  = false;      /* sesi semasa sahaja */

const KLIK_PERLU   = 5;
const TEMPOH_KLIK  = 3000;       /* semua klik mesti dalam 3 saat */

/* Staff boleh dilihat kalau sudah log masuk, atau baru dibuka */
function staffBolehLihat() {
  return !!state.staffLogin || _staffTerbuka;
}

/* Logo: sentiasa balik ke Kedudukan, sambil mengira klik */
function klikLogo() {
  clearTimeout(_masaKlikLogo);
  _klikLogo++;
  _masaKlikLogo = setTimeout(() => { _klikLogo = 0; }, TEMPOH_KLIK);

  if (!staffBolehLihat() && _klikLogo >= KLIK_PERLU) {
    _klikLogo = 0;
    _staffTerbuka = true;
    kemasPandanganStaff();
    paparToastStaff();
  }

  setTab('kedudukan');
}

/* Papar atau sembunyikan setiap kawalan staff */
function kemasPandanganStaff() {
  const nampak = staffBolehLihat();

  const btnBawah = document.getElementById('bawah-staff');
  if (btnBawah) btnBawah.style.display = nampak ? 'flex' : 'none';

  const btnLogin = document.getElementById('btn-buka-login');
  if (btnLogin && !state.staffLogin) btnLogin.style.display = nampak ? '' : 'none';
}

function paparToastStaff() {
  const t = document.getElementById('staff-toast');
  if (!t) return;
  t.style.display = 'flex';
  setTimeout(() => { t.style.display = 'none'; }, 4000);
}

/* Sembunyikan semula selepas log keluar */
function tutupAksesStaff() {
  _staffTerbuka = false;
  _klikLogo = 0;
  kemasPandanganStaff();
}
