/* ================================================================
   app.js — OTAK UTAMA APLIKASI SPEKMA
   ================================================================
   simpanData() dan muatData() diurus oleh firebase.js
   ================================================================ */

/* state dideklarasi dalam data.js — isi nilai betul di sini */
Object.assign(state, {
  pasukan:       [...PASUKAN_ASAL],
  sukan:         [...SUKAN_ASAL],
  jadual:        [...JADUAL_ASAL],
  staff:         [...STAFF_ASAL],
  password:      PASSWORD_TETAP,
  formatSukan:   { ...FORMAT_ASAL },
  kumpulanSukan: JSON.parse(JSON.stringify(KUMPULAN_ASAL)),
});


/* ================================================================
   BERSIHKAN STATUS (LIVE > 4 jam → reset)
   ================================================================ */
function _bersihkanStatus() {
  const now = new Date();
  state.jadual.forEach(m => {
    if (m.status !== 'sedang_berlangsung' || !m.tarikh || !m.masa) return;
    if ((now - new Date(m.tarikh + 'T' + m.masa + ':00')) / 3600000 >= 4)
      m.status = 'akan_datang';
  });
  Object.values(state.roundRobin).forEach(rr => {
    (rr.perlawanan || []).forEach(m => {
      if (m.status !== 'sedang_berlangsung' || !m.tarikh || !m.masa) return;
      if ((now - new Date(m.tarikh + 'T' + m.masa + ':00')) / 3600000 >= 4)
        m.status = 'akan_datang';
    });
  });
}


/* ================================================================
   KIRA KEDUDUKAN
   ================================================================ */
function getKedudukan() {
  /* Kira sekali sahaja: untuk setiap acara, siapa dapat berapa mata.
     Mata bergantung pada sistem markah acara itu (lihat SISTEM_MARKAH
     dalam data.js) — jadi kita perlu objek acara, bukan hanya keputusan. */
  const mataPasukan = {};
  const medal       = {};
  state.pasukan.forEach(p => { mataPasukan[p] = 0; medal[p] = [0, 0, 0]; });

  const tambah = (nama, mata, tempat) => {
    if (!nama || !(nama in mataPasukan)) return;   /* pasukan sudah dibuang */
    mataPasukan[nama] += mata;
    if (tempat >= 1 && tempat <= 3) medal[nama][tempat - 1]++;
  };

  state.sukan.forEach(s => (s.acara || []).forEach(a => {
    const r = state.keputusan[a.id];
    if (!r || !r[1]) return;
    const sistemId = sistemAcara(a);

    /* Tempat bernombor — berhenti pada lompang pertama */
    for (let pos = 1; r[pos]; pos++) tambah(r[pos], mataTempat(sistemId, pos), pos);

    /* Peringkat dicapai (Liga+Kalah Mati / Kalah Mati) */
    const pr = r.peringkat || {};
    Object.keys(pr).forEach(id => {
      const mata = mataPeringkat(sistemId, id);
      (pr[id] || []).forEach(nama => tambah(nama, mata, 0));
    });
  }));

  return state.pasukan.map(p => ({
    nama:   p,
    emas:   medal[p][0],
    perak:  medal[p][1],
    gangsa: medal[p][2],
    mata:   mataPasukan[p],
  })).sort((a, b) =>
    /* Sistem rasmi berasaskan MATA — jadi mata mendahului kiraan pingat */
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
        <div class="team-name">${t.nama}</div>
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
        <div class="stat-lbl">Pasukan</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">${totalAcara()}</div>
        <div class="stat-lbl">Kategori</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">${totalSelesai()}</div>
        <div class="stat-lbl">Selesai</div>
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
    <div class="nota-mata">
      <div style="font-weight:700;margin-bottom:6px">Sistem Kiraan Markah</div>
      <div class="mata-legenda">
        ${Object.keys(SISTEM_MARKAH).map(k => {
          const S = SISTEM_MARKAH[k];
          const tempat = Object.keys(S.tempat).map(n => 'Tempat ' + n + ' = ' + S.tempat[n]);
          const lain = S.julat
            ? S.julat.map(j => 'Tempat ' + j.min +
                (j.max === Infinity ? ' ke atas' : '-' + j.max) + ' = ' + j.mata)
            : S.peringkat.map(pr => pr.label + ' = ' + pr.mata);
          return `
            <div class="mata-sistem">
              <div class="mata-sistem-nama">${S.icon} ${S.label}</div>
              <div class="mata-sistem-baris">${tempat.concat(lain).join(' &nbsp;·&nbsp; ')}</div>
            </div>`;
        }).join('')}
      </div>
      <div style="margin-top:8px;font-size:11px">
        *Tiada markah diberikan bagi kontinjen yang tidak menghantar penyertaan.
      </div>
    </div>
  `;
}


/* ================================================================
   RENDER UTAMA
   ================================================================ */
function render() {
  const tabList = ['kedudukan', 'keputusan', 'jadual', 'streaming'];
  document.querySelectorAll('.topbar-nav .nav-btn').forEach((btn, i) => {
    if (tabList[i]) btn.classList.toggle('active', tabList[i] === state.tab);
  });
  const tetapanBtn = document.querySelector('.tetapan-btn');
  if (tetapanBtn) tetapanBtn.classList.toggle('active', state.tab === 'tetapan');

  /* Bar navigasi bawah (telefon) */
  document.querySelectorAll('.bawah-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.tab === state.tab));

  const el = document.getElementById('main-content');
  if (!el) return;

  /* Paparan dibina semula — amaran segerak tak relevan lagi */
  if (typeof tutupToastSegerak === 'function') tutupToastSegerak();

  if      (state.tab === 'kedudukan') el.innerHTML = renderKedudukan();
  else if (state.tab === 'keputusan') el.innerHTML = renderKeputusan();
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

/* Adakah pengguna sedang mengisi sesuatu? */
function adaBorangTerbuka() {
  if (state.editingPerlawanan || state.editingAcara ||
      state.bracketEdit || state.rrEditingMatch) return true;

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
