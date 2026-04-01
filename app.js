/* ================================================================
   app.js — OTAK UTAMA APLIKASI
   ================================================================

   FAIL INI jarang perlu diedit.
   Ia menguruskan:
     - State (data semasa aplikasi)
     - Simpan & muat dari localStorage
     - Render halaman
     - Navigasi tab
     - Kira kedudukan

   Untuk ubah data → edit data.js
   Untuk ubah login → edit auth.js
   Untuk ubah keputusan → edit keputusan.js
   Untuk ubah tetapan → edit tetapan.js
   ================================================================ */


/* ================================================================
   STATE APLIKASI
   Semua data & status aplikasi disimpan di sini.
   ================================================================ */
let state = {

  /* Login */
  staffLogin:    null,

  /* Navigasi */
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
  streamTab:         'awam',
  jadualPenuhMode:   null,
  jadualPenuhHari:   {},
  drawMode:          null,   // sukanId bila Draw aktif
  selectedKategori:      {},
  selectedKatKumpulan:   {},  // { sukanId: acaraId } tab kategori aktif dalam Urus Kumpulan

  /* Data */
  keputusan:     {},
  pasukan:       [...PASUKAN_ASAL],
  sukan:         [...SUKAN_ASAL],
  jadual:        [...JADUAL_ASAL],
  staff:         [...STAFF_ASAL],
  password:      PASSWORD_TETAP,
  formatSukan:   { ...FORMAT_ASAL },
  kumpulanSukan: JSON.parse(JSON.stringify(KUMPULAN_ASAL)),
  roundRobin:    {},
  streaming:     [],
  bracket:       {},    // { [sukanId]: { suku_akhir, separuh_akhir, final, tempat_ketiga } }
  bracketEdit:          null,
  bracketPresetSelesai: false,

};


/* ================================================================
   SIMPAN & MUAT DATA (localStorage)
   Data kekal walaupun browser ditutup / refresh.
   ================================================================ */
function simpanData() {
/* URL Worker — tukar kepada URL worker anda selepas deploy */
const WORKER_URL = window.SPEKMA_API_URL || '';

/* ── Simpan ke D1 (dengan localStorage backup) ── */
function simpanData() {
  /* Sentiasa simpan ke localStorage sebagai backup offline */
  try {
    localStorage.setItem('spekma_keputusan',    JSON.stringify(state.keputusan));
    localStorage.setItem('spekma_pasukan',      JSON.stringify(state.pasukan));
    localStorage.setItem('spekma_sukan',        JSON.stringify(state.sukan));
    localStorage.setItem('spekma_jadual',       JSON.stringify(state.jadual));
    localStorage.setItem('spekma_staff',        JSON.stringify(state.staff));
    localStorage.setItem('spekma_password',     state.password);
    localStorage.setItem('spekma_format',       JSON.stringify(state.formatSukan));
    localStorage.setItem('spekma_kumpulan',     JSON.stringify(state.kumpulanSukan));
    localStorage.setItem('spekma_roundrobin',   JSON.stringify(state.roundRobin));
    localStorage.setItem('spekma_streaming',    JSON.stringify(state.streaming));
    localStorage.setItem('spekma_bracket',      JSON.stringify(state.bracket));
  } catch (e) { console.warn('localStorage fail:', e); }

  /* Hantar ke D1 kalau Worker URL ada */
  if (!WORKER_URL) return;
  const payload = {
    pasukan:      state.pasukan,
    sukan:        state.sukan,
    formatSukan:  state.formatSukan,
    kumpulanSukan:state.kumpulanSukan,
    jadual:       state.jadual,
    roundRobin:   state.roundRobin,
    bracket:      state.bracket,
    keputusan:    state.keputusan,
    staff:        state.staff,
    password:     state.password,
    streaming:    state.streaming,
  };
  fetch(WORKER_URL + '/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(e => console.warn('D1 sync fail:', e));
}

/* ── Muat dari D1, fallback ke localStorage ── */
async function muatData() {
  /* Cuba muat dari D1 */
  if (WORKER_URL) {
    try {
      const tunjukLoading = () => {
        const el = document.getElementById('main-content');
        if (el) el.innerHTML = `
          <div style="text-align:center;padding:60px 20px;color:var(--muted)">
            <div style="font-size:32px;margin-bottom:12px">⏳</div>
            <div>Memuatkan data...</div>
          </div>`;
      };
      tunjukLoading();

      const res  = await fetch(WORKER_URL + '/api/data');
      if (res.ok) {
        const data = await res.json();
        _muatStateFromData(data);
        _bersihkanStatus();
        return; /* berjaya, keluar */
      }
    } catch (e) {
      console.warn('D1 gagal, guna localStorage:', e);
    }
  }

  /* Fallback ke localStorage */
  _muatDariLocalStorage();
  _bersihkanStatus();
}

function _muatStateFromData(data) {
  if (data.pasukan)       state.pasukan       = data.pasukan;
  if (data.sukan)         state.sukan         = data.sukan;
  if (data.formatSukan)   state.formatSukan   = data.formatSukan;
  if (data.kumpulanSukan) state.kumpulanSukan = data.kumpulanSukan;
  if (data.jadual)        state.jadual        = data.jadual;
  if (data.roundRobin)    state.roundRobin    = data.roundRobin;
  if (data.bracket) {
    state.bracket = data.bracket;
    Object.keys(state.bracket).forEach(sid => kemaskiniSemakBracket(sid));
  }
  if (data.keputusan)     state.keputusan     = data.keputusan;
  if (data.staff)         state.staff         = data.staff;
  if (data.password)      state.password      = data.password;
  if (data.streaming)     state.streaming     = data.streaming;
}

function _muatDariLocalStorage() {
  try {
    const k  = localStorage.getItem('spekma_keputusan');
    const p  = localStorage.getItem('spekma_pasukan');
    const s  = localStorage.getItem('spekma_sukan');
    const j  = localStorage.getItem('spekma_jadual');
    const st = localStorage.getItem('spekma_staff');
    const pw = localStorage.getItem('spekma_password');
    const fm = localStorage.getItem('spekma_format');
    const km = localStorage.getItem('spekma_kumpulan');
    const rr = localStorage.getItem('spekma_roundrobin');
    const sm = localStorage.getItem('spekma_streaming');
    const br = localStorage.getItem('spekma_bracket');
    if (k)  state.keputusan     = JSON.parse(k);
    if (p)  state.pasukan       = JSON.parse(p);
    if (s)  state.sukan         = JSON.parse(s);
    if (j)  state.jadual        = JSON.parse(j);
    if (st) state.staff         = JSON.parse(st);
    if (pw) state.password      = pw;
    if (fm) state.formatSukan   = JSON.parse(fm);
    if (km) state.kumpulanSukan = JSON.parse(km);
    if (rr) state.roundRobin    = JSON.parse(rr);
    if (sm) state.streaming     = JSON.parse(sm);
    if (br) {
      state.bracket = JSON.parse(br);
      Object.keys(state.bracket).forEach(sid => kemaskiniSemakBracket(sid));
    }
  } catch (e) { console.warn('Gagal muat localStorage:', e); }
}

function _bersihkanStatus() {
  const now = new Date();
  state.jadual.forEach(m => {
    if (m.status !== 'sedang_berlangsung' || !m.tarikh || !m.masa) return;
    const masaMula = new Date(m.tarikh + 'T' + m.masa + ':00');
    if ((now - masaMula) / 3600000 >= 4) m.status = 'akan_datang';
  });
  Object.values(state.roundRobin).forEach(rr => {
    (rr.perlawanan || []).forEach(m => {
      if (m.status !== 'sedang_berlangsung' || !m.tarikh || !m.masa) return;
      const masaMula = new Date(m.tarikh + 'T' + m.masa + ':00');
      if ((now - masaMula) / 3600000 >= 4) m.status = 'akan_datang';
    });
  });
}


/* ================================================================
   KIRA KEDUDUKAN
   ================================================================ */
function getKedudukan() {
  return state.pasukan
    .map(p => {
      let emas = 0, perak = 0, gangsa = 0, mata = 0;
      Object.values(state.keputusan).forEach(r => {
        if (r[1] === p) { emas++;   mata += MATA[1]; }
        if (r[2] === p) { perak++;  mata += MATA[2]; }
        if (r[3] === p) { gangsa++; mata += MATA[3]; }
      });
      return { nama: p, emas, perak, gangsa, mata };
    })
    .sort((a, b) =>
      b.emas   - a.emas   ||
      b.perak  - a.perak  ||
      b.gangsa - a.gangsa ||
      b.mata   - a.mata
    );
}

function countDone(s) {
  return s.acara.filter(a => state.keputusan[a.id]?.[1]).length;
}

function totalAcara()   { return state.sukan.reduce((n, s) => n + s.acara.length, 0); }
function totalSelesai() { return Object.values(state.keputusan).filter(r => r[1]).length; }


/* ================================================================
   RENDER — TAB KEDUDUKAN (awam)
   ================================================================ */
function renderKedudukan() {
  const standings = getKedudukan();

  const rows = standings.map((t, i) => `
    <tr class="${i < 3 ? 'top3' : ''}">
      <td>
        <span class="rank ${i===0?'r1':i===1?'r2':i===2?'r3':''}">
          ${i + 1}
        </span>
      </td>
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
  /* Kemaskini state butang navigasi */
  const tabList = ['kedudukan', 'keputusan', 'jadual', 'streaming'];
  document.querySelectorAll('.topbar-nav .nav-btn').forEach((btn, i) => {
    if (tabList[i]) btn.classList.toggle('active', tabList[i] === state.tab);
  });
  /* Butang tetapan berasingan */
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
  if (tab === 'jadual') semakAutoStatus(); /* ← semak bila masuk tab Jadual */
  render();
}

function pilihSukan(id) {
  state.selectedSukan = id;
  state.editingAcara  = null;
  render();
}

function goBack() {
  state.selectedSukan = null;
  state.editingAcara  = null;
  render();
}

function togolMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  if (menu) menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
}


/* ================================================================
   MULA APLIKASI
   ================================================================ */
/* Mula aplikasi */
(async () => {
  await muatData();
  render();
  mulaAutoStatus();
})();
}