/* ================================================================
   keputusan.js — KEPUTUSAN & SCORE SETIAP ACARA
   ================================================================ */


/* ----------------------------------------------------------------
   RENDER GRID KAD SUKAN
   ---------------------------------------------------------------- */
function renderKeputusan() {
  if (state.selectedSukan) return renderAcara();

  const kards = state.sukan.map(s => {
    const done = countDone(s);
    const siap = done === s.acara.length && s.acara.length > 0;
    return `
      <div class="sukan-card" onclick="pilihSukan('${s.id}')">
        ${siap ? '<span class="done-badge">✓ Siap</span>' : ''}
        <div class="sukan-icon">${s.icon || '🏅'}</div>
        <div class="sukan-name">${s.nama}</div>
        <div class="sukan-count">${done} / ${s.acara.length} acara selesai</div>
      </div>
    `;
  }).join('');

  return `<div class="sukan-grid">${kards}</div>`;
}


/* ----------------------------------------------------------------
   RENDER SENARAI ACARA
   ---------------------------------------------------------------- */
function renderAcara() {
  const sukan = state.sukan.find(s => s.id === state.selectedSukan);
  if (!sukan) return '';

  const isStaff   = !!state.staffLogin;
  const isPasukan = sukan.jenis === 'pasukan';

  const acaraHTML = sukan.acara.map(a => {
    const r      = state.keputusan[a.id] || {};
    const isEdit = state.editingAcara === a.id;
    if (isEdit && isStaff) return renderFormEdit(a, sukan, isPasukan);
    return renderPaparAcara(a, r, isStaff, isPasukan);
  }).join('');

  return `
    <button class="back-btn" onclick="goBack()">← Balik</button>
    <div class="section-title">${sukan.icon || '🏅'} ${sukan.nama}</div>
    ${acaraHTML}
  `;
}


/* ----------------------------------------------------------------
   HELPER — bina HTML dropdown + input manual untuk satu tempat
   Dipanggil dari renderFormEdit, BUKAN template literal bersarang
   ---------------------------------------------------------------- */
function _htmlPilihanPasukan(acaraId, pos, label, wajib, nilaiSedia) {
  const dariSenarai = nilaiSedia === '' || state.pasukan.includes(nilaiSedia);

  let opsHTML = '<option value="">' + (wajib ? '-- Pilih Pasukan --' : '-- Pilih (pilihan) --') + '</option>';
  state.pasukan.forEach(function(p) {
    const sel = (dariSenarai && nilaiSedia === p) ? ' selected' : '';
    opsHTML += '<option value="' + p + '"' + sel + '>' + p + '</option>';
  });
  opsHTML += '<option value="__manual__"' + (!dariSenarai ? ' selected' : '') + '>✏️ Taip Manual...</option>';

  const paparManual = !dariSenarai ? 'block' : 'none';
  const nilaiManual = !dariSenarai ? nilaiSedia : '';

  return '<select class="podium-select" id="sel-' + pos + '-' + acaraId + '"' +
         ' onchange="togolManualKeputusan(\'' + acaraId + '\',' + pos + ',this.value)">' +
         opsHTML + '</select>' +
         '<input type="text" id="sel-' + pos + '-' + acaraId + '-manual" class="score-sub-input"' +
         ' style="margin-top:6px;display:' + paparManual + '"' +
         ' placeholder="Taip nama ' + label + ' di sini..."' +
         ' value="' + nilaiManual + '"/>' +
         '<input type="hidden" id="sel-' + pos + '-' + acaraId + '-val" value="' + nilaiSedia + '"/>';
}


/* ----------------------------------------------------------------
   FORM EDIT KEPUTUSAN (staff sahaja)
   ---------------------------------------------------------------- */
function renderFormEdit(acara, sukan, isPasukan) {
  const r         = state.keputusan[acara.id] || {};
  const scoreLabel = isPasukan ? 'Score Perlawanan (contoh: 3 - 1)' : 'Masa / Jarak / Markah';
  const scorePh   = isPasukan ? 'Contoh: 3 - 1' : 'Contoh: 10.45s / 45.2m';
  const scoreHint = isPasukan
    ? 'Masukkan score akhir perlawanan. Contoh: <strong>3 - 1</strong>, <strong>21 - 18</strong>'
    : 'Masukkan masa atau jarak. Contoh: <strong>10.45s</strong>, <strong>45.20m</strong>';
  const scorePH12 = isPasukan ? 'Score pasukan ini' : 'Masa / Jarak';

  const html1 = _htmlPilihanPasukan(acara.id, 1, 'Tempat 1', true,  r[1] || '');
  const html2 = _htmlPilihanPasukan(acara.id, 2, 'Tempat 2', false, r[2] || '');
  const html3 = _htmlPilihanPasukan(acara.id, 3, 'Tempat 3', false, r[3] || '');

  return `
    <div class="acara-card edit-mode">

      <div class="acara-header">
        <div class="acara-name">${acara.nama}</div>
        <div class="acara-status edit">✏️ Sedang diedit</div>
      </div>

      <div class="score-input-group">
        <label class="score-label">📊 ${scoreLabel}</label>
        <input type="text" id="score-keseluruhan-${acara.id}" class="score-input"
          placeholder="${scorePh}" value="${r.score || ''}"/>
        <div class="score-hint">${scoreHint}</div>
      </div>

      <div class="podium-edit-grid">

        <div class="podium-edit-slot">
          <div class="podium-edit-label p1">🥇 Tempat 1</div>
          ${html1}
          <input type="text" id="score-1-${acara.id}" class="score-sub-input"
            placeholder="${scorePH12}" value="${r.score1 || ''}"/>
        </div>

        <div class="podium-edit-slot">
          <div class="podium-edit-label p2">🥈 Tempat 2</div>
          ${html2}
          <input type="text" id="score-2-${acara.id}" class="score-sub-input"
            placeholder="${scorePH12}" value="${r.score2 || ''}"/>
        </div>

        <div class="podium-edit-slot">
          <div class="podium-edit-label p3">🥉 Tempat 3</div>
          ${html3}
          <input type="text" id="score-3-${acara.id}" class="score-sub-input"
            placeholder="${scorePH12}" value="${r.score3 || ''}"/>
        </div>

      </div>

      <div class="btn-group">
        <button class="cancel-btn" onclick="batalEdit()">Batal</button>
        <button class="save-btn" onclick="simpanKeputusan('${acara.id}')">
          💾 Simpan Keputusan
        </button>
      </div>

    </div>
  `;
}


/* ----------------------------------------------------------------
   PAPARAN KEPUTUSAN (semua orang)
   ---------------------------------------------------------------- */
function renderPaparAcara(acara, r, isStaff, isPasukan) {
  const editBtn = isStaff ? `
    <div class="btn-group">
      <button class="edit-btn" onclick="mulaEdit('${acara.id}')">
        ${r[1] ? '✏️ Edit Keputusan' : '+ Masuk Keputusan'}
      </button>
      ${r[1] ? `<button class="padam-btn" onclick="padamKeputusan('${acara.id}')">🗑 Padam</button>` : ''}
    </div>
  ` : '';

  if (!r[1]) {
    return `
      <div class="acara-card">
        <div class="acara-header">
          <div class="acara-name">${acara.nama}</div>
          <div class="acara-status">Belum ada keputusan</div>
        </div>
        ${editBtn}
      </div>
    `;
  }

  const scoreBadge = r.score ? `
    <div class="score-badge">${isPasukan ? '⚽' : '⏱'} ${r.score}</div>
  ` : '';

  const podiumHTML = `
    <div class="podium-result">
      <div class="podium-result-slot">
        <div class="podium-result-label p1">🥇 Tempat 1</div>
        <div class="podium-result-nama e">${r[1]}</div>
        ${r.score1 ? `<div class="podium-score">${r.score1}</div>` : ''}
      </div>
      <div class="podium-result-slot">
        <div class="podium-result-label p2">🥈 Tempat 2</div>
        <div class="podium-result-nama p">${r[2] || '—'}</div>
        ${r.score2 ? `<div class="podium-score">${r.score2}</div>` : ''}
      </div>
      <div class="podium-result-slot">
        <div class="podium-result-label p3">🥉 Tempat 3</div>
        <div class="podium-result-nama g">${r[3] || '—'}</div>
        ${r.score3 ? `<div class="podium-score">${r.score3}</div>` : ''}
      </div>
    </div>
  `;

  return `
    <div class="acara-card done">
      <div class="acara-header">
        <div class="acara-name">${acara.nama}</div>
        <div class="acara-status done">✓ Selesai</div>
      </div>
      ${scoreBadge}
      ${podiumHTML}
      ${editBtn}
    </div>
  `;
}


/* ================================================================
   TOGOL INPUT MANUAL
   ================================================================ */
function togolManualKeputusan(acaraId, pos, nilai) {
  const manual = document.getElementById('sel-' + pos + '-' + acaraId + '-manual');
  const hidden = document.getElementById('sel-' + pos + '-' + acaraId + '-val');
  if (!manual) return;
  if (nilai === '__manual__') {
    manual.style.display = 'block';
    manual.focus();
    if (hidden) hidden.value = '';
  } else {
    manual.style.display = 'none';
    manual.value = '';
    if (hidden) hidden.value = nilai;
  }
}


/* ================================================================
   FUNGSI SIMPAN / PADAM / EDIT
   ================================================================ */

function mulaEdit(acaraId) {
  if (!state.staffLogin) { bukaPanelLogin(); return; }
  state.editingAcara = acaraId;
  render();
}

function batalEdit() {
  state.editingAcara = null;
  render();
}

function simpanKeputusan(acaraId) {
  if (!state.staffLogin) return;

  /* Baca nilai — dropdown atau manual */
  function bacaNilai(pos) {
    const sel    = document.getElementById('sel-' + pos + '-' + acaraId);
    const manual = document.getElementById('sel-' + pos + '-' + acaraId + '-manual');
    const hidden = document.getElementById('sel-' + pos + '-' + acaraId + '-val');
    if (sel && sel.value === '__manual__' && manual) return manual.value.trim();
    if (hidden && hidden.value) return hidden.value.trim();
    return (sel ? sel.value.trim() : '');
  }

  const s1 = bacaNilai(1);
  const s2 = bacaNilai(2);
  const s3 = bacaNilai(3);

  if (!s1) { alert('Sila pilih sekurang-kurangnya Tempat Pertama!'); return; }

  const pil = [s1, s2, s3].filter(Boolean);
  if (new Set(pil).size !== pil.length) {
    alert('Pasukan yang sama tidak boleh menang dua tempat!');
    return;
  }

  const score  = document.getElementById('score-keseluruhan-' + acaraId)?.value?.trim() || '';
  const score1 = document.getElementById('score-1-' + acaraId)?.value?.trim() || '';
  const score2 = document.getElementById('score-2-' + acaraId)?.value?.trim() || '';
  const score3 = document.getElementById('score-3-' + acaraId)?.value?.trim() || '';

  /* Log aktiviti */
  const _sukanLog = state.sukan.find(s => s.acara.some(a => a.id === acaraId));
  const _acaraLog = _sukanLog?.acara.find(a => a.id === acaraId);
  const _log = (_acaraLog?.nama || acaraId) + ' → 🥇' + s1 +
    (s2 ? ' 🥈' + s2 : '') + (s3 ? ' 🥉' + s3 : '') +
    (score ? ' [' + score + ']' : '');
  if (typeof tambahLog === 'function') tambahLog('keputusan_simpan', _log);

  state.keputusan[acaraId] = { 1: s1, 2: s2, 3: s3, score, score1, score2, score3 };
  state.editingAcara = null;
  simpanData();
  render();
}

function padamKeputusan(acaraId) {
  const sukan = state.sukan.find(s => s.acara.some(a => a.id === acaraId));
  const acara = sukan?.acara.find(a => a.id === acaraId);
  if (!confirm('Padam keputusan untuk "' + (acara?.nama || acaraId) + '"?')) return;
  if (typeof tambahLog === 'function') tambahLog('keputusan_padam', 'Padam: ' + (acara?.nama || acaraId));
  delete state.keputusan[acaraId];
  simpanData();
  render();
}