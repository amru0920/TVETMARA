/* ================================================================
   log_aktiviti.js — LOG AKTIVITI STAFF
   ================================================================
   Merekod setiap:
   ✅ Login / Logout staff (tarikh, masa, nama, IC)
   ✅ Simpan keputusan (acara, pasukan 1/2/3, score)
   ✅ Padam keputusan
   ✅ Kemaskini jadual / perlawanan
   ✅ Tukar kata laluan

   Log disimpan dalam Firebase (koleksi berasingan) dan
   localStorage sebagai backup. Maksimum 500 rekod disimpan.
   ================================================================ */


/* ================================================================
   TAMBAH LOG BARU
   Dipanggil dari auth.js, keputusan.js, jadual.js dll.
   ================================================================ */
function tambahLog(jenis, butiran) {
  const now   = new Date();
  const tarikh = now.toLocaleDateString('ms-MY', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
  const masa = now.toLocaleTimeString('ms-MY', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });

  const rekod = {
    id:      'log_' + now.getTime(),
    tarikh,
    masa,
    isoTs:   now.toISOString(),           /* untuk sort tepat */
    jenis,                                 /* 'login' | 'logout' | 'keputusan_simpan' | ... */
    staff:   state.staffLogin?.nama  || '—',
    ic4:     state.staffLogin?.ic4   || '—',
    jawatan: state.staffLogin?.jawatan || '—',
    butiran,
  };

  /* Tambah ke state */
  if (!Array.isArray(state.logAktiviti)) state.logAktiviti = [];
  state.logAktiviti.unshift(rekod);        /* terbaru di atas */

  /* Hadkan 500 rekod */
  if (state.logAktiviti.length > 500) state.logAktiviti.length = 500;

  /* Simpan ke Firebase & localStorage */
  simpanLog(rekod);
}


/* ================================================================
   SIMPAN LOG KE FIREBASE (koleksi berasingan)
   Setiap rekod = 1 dokumen dalam /spekma_log/{id}
   ================================================================ */
async function simpanLog(rekod) {
  /* localStorage backup */
  try {
    const sedia = JSON.parse(localStorage.getItem('spekma_log') || '[]');
    sedia.unshift(rekod);
    if (sedia.length > 500) sedia.length = 500;
    localStorage.setItem('spekma_log', JSON.stringify(sedia));
  } catch (e) { console.warn('log localStorage fail:', e); }

  /* Firebase */
  if (!db) await initFirebase();
  if (!db) return;
  try {
    await db.collection('spekma_log').doc(rekod.id).set(rekod);
  } catch (e) {
    console.warn('log Firebase fail:', e);
  }
}


/* ================================================================
   MUAT LOG DARI FIREBASE
   ================================================================ */
async function muatLog() {
  /* Cuba Firebase dulu */
  if (!db) await initFirebase();
  if (db) {
    try {
      const snap = await db.collection('spekma_log')
        .orderBy('isoTs', 'desc')
        .limit(500)
        .get();
      state.logAktiviti = snap.docs.map(d => d.data());
      return;
    } catch (e) {
      console.warn('muatLog Firebase fail:', e);
    }
  }
  /* Fallback localStorage */
  try {
    state.logAktiviti = JSON.parse(localStorage.getItem('spekma_log') || '[]');
  } catch (e) {
    state.logAktiviti = [];
  }
}


/* ================================================================
   RENDER — HALAMAN LOG AKTIVITI (Tetapan → Log Aktiviti)
   ================================================================ */
function renderLogAktiviti() {
  const log = state.logAktiviti || [];

  /* Filter */
  const cariVal    = (document.getElementById('log-cari')?.value || '').toLowerCase();
  const filterJenis = document.getElementById('log-filter')?.value || '';

  const senarai = log.filter(r => {
    const cocokJenis = !filterJenis || r.jenis === filterJenis;
    const cocokCari  = !cariVal ||
      r.staff.toLowerCase().includes(cariVal) ||
      r.butiran.toLowerCase().includes(cariVal) ||
      r.tarikh.includes(cariVal);
    return cocokJenis && cocokCari;
  });

  const ikonJenis = {
    login:             '🟢',
    logout:            '🔴',
    keputusan_simpan:  '✏️',
    keputusan_padam:   '🗑️',
    jadual_simpan:     '📅',
    jadual_padam:      '📅',
    kata_laluan:       '🔑',
    staff_tambah:      '👤',
    staff_padam:       '👤',
    pasukan_tambah:    '🏫',
    pasukan_padam:     '🏫',
    streaming_tambah:  '📺',
    streaming_padam:   '📺',
  };

  const warnaJenis = {
    login:             'rgba(46,204,113,0.15)',
    logout:            'rgba(231,76,60,0.12)',
    keputusan_simpan:  'rgba(52,152,219,0.12)',
    keputusan_padam:   'rgba(231,76,60,0.12)',
    kata_laluan:       'rgba(245,166,35,0.15)',
  };

  const baris = senarai.map(r => `
    <tr style="background:${warnaJenis[r.jenis] || 'transparent'}">
      <td style="white-space:nowrap;font-size:12px;color:var(--muted)">
        ${r.tarikh}<br>
        <strong style="color:var(--text);font-size:13px">${r.masa}</strong>
      </td>
      <td>
        <span style="font-size:18px">${ikonJenis[r.jenis] || '📝'}</span>
      </td>
      <td>
        <div style="font-weight:600;font-size:13px">${r.staff}</div>
        <div style="font-size:11px;color:var(--muted)">${r.jawatan} · IC: ****${r.ic4}</div>
      </td>
      <td style="font-size:13px;color:var(--text)">${r.butiran}</td>
    </tr>
  `).join('');

  return `
    <div class="set-panel-title">🗂️ Log Aktiviti Staff</div>
    <div class="set-panel-desc">
      Rekod semua tindakan staff — login, kemaskini keputusan, dan perubahan data.
      Digunakan untuk mengesan sebarang aktiviti mencurigakan.
    </div>

    <!-- Toolbar cari & filter -->
    <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
      <input
        id="log-cari"
        type="text"
        class="field-input"
        placeholder="🔍 Cari nama staff atau butiran..."
        style="flex:1;min-width:180px;padding:9px 12px;font-size:13px"
        oninput="render()"
      />
      <select id="log-filter" class="podium-select"
        style="padding:10px 12px;font-size:13px;min-width:160px"
        onchange="render()">
        <option value="">— Semua Jenis —</option>
        <option value="login">🟢 Login</option>
        <option value="logout">🔴 Logout</option>
        <option value="keputusan_simpan">✏️ Simpan Keputusan</option>
        <option value="keputusan_padam">🗑️ Padam Keputusan</option>
        <option value="jadual_simpan">📅 Kemaskini Jadual</option>
        <option value="kata_laluan">🔑 Tukar Kata Laluan</option>
        <option value="staff_tambah">👤 Tambah Staff</option>
        <option value="staff_padam">👤 Padam Staff</option>
      </select>
      <button class="save-btn" style="padding:9px 16px;font-size:13px"
        onclick="muatLogDanRender()">
        🔄 Muat Semula
      </button>
      ${state.staffLogin?.ic4 === '1234' ? `
        <button onclick="padamSemuaLog()"
          style="padding:9px 16px;font-size:13px;background:rgba(231,76,60,0.2);
          color:#ff8a80;border:1px solid rgba(231,76,60,0.4);border-radius:8px;cursor:pointer">
          🗑️ Padam Semua Log
        </button>
      ` : ''}
    </div>

    <!-- Ringkasan -->
    <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
      ${[
        { label: 'Jumlah Rekod', val: log.length, warna: 'var(--gold)' },
        { label: 'Login Hari Ini', val: log.filter(r => r.jenis==='login' && r.tarikh === new Date().toLocaleDateString('ms-MY',{day:'2-digit',month:'2-digit',year:'numeric'})).length, warna: '#2ecc71' },
        { label: 'Edit Keputusan', val: log.filter(r => r.jenis==='keputusan_simpan').length, warna: '#3498db' },
        { label: 'Padam', val: log.filter(r => r.jenis.includes('padam')).length, warna: '#e74c3c' },
      ].map(s => `
        <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;
          padding:10px 16px;flex:1;min-width:100px;text-align:center">
          <div style="font-size:20px;font-weight:800;color:${s.warna}">${s.val}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${s.label}</div>
        </div>
      `).join('')}
    </div>

    <!-- Jadual log -->
    ${senarai.length === 0 ? `
      <div style="text-align:center;padding:40px;color:var(--muted)">
        <div style="font-size:40px;margin-bottom:10px">📋</div>
        <div>Tiada rekod ditemui.</div>
      </div>
    ` : `
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="border-bottom:2px solid var(--border)">
              <th style="padding:10px 12px;text-align:left;color:var(--muted);font-size:12px;white-space:nowrap">TARIKH & MASA</th>
              <th style="padding:10px 8px;text-align:left;color:var(--muted);font-size:12px">JENIS</th>
              <th style="padding:10px 12px;text-align:left;color:var(--muted);font-size:12px">STAFF</th>
              <th style="padding:10px 12px;text-align:left;color:var(--muted);font-size:12px">BUTIRAN</th>
            </tr>
          </thead>
          <tbody>
            ${baris}
          </tbody>
        </table>
      </div>
      <div style="font-size:12px;color:var(--muted);margin-top:10px;text-align:right">
        Menunjukkan ${senarai.length} daripada ${log.length} rekod
      </div>
    `}
  `;
}

async function muatLogDanRender() {
  await muatLog();
  render();
}

/* Padam semua log (admin sahaja) */
async function padamSemuaLog() {
  if (!confirm('Padam SEMUA log aktiviti? Tindakan ini tidak boleh dibatalkan.')) return;
  state.logAktiviti = [];
  localStorage.removeItem('spekma_log');
  if (db) {
    try {
      const snap = await db.collection('spekma_log').limit(500).get();
      const batch = db.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch (e) { console.warn('padam log fail:', e); }
  }
  render();
}