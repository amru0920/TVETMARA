/* ================================================================
   app.js — OTAK UTAMA APLIKASI SPEKMA
   ================================================================
   simpanData() dan muatData() diurus oleh firebase.js
   ================================================================ */

let state = {
  staffLogin:    null,
  tab:               'kedudukan',
  subTab:            'urus_akaun',
  selectedSukan:     null,
  editingAcara:      null,
  editingPerlawanan: null,
  selectedHari:      {},
  jadualSukanTab:    null,
  kumpulanSukanTab:  null,
  rrSukanTab:        null,
  rrEditingMatch:    null,
  rrEditPresetSelesai: null,
  streamTab:         'awam',
  jadualPenuhMode:   null,
  jadualPenuhHari:   {},
  drawMode:          null,
  selectedKategori:  {},
  selectedKatKumpulan: {},
  keputusan:     {},
  pasukan:       (typeof PASUKAN_ASAL !== 'undefined') ? [...PASUKAN_ASAL] : [],
  sukan:         (typeof SUKAN_ASAL !== 'undefined') ? [...SUKAN_ASAL] : [],
  jadual:        (typeof JADUAL_ASAL !== 'undefined') ? [...JADUAL_ASAL] : [],
  staff:         (typeof STAFF_ASAL !== 'undefined') ? [...STAFF_ASAL] : [],
  password:      (typeof PASSWORD_TETAP !== 'undefined') ? PASSWORD_TETAP : "tvet2025",
  formatSukan:   (typeof FORMAT_ASAL !== 'undefined') ? { ...FORMAT_ASAL } : (typeof FORMAT_SUKAN !== 'undefined' ? { ...FORMAT_SUKAN } : {}),
  kumpulanSukan: (typeof KUMPULAN_ASAL !== 'undefined') ? JSON.parse(JSON.stringify(KUMPULAN_ASAL)) : {},
  roundRobin:    {},
  streaming:     [],
  bracket:       {},
  bracketEdit:          null,
  bracketPresetSelesai: false,
  _panelTambahCepat:    null,
};


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
  return state.pasukan.map(p => {
    let emas = 0, perak = 0, gangsa = 0, mata = 0;
    Object.values(state.keputusan).forEach(r => {
      if (r[1] === p) { emas++;   mata += MATA[1]; }
      if (r[2] === p) { perak++;  mata += MATA[2]; }
      if (r[3] === p) { gangsa++; mata += MATA[3]; }
    });
    return { nama: p, emas, perak, gangsa, mata };
  }).sort((a, b) =>
    b.emas - a.emas || b.perak - a.perak ||
    b.gangsa - a.gangsa || b.mata - a.mata
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
        <div class="stat-lbl">Acara</div>
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
      🥇 Emas = ${MATA[1]} mata &nbsp;|&nbsp;
      🥈 Perak = ${MATA[2]} mata &nbsp;|&nbsp;
      🥉 Gangsa = ${MATA[3]} mata
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

  const el = document.getElementById('main-content');
  if (!el) return;

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

function togolMobileMenu() {
  const m = document.getElementById('mobile-menu');
  if (m) m.style.display = m.style.display === 'none' ? 'flex' : 'none';
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


/* Aplikasi dimulakan dari init.js selepas semua modul diload */