/* ================================================================
   mata.js — TAB MATA
   ================================================================
   Markah setiap pusat bagi setiap lajur acara, dimuat naik melalui
   CSV. Lajur ditakrifkan oleh CSV, bukan dikunci dalam kod.

   Tab ini membekalkan lajur MATA dalam Kedudukan.
   Tab Pingat membekalkan lajur emas/perak/gangsa — berasingan.
   ================================================================ */


/* ----------------------------------------------------------------
   PENGHURAI CSV
   ----------------------------------------------------------------
   Menyokong pemisah koma atau titik bertindih, petikan berganda,
   dan petikan berganda berganda ("") di dalam medan berpetik.
   ---------------------------------------------------------------- */
function huraiCSV(teks) {
  const t = String(teks || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (!t.trim()) return [];

  /* Teka pemisah dari baris pertama di luar petikan */
  const barisAwal = t.split('\n')[0];
  let luar = true, koma = 0, koln = 0;
  for (let i = 0; i < barisAwal.length; i++) {
    const c = barisAwal[i];
    if (c === '"') luar = !luar;
    else if (luar && c === ',') koma++;
    else if (luar && c === ';') koln++;
  }
  const PEMISAH = koln > koma ? ';' : ',';

  const baris = [];
  let medan = '', semasa = [], dalamPetik = false;

  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (dalamPetik) {
      if (c === '"') {
        if (t[i + 1] === '"') { medan += '"'; i++; }
        else dalamPetik = false;
      } else medan += c;
    } else if (c === '"') {
      dalamPetik = true;
    } else if (c === PEMISAH) {
      semasa.push(medan); medan = '';
    } else if (c === '\n') {
      semasa.push(medan); baris.push(semasa); semasa = []; medan = '';
    } else {
      medan += c;
    }
  }
  if (medan !== '' || semasa.length) { semasa.push(medan); baris.push(semasa); }

  /* Buang baris kosong sepenuhnya */
  return baris.filter(b => b.some(x => String(x).trim() !== ''));
}


/* ----------------------------------------------------------------
   TAFSIR CSV MARKAH
   ----------------------------------------------------------------
   Lajur pertama = nama pusat. Lajur selebihnya = acara.
   Lajur bernama TOTAL/JUMLAH diabaikan — jumlah dikira sendiri
   supaya ia tidak boleh bercanggah dengan pecahannya.
   ---------------------------------------------------------------- */
function tafsirCsvMata(teks) {
  const baris = huraiCSV(teks);
  if (baris.length < 2) {
    return { ralat: 'CSV perlu sekurang-kurangnya satu baris tajuk dan satu baris data.' };
  }

  const tajuk = baris[0].map(x => String(x).trim());
  const abaikan = i => /^(total|jumlah)/i.test(tajuk[i] || '');

  const kolum = [];
  const indeks = [];
  let idxTotal = -1;
  for (let i = 1; i < tajuk.length; i++) {
    if (!tajuk[i]) continue;
    if (abaikan(i)) { if (idxTotal < 0) idxTotal = i; continue; }
    kolum.push(tajuk[i]);
    indeks.push(i);
  }
  if (!kolum.length) return { ralat: 'Tiada lajur acara dijumpai selepas lajur nama pusat.' };

  const nilai = {}, tidakDikenali = [], dikenali = [], tidakSepadan = [];
  const senarai = state.pasukan || [];
  const kunci = n => String(n || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const petaPasukan = {};
  senarai.forEach(p => { petaPasukan[kunci(p)] = p; });

  for (let r = 1; r < baris.length; r++) {
    const namaMentah = String(baris[r][0] || '').trim();
    if (!namaMentah) continue;

    /* Padan dengan senarai pasukan sedia ada; hamparan menulis
       "ALOR SETAR" sedangkan sistem menyimpan "TVETMARA ALOR SETAR" */
    const k = kunci(namaMentah);
    let pusat = petaPasukan[k];
    if (!pusat) pusat = senarai.find(p => kunci(p).endsWith(k) || k.endsWith(kunci(p)));

    if (!pusat) { tidakDikenali.push(namaMentah); continue; }
    dikenali.push(pusat);

    const baru = {};
    indeks.forEach((idx, j) => {
      const v = String(baris[r][idx] == null ? '' : baris[r][idx]).trim();
      baru[kolum[j]] = v === '' ? 0 : (Number(v.replace(/[^0-9.-]/g, '')) || 0);
    });
    nilai[pusat] = baru;

    /* Semakan silang dengan lajur TOTAL hamparan. Kami tetap mengira
       jumlah sendiri — tetapi kalau angka hamparan berbeza, itu tanda
       formula di sana tersilap dan admin patut tahu. */
    if (idxTotal >= 0) {
      const teksT = String(baris[r][idxTotal] == null ? '' : baris[r][idxTotal]).trim();
      if (teksT !== '') {
        const dilapor = Number(teksT.replace(/[^0-9.-]/g, '')) || 0;
        const dikira  = kolum.reduce((n, k) => n + (Number(baru[k]) || 0), 0);
        if (dilapor !== dikira) tidakSepadan.push({ pusat, dilapor, dikira });
      }
    }
  }

  return { kolum, nilai, dikenali, tidakDikenali, tidakSepadan };
}


/* ----------------------------------------------------------------
   RENDER — TAB MATA
   ---------------------------------------------------------------- */
function renderMata() {
  if (state.mataPusat) return renderMataPusat(state.mataPusat);

  pastikanMata();
  const isStaff = !!state.staffLogin;
  const senarai = (state.pasukan || []).slice()
    .map(p => ({ nama: p, mata: jumlahMata(p) }))
    .sort((a, b) => b.mata - a.mata || a.nama.localeCompare(b.nama));

  const adaData = state.mata.kolum.length > 0;

  const kad = senarai.map((t, i) => `
    <div class="mata-kad" onclick="bukaMataPusat('${t.nama.replace(/'/g, "\'")}')">
      <div class="mata-kad-rank">${i + 1}</div>
      <div class="mata-kad-nama">${t.nama}</div>
      <div class="mata-kad-mata">${t.mata}</div>
    </div>
  `).join('');

  return `
    ${isStaff ? renderImportCsv() : ''}

    <div class="section-title">📊 Mata Mengikut Pusat</div>
    ${!adaData ? `
      <div class="kosong-kad">
        <div class="kosong-ikon">📊</div>
        <div class="kosong-tajuk">Belum ada markah dimuat naik</div>
        <div class="kosong-teks">
          Mata dimasukkan melalui fail CSV.
          ${isStaff ? 'Guna kotak muat naik di atas.' : 'Hubungi pentadbir sistem.'}
        </div>
      </div>
    ` : `
      <div class="mata-nota">
        ${senarai.length} pusat &nbsp;·&nbsp; ${state.mata.kolum.length} acara
        &nbsp;·&nbsp; tekan nama pusat untuk melihat pecahan
      </div>
      <div class="mata-grid">${kad}</div>
    `}
  `;
}


/* ----------------------------------------------------------------
   RENDER — PECAHAN SATU PUSAT
   ---------------------------------------------------------------- */
function renderMataPusat(pusat) {
  const pecahan = pecahanMata(pusat);
  const jumlah  = jumlahMata(pusat);
  const berisi  = pecahan.filter(x => x.mata > 0).length;

  const baris = pecahan.map(x => `
    <tr class="${x.mata > 0 ? '' : 'kosong'}">
      <td>${x.lajur}</td>
      <td class="mata-angka">${x.mata}</td>
    </tr>
  `).join('');

  return `
    <button class="back-btn" onclick="tutupMataPusat()">← Semua Pusat</button>
    <div class="section-title">📊 ${pusat}</div>

    <div class="stats-bar">
      <div class="stat-card">
        <div class="stat-num">${jumlah}</div>
        <div class="stat-lbl">Jumlah Mata</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">${berisi}</div>
        <div class="stat-lbl">Acara Bermarkah</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">${pecahan.length}</div>
        <div class="stat-lbl">Jumlah Acara</div>
      </div>
    </div>

    <table class="stand-table mata-jadual">
      <thead><tr><th>Acara</th><th style="width:100px">Mata</th></tr></thead>
      <tbody>${baris}</tbody>
      <tfoot>
        <tr><td><strong>JUMLAH</strong></td>
            <td class="mata-angka"><strong>${jumlah}</strong></td></tr>
      </tfoot>
    </table>
  `;
}


/* ----------------------------------------------------------------
   NAVIGASI
   ---------------------------------------------------------------- */
function bukaMataPusat(pusat) { state.mataPusat = pusat; render(); }
function tutupMataPusat()     { state.mataPusat = null;  render(); }


/* ================================================================
   IMPORT CSV — ADMIN SAHAJA
   ================================================================ */

function renderImportCsv() {
  return `
    <div class="csv-blok">
      <div class="csv-kepala">
        <div>
          <div class="csv-tajuk">📥 Muat Naik Markah (CSV)</div>
          <div class="csv-nota">
            Lajur pertama = nama pusat. Lajur seterusnya = acara.
            Lajur <strong>TOTAL</strong> diabaikan — jumlah dikira sendiri.
          </div>
        </div>
        <button class="csv-btn-templat" onclick="muatTurunTemplatCsv()">
          ⬇ Muat Turun Templat
        </button>
      </div>

      <div class="csv-cara">
        <label class="csv-fail">
          📄 Pilih fail CSV
          <input type="file" accept=".csv,text/csv" onchange="pilihFailCsv(event)" hidden/>
        </label>
        <span class="csv-atau">atau tampal di bawah</span>
      </div>

      <textarea id="csv-teks" class="csv-textarea" rows="5"
        placeholder="PUSAT,TVRUN L,TVRUN P,BOLA SEPAK&#10;ALOR SETAR,3,3,2&#10;BALIK PULAU,22,16,4"></textarea>

      <div class="btn-group" style="margin-top:10px">
        <button class="cancel-btn" onclick="document.getElementById('csv-teks').value=''">
          Kosongkan
        </button>
        <button class="save-btn" onclick="semakCsvMata()">🔍 Semak Dahulu</button>
      </div>

      <div id="csv-pratonton"></div>
    </div>
  `;
}

/* Baca fail yang dipilih terus ke dalam kotak teks */
function pilihFailCsv(e) {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    const ta = document.getElementById('csv-teks');
    if (ta) { ta.value = r.result; semakCsvMata(); }
  };
  r.onerror = () => alert('Gagal membaca fail.');
  r.readAsText(f, 'UTF-8');
}

/* Papar pratonton SEBELUM menyimpan — tiada import membuta tuli */
function semakCsvMata() {
  const wrap = document.getElementById('csv-pratonton');
  const teks = document.getElementById('csv-teks')?.value || '';
  if (!wrap) return;

  if (!teks.trim()) { wrap.innerHTML = ''; return; }

  const h = tafsirCsvMata(teks);
  if (h.ralat) {
    wrap.innerHTML = `<div class="csv-ralat">⚠ ${h.ralat}</div>`;
    return;
  }

  const contoh = h.dikenali.slice(0, 5).map(p => {
    const jum = h.kolum.reduce((n, k) => n + (Number(h.nilai[p][k]) || 0), 0);
    return `<tr><td>${p}</td><td class="mata-angka">${jum}</td></tr>`;
  }).join('');

  wrap.innerHTML = `
    <div class="csv-pratonton">
      <div class="csv-ringkas">
        <span class="csv-pil ok">${h.dikenali.length} pusat dikenali</span>
        ${h.tidakDikenali.length
          ? `<span class="csv-pil amaran">${h.tidakDikenali.length} tidak dikenali</span>` : ''}
        <span class="csv-pil">${h.kolum.length} lajur acara</span>
        ${h.tidakSepadan.length
          ? `<span class="csv-pil amaran">${h.tidakSepadan.length} jumlah tak sepadan</span>` : ''}
      </div>

      ${h.tidakSepadan.length ? `
        <div class="csv-ralat" style="margin-top:8px">
          Jumlah dalam lajur TOTAL hamparan tidak sepadan dengan hasil
          tambah lajurnya bagi ${h.tidakSepadan.length} pusat.
          Sistem akan guna <strong>hasil tambah lajur</strong>:<br/>
          ${h.tidakSepadan.slice(0, 6).map(x =>
            x.pusat + ': hamparan ' + x.dilapor + ' → dikira ' + x.dikira).join('<br/>')}
          ${h.tidakSepadan.length > 6 ? '<br/>… dan ' + (h.tidakSepadan.length - 6) + ' lagi' : ''}
        </div>
      ` : ''}

      ${h.tidakDikenali.length ? `
        <div class="csv-ralat" style="margin-top:8px">
          Nama ini tiada dalam senarai pasukan, jadi barisnya akan
          <strong>dilangkau</strong>:<br/>
          ${h.tidakDikenali.slice(0, 10).join(', ')}${h.tidakDikenali.length > 10 ? ' …' : ''}
        </div>
      ` : ''}

      <div class="csv-lajur">Lajur: ${h.kolum.join(' · ')}</div>

      <table class="stand-table" style="margin-top:8px">
        <thead><tr><th>Pusat</th><th style="width:100px">Jumlah</th></tr></thead>
        <tbody>${contoh}</tbody>
      </table>
      ${h.dikenali.length > 5
        ? `<div class="csv-lajur">… dan ${h.dikenali.length - 5} pusat lagi</div>` : ''}

      <div class="btn-group" style="margin-top:10px">
        <button class="save-btn" onclick="simpanCsvMata()">
          💾 Simpan ${h.dikenali.length} Pusat
        </button>
      </div>
    </div>
  `;
}

/* Tulis ke state + Firebase */
function simpanCsvMata() {
  if (!state.staffLogin) { bukaPanelLogin(); return; }

  const teks = document.getElementById('csv-teks')?.value || '';
  const h = tafsirCsvMata(teks);
  if (h.ralat) { alert(h.ralat); return; }
  if (!h.dikenali.length) { alert('Tiada pusat dikenali. Semak nama dalam lajur pertama.'); return; }

  const nl = String.fromCharCode(10);
  const pesan = [
    'Muat naik markah untuk ' + h.dikenali.length + ' pusat?',
    '',
    'Lajur: ' + h.kolum.length,
    h.tidakDikenali.length
      ? 'Dilangkau (nama tidak dikenali): ' + h.tidakDikenali.length : '',
    '',
    'Markah sedia ada bagi pusat yang sama akan DIGANTI.',
  ].filter(Boolean).join(nl);
  if (!confirm(pesan)) return;

  const m = pastikanMata();
  m.kolum = h.kolum;                       /* lajur ikut CSV terkini */
  Object.keys(h.nilai).forEach(p => { m.nilai[p] = h.nilai[p]; });

  if (typeof tambahLog === 'function') {
    tambahLog('mata_import',
      h.dikenali.length + ' pusat, ' + h.kolum.length + ' lajur' +
      (h.tidakDikenali.length ? ', ' + h.tidakDikenali.length + ' dilangkau' : ''));
  }

  simpanData();
  render();
  alert('Selesai. Markah ' + h.dikenali.length + ' pusat dikemas kini.');
}

/* Templat CSV berdasarkan pasukan & sukan sebenar dalam sistem */
function muatTurunTemplatCsv() {
  const m = pastikanMata();
  const lajur = m.kolum.length ? m.kolum.slice() : senaraiLajurCadangan();
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';

  const baris = [['PUSAT'].concat(lajur).map(q).join(',')];
  (state.pasukan || []).forEach(p => {
    baris.push([p].concat(lajur.map(k => mataLajur(p, k))).map(q).join(','));
  });

  const isi = '\uFEFF' + baris.join('\r\n');
  const blob = new Blob([isi], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sparta-mata-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* Cadangan lajur bila belum ada CSV: satu bagi setiap kategori */
function senaraiLajurCadangan() {
  const l = [];
  (state.sukan || []).forEach(s => {
    const kat = s.acara || [];
    if (kat.length <= 1) l.push(s.nama.toUpperCase());
    else kat.forEach(k => l.push((s.nama + ' ' + k.nama).toUpperCase()));
  });
  return l.length ? l : ['ACARA 1', 'ACARA 2'];
}
