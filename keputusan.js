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
    const maskot = maskotSukan(s.nama);
    return `
      <div class="sukan-card${maskot ? ' ada-maskot' : ''}" onclick="pilihSukan('${s.id}')">
        ${siap ? '<span class="done-badge">✓ Siap</span>' : ''}
        ${maskot
          ? `<img class="sukan-icon-maskot" src="${maskot}" alt="${s.nama}"/>`
          : `<div class="sukan-icon">${s.icon || '🏅'}</div>`}
        <div class="sukan-name">${s.nama}</div>
        <div class="sukan-count">${
          s.acara.length === 0
            ? '⚠️ Belum ada kategori'
            : done + ' / ' + s.acara.length + ' kategori selesai'
        }</div>
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

  /* Tiada kategori lagi — tanpa ini halaman jadi kosong tanpa sebarang
     penjelasan, jadi staff tak tahu apa yang perlu dibuat. */
  if (!sukan.acara || sukan.acara.length === 0) {
    return `
      <button class="back-btn" onclick="goBack()">← Balik</button>
      <div class="section-title">${sukan.icon || '🏅'} ${sukan.nama}</div>
      <div class="kosong-kad">
        <div class="kosong-ikon">📋</div>
        <div class="kosong-tajuk">Belum ada kategori untuk ${sukan.nama}</div>
        <div class="kosong-teks">
          Keputusan disimpan mengikut <strong>kategori</strong> — contohnya
          "Berpasukan Lelaki", "Beregu Wanita" atau "Triple Lelaki".
          Tambah kategori dahulu sebelum keputusan boleh dimasukkan.
        </div>
        ${isStaff ? `
          <button class="edit-btn" onclick="pergiTambahKategori()">
            ⚙️ Tambah Kategori di Tetapan
          </button>
        ` : `
          <div class="kosong-teks" style="margin-top:10px">
            Hubungi pentadbir sistem untuk menambah kategori.
          </div>
        `}
      </div>
    `;
  }

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
   TEMPAT KE-4 & SETERUSNYA
   ----------------------------------------------------------------
   Untuk acara format Ranking (TVET Run, Catur Swiss Ranking,
   Esports PUBG dsb.) di mana markah diberi sampai tempat ke-26+.
   Tempat 1-3 kekal di podium; selebihnya senarai tanpa had.

   Disimpan dalam rekod yang sama: r[4], r[5], ... dan
   r.score4, r.score5, ... — jadi rekod lama (3 tempat)
   tetap berfungsi tanpa perubahan.
   ---------------------------------------------------------------- */

/* Kumpul tempat 4, 5, 6, ... dari satu rekod keputusan */
function _senaraiTempatLain(r) {
  const senarai = [];
  for (let pos = 4; r && r[pos]; pos++) {
    senarai.push({ pos: pos, nama: r[pos], score: r['score' + pos] || '' });
  }
  return senarai;
}

/* Baca nilai satu tempat dari borang — dropdown atau taip manual */
function _bacaNilaiTempat(acaraId, pos) {
  const sel    = document.getElementById('sel-' + pos + '-' + acaraId);
  const manual = document.getElementById('sel-' + pos + '-' + acaraId + '-manual');
  const hidden = document.getElementById('sel-' + pos + '-' + acaraId + '-val');
  if (sel && sel.value === '__manual__' && manual) return manual.value.trim();
  if (hidden && hidden.value) return hidden.value.trim();
  return (sel ? sel.value.trim() : '');
}

/* Satu baris input untuk tempat ke-4 dan seterusnya */
function _htmlBarisTempat(acaraId, pos, nilai, score, sistemId) {
  const mata = mataTempat(sistemId || _sistemBorang(acaraId), pos);
  return '<div class="tempat-baris" data-pos="' + pos + '">' +
           '<div class="tempat-no">' + pos + '</div>' +
           '<div class="tempat-isi">' +
             '<div class="tempat-mata" data-mata-pos="' + pos + '">' +
               (mata ? mata + ' mata' : 'tiada mata') + '</div>' +
             _htmlPilihanPasukan(acaraId, pos, 'Tempat ' + pos, false, nilai || '') +
             '<input type="text" id="score-' + pos + '-' + acaraId + '" class="score-sub-input"' +
             ' style="margin-top:6px" placeholder="Masa / Jarak / Markah"' +
             ' value="' + (score || '') + '"/>' +
           '</div>' +
           '<button class="tempat-buang" title="Buang tempat ' + pos + '"' +
           ' onclick="buangTempatKeputusan(' + "'" + acaraId + "'" + ',' + pos + ')">✕</button>' +
         '</div>';
}

/* Sistem yang sedang dipilih dalam borang (bukan yang tersimpan) */
function _sistemBorang(acaraId) {
  return document.getElementById('sistem-' + acaraId)?.value || SISTEM_ASAL;
}

/* Baca semua baris tempat 4+ yang sedang dipapar */
function _bacaTempatLain(acaraId) {
  const wrap = document.getElementById('tempat-lain-' + acaraId);
  if (!wrap) return [];
  return Array.prototype.map.call(wrap.querySelectorAll('.tempat-baris'), function(baris) {
    const pos = baris.dataset.pos;
    return {
      nama:  _bacaNilaiTempat(acaraId, pos),
      score: document.getElementById('score-' + pos + '-' + acaraId)?.value?.trim() || '',
    };
  });
}

/* Lukis semula senarai tempat 4+ dengan nombor berturutan.
   Dibina semula (bukan render() penuh) supaya nilai yang belum
   disimpan dalam borang tidak hilang. */
function _lukisTempatLain(acaraId, senarai) {
  const wrap = document.getElementById('tempat-lain-' + acaraId);
  if (!wrap) return;
  const sistemId = _sistemBorang(acaraId);
  wrap.innerHTML = senarai.map(function(t, i) {
    return _htmlBarisTempat(acaraId, i + 4, t.nama, t.score, sistemId);
  }).join('');
  const kira = document.getElementById('kira-tempat-' + acaraId);
  if (kira) kira.textContent = senarai.length
    ? 'Jumlah ' + (senarai.length + 3) + ' tempat'
    : 'Belum ada — podium 3 tempat sahaja';
}

function tambahTempatKeputusan(acaraId) {
  const senarai = _bacaTempatLain(acaraId);
  senarai.push({ nama: '', score: '' });
  _lukisTempatLain(acaraId, senarai);
  /* Fokus terus ke dropdown yang baru ditambah */
  const baru = document.getElementById('sel-' + (senarai.length + 3) + '-' + acaraId);
  if (baru) baru.focus();
}

function buangTempatKeputusan(acaraId, pos) {
  const senarai = _bacaTempatLain(acaraId);
  senarai.splice(pos - 4, 1);
  _lukisTempatLain(acaraId, senarai);
}


/* ----------------------------------------------------------------
   PERINGKAT DICAPAI — sistem Liga+Kalah Mati & Kalah Mati
   ----------------------------------------------------------------
   Dalam dua sistem ini, pasukan selepas tempat ke-4 dapat mata ikut
   PERINGKAT yang dicapai (Suku Akhir 8, Pusingan Kedua 4,
   Pusingan Kumpulan/Pertama 2) — bukan ikut nombor tempat.
   Beberapa pasukan boleh berkongsi peringkat yang sama.
   ---------------------------------------------------------------- */

/* Nota ringkas di bawah tajuk "Tempat Ke-4" */
function _notaSistem(sistemId) {
  return senaraiPeringkat(sistemId).length
    ? 'Hanya Tempat 4 diberi mata (12 mata). Tempat 5 ke atas — guna bahagian Peringkat di bawah.'
    : 'Semua tempat diberi mata — 4=12, 5-10=8, 11-15=4, 16-26=2, 27+=1';
}

/* Kotak pilihan pasukan bagi setiap peringkat */
function _htmlPeringkat(acaraId, sistemId, dipilih) {
  const senarai = senaraiPeringkat(sistemId);
  if (!senarai.length) return '';
  return senarai.map(function(pr) {
    const dipilihPr = (dipilih && dipilih[pr.id]) || [];
    const kotak = state.pasukan.map(function(nama, i) {
      const idc   = 'pr-' + acaraId + '-' + pr.id + '-' + i;
      const tanda = dipilihPr.indexOf(nama) !== -1 ? ' checked' : '';
      return '<label class="pr-pilih" for="' + idc + '">' +
               '<input type="checkbox" id="' + idc + '"' +
               ' data-peringkat="' + pr.id + '" data-nama="' + nama + '"' + tanda + '/>' +
               '<span>' + nama + '</span>' +
             '</label>';
    }).join('');
    return '<div class="pr-blok">' +
             '<div class="pr-kepala">' +
               '<span class="pr-label" data-pr-label="' + pr.id + '">' + pr.label + '</span>' +
               '<span class="pr-mata">' + pr.mata + ' mata</span>' +
             '</div>' +
             '<div class="pr-senarai">' + kotak + '</div>' +
           '</div>';
  }).join('');
}

/* Baca peringkat yang ditanda */
function _bacaPeringkat(acaraId) {
  const hasil = {};
  const wrap  = document.getElementById('peringkat-' + acaraId);
  if (!wrap) return hasil;
  Array.prototype.forEach.call(
    wrap.querySelectorAll('input[type="checkbox"]:checked'),
    function(c) {
      const k = c.dataset.peringkat;
      if (!hasil[k]) hasil[k] = [];
      hasil[k].push(c.dataset.nama);
    }
  );
  return hasil;
}

/* Tukar sistem markah — tanpa render() penuh, supaya isian
   dalam borang yang belum disimpan tidak hilang. */
function tukarSistemAcara(acaraId, sistemId) {
  const adaPeringkat = senaraiPeringkat(sistemId).length > 0;

  const blokPr = document.getElementById('bhg-peringkat-' + acaraId);
  if (blokPr) blokPr.style.display = adaPeringkat ? 'block' : 'none';

  /* Hanya label peringkat terakhir berbeza antara dua sistem berperingkat;
     id-nya sama, jadi pasukan yang sudah ditanda kekal ditanda. */
  senaraiPeringkat(sistemId).forEach(function(pr) {
    const el = document.querySelector('[data-pr-label="' + pr.id + '"]');
    if (el) el.textContent = pr.label;
  });

  const nota = document.getElementById('nota-sistem-' + acaraId);
  if (nota) nota.textContent = _notaSistem(sistemId);

  /* Kemas kini setiap badge mata — supaya admin nampak kesan
     pertukaran sistem serta-merta, tanpa perlu simpan dahulu. */
  Array.prototype.forEach.call(
    document.querySelectorAll('[data-mata-pos]'),
    function(el) {
      const mata = mataTempat(sistemId, el.dataset.mataPos);
      el.textContent = mata ? mata + ' mata' : 'tiada mata';
      el.classList.toggle('sifar', !mata);
    }
  );
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

  /* Tempat ke-4 dan seterusnya */
  const lain      = _senaraiTempatLain(r);
  const lainHTML  = lain.map(t => _htmlBarisTempat(acara.id, t.pos, t.nama, t.score)).join('');
  const lainKira  = lain.length
    ? 'Jumlah ' + (lain.length + 3) + ' tempat'
    : 'Belum ada — podium 3 tempat sahaja';

  /* Sistem markah acara ini */
  const sistemKini  = sistemAcara(acara);
  const adaPeringkat = senaraiPeringkat(sistemKini).length > 0;
  const opsSistem = Object.keys(SISTEM_MARKAH).map(k =>
    `<option value="${k}" ${k === sistemKini ? 'selected' : ''}>` +
    `${SISTEM_MARKAH[k].icon} ${SISTEM_MARKAH[k].label}</option>`
  ).join('');
  const peringkatHTML = _htmlPeringkat(acara.id, sistemKini, r.peringkat);

  return `
    <div class="acara-card edit-mode">

      <div class="acara-header">
        <div class="acara-name">${acara.nama}</div>
        <div class="acara-status edit">✏️ Sedang diedit</div>
      </div>

      <div class="sistem-pilih-blok">
        <label class="score-label">⚖️ Sistem Kiraan Markah</label>
        <select id="sistem-${acara.id}" class="podium-select"
          onchange="tukarSistemAcara('${acara.id}', this.value)">
          ${opsSistem}
        </select>
        <div class="score-hint">
          Tempat 1-4 sama bagi semua sistem (20 / 16 / 14 / 12).
          Perbezaannya bermula selepas tempat ke-4.
        </div>
      </div>

      <div class="score-input-group">
        <label class="score-label">📊 ${scoreLabel}</label>
        <input type="text" id="score-keseluruhan-${acara.id}" class="score-input"
          placeholder="${scorePh}" value="${r.score || ''}"/>
        <div class="score-hint">${scoreHint}</div>
      </div>

      <div class="podium-edit-grid">

        <div class="podium-edit-slot">
          <div class="podium-edit-label p1">🥇 Tempat 1<span class="tempat-mata" data-mata-pos="1">${mataTempat(sistemKini, 1)} mata</span></div>
          ${html1}
          <input type="text" id="score-1-${acara.id}" class="score-sub-input"
            placeholder="${scorePH12}" value="${r.score1 || ''}"/>
        </div>

        <div class="podium-edit-slot">
          <div class="podium-edit-label p2">🥈 Tempat 2<span class="tempat-mata" data-mata-pos="2">${mataTempat(sistemKini, 2)} mata</span></div>
          ${html2}
          <input type="text" id="score-2-${acara.id}" class="score-sub-input"
            placeholder="${scorePH12}" value="${r.score2 || ''}"/>
        </div>

        <div class="podium-edit-slot">
          <div class="podium-edit-label p3">🥉 Tempat 3<span class="tempat-mata" data-mata-pos="3">${mataTempat(sistemKini, 3)} mata</span></div>
          ${html3}
          <input type="text" id="score-3-${acara.id}" class="score-sub-input"
            placeholder="${scorePH12}" value="${r.score3 || ''}"/>
        </div>

      </div>

      <!-- Tempat ke-4 dan seterusnya — untuk acara format Ranking -->
      <div class="tempat-lain-blok">
        <div class="tempat-lain-kepala">
          <div>
            <div class="tempat-lain-tajuk">📋 Tempat Ke-4 &amp; Seterusnya</div>
            <div class="tempat-lain-nota" id="kira-tempat-${acara.id}">${lainKira}</div>
            <div class="tempat-lain-nota" id="nota-sistem-${acara.id}">${_notaSistem(sistemKini)}</div>
          </div>
          <button class="tambah-tempat-btn" onclick="tambahTempatKeputusan('${acara.id}')">
            + Tambah Tempat
          </button>
        </div>
        <div class="tempat-lain-wrap" id="tempat-lain-${acara.id}">${lainHTML}</div>
      </div>

      <!-- Peringkat dicapai — sistem Liga+Kalah Mati & Kalah Mati -->
      <div class="peringkat-blok" id="bhg-peringkat-${acara.id}"
        style="display:${adaPeringkat ? 'block' : 'none'}">
        <div class="tempat-lain-tajuk">🏁 Peringkat Dicapai</div>
        <div class="tempat-lain-nota" style="margin-bottom:10px">
          Tanda pasukan mengikut peringkat terjauh yang dicapai.
          Beberapa pasukan boleh berkongsi peringkat yang sama.
        </div>
        <div id="peringkat-${acara.id}">${peringkatHTML}</div>
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

  /* Tempat ke-4 dan seterusnya — acara format Ranking */
  const lain = _senaraiTempatLain(r);
  const lainHTML = lain.length ? `
    <div class="rank-senarai">
      <div class="rank-tajuk">📋 Kedudukan Penuh — ${lain.length + 3} tempat</div>
      ${lain.map(t => `
        <div class="rank-baris">
          <div class="rank-no">${t.pos}</div>
          <div class="rank-nama">${t.nama}</div>
          ${t.score ? `<div class="rank-score">${t.score}</div>` : ''}
        </div>
      `).join('')}
    </div>
  ` : '';

  /* Peringkat dicapai — sistem Liga+Kalah Mati & Kalah Mati */
  const sistemId  = sistemAcara(acara);
  const prRekod   = r.peringkat || {};
  const prSenarai = senaraiPeringkat(sistemId).filter(pr => (prRekod[pr.id] || []).length);
  const prHTML = prSenarai.length ? `
    <div class="rank-senarai">
      <div class="rank-tajuk">🏁 Peringkat Dicapai</div>
      ${prSenarai.map(pr => `
        <div class="pr-papar">
          <div class="pr-papar-kepala">
            <span class="pr-papar-label">${pr.label}</span>
            <span class="pr-mata">${pr.mata} mata</span>
          </div>
          <div class="pr-papar-nama">${(prRekod[pr.id] || []).join(', ')}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  return `
    <div class="acara-card done">
      <div class="acara-header">
        <div class="acara-name">${acara.nama}</div>
        <div class="acara-status done">✓ Selesai</div>
      </div>
      <div class="sistem-chip">${SISTEM_MARKAH[sistemId].icon} ${SISTEM_MARKAH[sistemId].label}</div>
      ${scoreBadge}
      ${podiumHTML}
      ${lainHTML}
      ${prHTML}
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

  const s1 = _bacaNilaiTempat(acaraId, 1);
  const s2 = _bacaNilaiTempat(acaraId, 2);
  const s3 = _bacaNilaiTempat(acaraId, 3);

  if (!s1) { alert('Sila pilih sekurang-kurangnya Tempat Pertama!'); return; }

  /* Tempat ke-4 dan seterusnya */
  const lain = _bacaTempatLain(acaraId);

  /* Buang baris kosong di hujung senarai; kosong di tengah = ranking terputus */
  while (lain.length && !lain[lain.length - 1].nama) lain.pop();
  const kosong = lain.findIndex(t => !t.nama);
  if (kosong !== -1) {
    alert('Tempat ' + (kosong + 4) + ' masih kosong. Ranking mesti berturutan — ' +
          'isi tempat itu, atau tekan ✕ untuk membuangnya.');
    return;
  }

  /* Sistem markah + peringkat dicapai */
  const sistemId    = document.getElementById('sistem-' + acaraId)?.value || SISTEM_ASAL;
  const adaPeringkat = senaraiPeringkat(sistemId).length > 0;
  const peringkat   = adaPeringkat ? _bacaPeringkat(acaraId) : null;

  /* Satu pasukan hanya boleh muncul sekali — merentas tempat DAN peringkat,
     kalau tidak mata akan dikira dua kali. */
  const pil = [s1, s2, s3].concat(lain.map(t => t.nama)).filter(Boolean);
  if (peringkat) {
    Object.keys(peringkat).forEach(k => { pil.push.apply(pil, peringkat[k]); });
  }
  const berulang = pil.filter((n, i) => pil.indexOf(n) !== i);
  if (berulang.length) {
    alert('"' + berulang[0] + '" muncul lebih daripada sekali. ' +
          'Setiap pasukan hanya boleh diletakkan pada satu tempat atau satu peringkat sahaja.');
    return;
  }

  const score  = document.getElementById('score-keseluruhan-' + acaraId)?.value?.trim() || '';
  const score1 = document.getElementById('score-1-' + acaraId)?.value?.trim() || '';
  const score2 = document.getElementById('score-2-' + acaraId)?.value?.trim() || '';
  const score3 = document.getElementById('score-3-' + acaraId)?.value?.trim() || '';

  const rekod = { 1: s1, 2: s2, 3: s3, score, score1, score2, score3 };
  lain.forEach(function(t, i) {
    rekod[i + 4]             = t.nama;
    rekod['score' + (i + 4)] = t.score;
  });
  if (peringkat && Object.keys(peringkat).length) rekod.peringkat = peringkat;

  /* Sistem disimpan pada acara (bukan pada keputusan) supaya ia kekal
     walaupun keputusan dipadam dan dimasukkan semula. */
  const _sukanAcara = state.sukan.find(s => s.acara.some(a => a.id === acaraId));
  const _objAcara   = _sukanAcara?.acara.find(a => a.id === acaraId);
  if (_objAcara) _objAcara.sistem = sistemId;

  /* Log aktiviti */
  const _sukanLog = state.sukan.find(s => s.acara.some(a => a.id === acaraId));
  const _acaraLog = _sukanLog?.acara.find(a => a.id === acaraId);
  const _log = (_acaraLog?.nama || acaraId) + ' → 🥇' + s1 +
    (s2 ? ' 🥈' + s2 : '') + (s3 ? ' 🥉' + s3 : '') +
    (lain.length ? ' +' + lain.length + ' tempat' : '') +
    (peringkat && Object.keys(peringkat).length ? ' +peringkat' : '') +
    (score ? ' [' + score + ']' : '') +
    ' (' + SISTEM_MARKAH[sistemId].label + ')';
  if (typeof tambahLog === 'function') tambahLog('keputusan_simpan', _log);

  state.keputusan[acaraId] = rekod;
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

/* ----------------------------------------------------------------
   Pintasan: dari Keputusan terus ke Tetapan untuk tambah kategori
   ---------------------------------------------------------------- */
function pergiTambahKategori() {
  if (!state.staffLogin) { bukaPanelLogin(); return; }
  state.selectedSukan = null;
  state.subTab        = 'sukan_acara';
  setTab('tetapan');
}
