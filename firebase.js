/* ================================================================
   firebase.js — INTEGRASI FIREBASE FIRESTORE (VERSI REAL-TIME)
   ================================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyAILJy2G8WIBzK0Bo_Sb1etEULihIMesNE",
  authDomain: "spekma-sukan.firebaseapp.com",
  projectId: "spekma-sukan",
  storageBucket: "spekma-sukan.firebasestorage.app",
  messagingSenderId: "567274981127",
  appId: "1:567274981127:web:6f03351dcd0a3a508767a2"
};

let db = null;
let firestoreInitialized = false;

/* Cap JSON bagi setiap medan seperti yang ada di server.
   WAJIB disimpan sebagai STRING, bukan rujukan objek: state.jadual dan
   data.jadual adalah objek yang SAMA selepas snapshot, jadi menyimpan
   rujukan bermakna ia berubah serentak dengan suntingan admin — dan
   perbandingan "ada perubahan?" akan sentiasa kata tiada. */
let _capJauh = {};

/* Adakah kita sudah menerima data SEBENAR dari server?
   Sebelum ini benar, state masih mengandungi data benih demo
   (JADUAL_ASAL) dan MENULISNYA akan mencemarkan jadual sebenar. */
let _dataServerSedia = false;

/* ================================================================
   CAP KLIEN — menghalang peranti berkod LAMA daripada menulis
   ================================================================
   Pembaikan v21-v29 hanya melindungi peranti yang benar-benar
   memuatnya. Peranti yang tidak pernah dimuat semula masih menulis
   gumpalan lapuknya dan memusnahkan kerja admin lain — sudah tiga
   kali berlaku.

   Setiap tulisan kini membawa klienNonce yang BERBEZA setiap kali.
   Peraturan Firestore menuntut medan itu berubah pada setiap
   tulisan; kod lama tidak menghantarnya langsung, jadi tulisannya
   ditolak oleh SERVER — bukan bergantung pada kod klien.
   ================================================================ */
const VERSI_KLIEN = 29;

function _capKlien() {
  return {
    klienVersi: VERSI_KLIEN,
    klienNonce: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10),
  };
}

/* ----------------------------------------------------------------
   GABUNGAN TIGA-HALA
   ----------------------------------------------------------------
   asas = nilai di server KETIKA INI (dibaca dalam transaksi)
   lama = nilai asal yang peranti ini muat (garis dasar)
   baru = nilai peranti ini sekarang

   Hanya perubahan SAYA yang dikenakan; selebihnya nilai server
   dikekalkan. Tanpa ini, menulis keseluruhan senarai jadual akan
   memadam perlawanan yang admin lain baru simpan.
   ---------------------------------------------------------------- */
function _gabungTigaHala(asas, lama, baru) {
  const rentetan  = v => JSON.stringify(v);
  const petaBiasa = v => v && typeof v === 'object' && !Array.isArray(v);
  const senaraiId = v => Array.isArray(v) &&
    v.every(x => x && typeof x === 'object' && !Array.isArray(x) && x.id != null);

  /* Senarai objek ber-id (jadual) — gabung ikut id */
  if (senaraiId(baru) && senaraiId(lama)) {
    const hasil = new Map();
    (Array.isArray(asas) ? asas : []).forEach(x => {
      if (x && x.id != null) hasil.set(x.id, x);
    });

    const petaLama = new Map();
    lama.forEach(x => petaLama.set(x.id, x));

    /* Item yang SAYA buang */
    petaLama.forEach((_, id) => {
      if (!baru.some(x => x.id === id)) hasil.delete(id);
    });

    baru.forEach(x => {
      const asalnya = petaLama.get(x.id);

      /* Item baharu, atau saya tidak sentuh langsung */
      if (asalnya === undefined) { hasil.set(x.id, x); return; }
      if (rentetan(asalnya) === rentetan(x)) {
        if (!hasil.has(x.id)) hasil.set(x.id, x);
        return;
      }

      /* Saya ubah item ini — gabung IKUT MEDAN, bukan ganti seluruh
         objek. Jadi kalau admin lain ubah masa pada perlawanan yang
         sama sementara saya ubah skor, kedua-duanya kekal. */
      hasil.set(x.id, _gabungTigaHala(hasil.get(x.id), asalnya, x));
    });

    return Array.from(hasil.values());
  }

  /* Objek berkunci — map (keputusan, bracket, …) atau satu rekod
     perlawanan. Digabung kunci demi kunci, secara rekursif. */
  if (petaBiasa(baru) && petaBiasa(lama)) {
    const hasil = Object.assign({}, petaBiasa(asas) ? asas : {});

    /* Kunci yang SAYA buang */
    Object.keys(lama).forEach(k => { if (!(k in baru)) delete hasil[k]; });

    Object.keys(baru).forEach(k => {
      if (rentetan(lama[k]) === rentetan(baru[k])) {
        /* Saya tak sentuh — kekalkan nilai server kalau ada */
        if (!(k in hasil)) hasil[k] = baru[k];
      } else if (petaBiasa(baru[k]) && petaBiasa(lama[k])) {
        hasil[k] = _gabungTigaHala(hasil[k], lama[k], baru[k]);
      } else if (senaraiId(baru[k]) && senaraiId(lama[k])) {
        hasil[k] = _gabungTigaHala(hasil[k], lama[k], baru[k]);
      } else {
        hasil[k] = baru[k];
      }
    });

    return hasil;
  }

  /* Senarai teks (pasukan) atau nilai mudah (password) — ganti terus */
  return baru;
}


/* ----------------------------------------------------------------
   DASAR BAGI REKOD YANG SEDANG DISUNTING
   ----------------------------------------------------------------
   Bagi rekod yang borangnya terbuka, dasar perbandingan MESTILAH
   rupa rekod seperti yang dipapar kepada admin — bukan nilai server
   terkini.

   Sebabnya: paparan ditangguhkan semasa borang terbuka (supaya
   taipan admin tidak lenyap), jadi skrin boleh memaparkan nilai
   lama. Kalau kita bandingkan dengan nilai server terkini, setiap
   medan yang admin TIDAK sentuh akan kelihatan seperti "admin ubah
   balik kepada nilai lama" — lalu skor admin lain ditulis ganti.

   Dengan dasar ini, medan yang tidak disentuh sama dengan yang
   dipapar, jadi ia dikira bukan perubahan dan nilai server kekal.
   ---------------------------------------------------------------- */
function _dasarBorang(medan, lama) {
  const a = (typeof asasBorang === 'function') ? asasBorang() : null;
  if (!a || !a.rekod || !a.kunci) return lama;

  const b = a.kunci.split(':');
  const salin = v => JSON.parse(JSON.stringify(v));

  if (b[0] === 'jadual' && medan === 'jadual' && Array.isArray(lama)) {
    const ada = lama.some(x => x && x.id === b[1]);
    return ada ? lama.map(x => (x && x.id === b[1]) ? a.rekod : x)
               : lama.concat([a.rekod]);
  }

  if (b[0] === 'keputusan' && medan === 'keputusan' && lama && typeof lama === 'object') {
    const h = Object.assign({}, lama); h[b[1]] = a.rekod; return h;
  }

  if (b[0] === 'bracket' && medan === 'bracket' && lama && typeof lama === 'object') {
    const h = salin(lama);
    if (h[b[1]] && Array.isArray(h[b[1]][b[2]])) h[b[1]][b[2]][Number(b[3])] = a.rekod;
    return h;
  }

  if (b[0] === 'rr' && medan === 'roundRobin' && lama && typeof lama === 'object') {
    const h = salin(lama);
    if (h[b[1]] && Array.isArray(h[b[1]].perlawanan)) h[b[1]].perlawanan[Number(b[2])] = a.rekod;
    return h;
  }

  return lama;
}

/* Ambil cap JSON semua medan dari satu snapshot server */
function _rakamCapJauh(data) {
  const cap = {};
  MEDAN_SEGERAK.forEach(function (k) { cap[k] = JSON.stringify(data[k]); });
  return cap;
}

/* Medan yang disegerakkan ke Firebase (logAktiviti kekal di localStorage) */
const MEDAN_SEGERAK = [
  'pasukan', 'sukan', 'formatSukan', 'kumpulanSukan', 'jadual',
  'roundRobin', 'bracket', 'keputusan', 'staff', 'password', 'streaming',
  'mata',
];

/* ── Init Firebase ── */
async function initFirebase() {
  if (firestoreInitialized) return;
  try {
    if (typeof firebase === 'undefined') return;
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    firestoreInitialized = true;
    console.log('✅ Firebase connected');
  } catch (e) {
    console.error('Firebase init fail:', e);
  }
}

/* ================================================================
   SIMPAN DATA — Firebase + localStorage backup
   ================================================================ */
async function simpanData() {
  /* 1. localStorage backup */
  try {
    localStorage.setItem('spekma_keputusan',  JSON.stringify(state.keputusan));
    localStorage.setItem('spekma_pasukan',    JSON.stringify(state.pasukan));
    localStorage.setItem('spekma_sukan',      JSON.stringify(state.sukan));
    localStorage.setItem('spekma_jadual',     JSON.stringify(state.jadual));
    localStorage.setItem('spekma_staff',      JSON.stringify(state.staff));
    localStorage.setItem('spekma_password',   state.password);
    localStorage.setItem('spekma_format',     JSON.stringify(state.formatSukan));
    localStorage.setItem('spekma_kumpulan',   JSON.stringify(state.kumpulanSukan));
    localStorage.setItem('spekma_roundrobin', JSON.stringify(state.roundRobin));
    localStorage.setItem('spekma_streaming',  JSON.stringify(state.streaming));
    localStorage.setItem('spekma_mata',       JSON.stringify(state.mata));
    localStorage.setItem('spekma_bracket',    JSON.stringify(state.bracket));
    localStorage.setItem('spekma_log',       JSON.stringify(state.logAktiviti || []));
  } catch (e) { console.warn('localStorage fail:', e); }

  /* 2. Firebase sync */
  if (!db) await initFirebase();
  if (!db) return;

  /* JANGAN tulis sebelum data sebenar dimuat.
     Kalau snapshot pertama belum tiba, state.jadual masih data demo
     JADUAL_ASAL (33 perlawanan MRSM/2025) — menulisnya akan
     mencemarkan jadual pertandingan sebenar. */
  if (!_dataServerSedia) {
    console.error('[SIMPAN] Ditolak — data server belum dimuat.');
    if (typeof paparRalatSimpan === 'function') paparRalatSimpan({ code: 'belum-sedia' });
    return;
  }

  /* Hantar HANYA medan yang benar-benar berubah.
     Dulu kesemua 11 medan ditulis setiap kali — jadi admin yang
     mengemas kini jadual turut menimpa keputusan, pasukan dan
     tetapan yang sedang disunting admin lain. */
  try {
    const kemaskini = {};
    MEDAN_SEGERAK.forEach(function (k) {
      if (JSON.stringify(state[k]) !== _capJauh[k]) kemaskini[k] = state[k];
    });

    const medanUbah = Object.keys(kemaskini);
    if (medanUbah.length === 0) return;   /* tiada perubahan */

    /* Tulis dalam TRANSAKSI: baca nilai server terkini, gabungkan
       perubahan saya sahaja, kemudian tulis. Firestore akan mengulang
       transaksi secara automatik kalau ada orang lain menulis serentak,
       jadi tiada lagi tulisan yang menimpa kerja admin lain. */
    const ruj = db.collection('spekma').doc('mainData');

    await db.runTransaction(async function (tx) {
      const snap     = await tx.get(ruj);
      const diServer = snap.exists ? snap.data() : {};

      const tulis = {};
      medanUbah.forEach(function (k) {
        let lama = (_capJauh[k] !== undefined)
          ? JSON.parse(_capJauh[k])
          : (Array.isArray(state[k]) ? [] : {});
        lama = _dasarBorang(k, lama);          /* rekod dalam borang */
        tulis[k] = _gabungTigaHala(diServer[k], lama, state[k]);
      });
      tulis.lastUpdated = firebase.firestore.FieldValue.serverTimestamp();
      Object.assign(tulis, _capKlien());

      if (snap.exists) tx.update(ruj, tulis);
      else             tx.set(ruj, tulis);
    });

    console.log('[SIMPAN] \u2713 Tersimpan:', medanUbah.join(', '));

    if (typeof tutupRalatSimpan === 'function') tutupRalatSimpan();
  } catch (e) {
    /* JANGAN senyap. Semasa pertandingan, simpan yang gagal tanpa
       amaran bermakna skor hilang dan tiada siapa perasan sehingga
       halaman dimuat semula. */
    console.error('Firebase sync fail:', e);
    if (typeof paparRalatSimpan === 'function') paparRalatSimpan(e);
  }
}

/* ================================================================
   MUAT DATA — Menggunakan onSnapshot (Real-time Sync)
   ================================================================ */
async function muatData() {
  const el = document.getElementById('main-content');
  if (el) el.innerHTML = `
    <div data-menunggu style="text-align:center;padding:80px 20px;color:var(--muted)">
      <div style="font-size:36px;margin-bottom:12px">⏳</div>
      <div>Menghubungkan ke server SPARTA XIII...</div>
    </div>`;

  await initFirebase();
  if (!db) {
      console.warn("DB tidak dapat di-init. Guna offline backup.");
      muatDataOffline(); // Panggil backup kalau internet takde
      return;
  }

  // Listener Real-time
  db.collection('spekma').doc('mainData').onSnapshot((doc) => {
    if (doc.exists) {
      const data = doc.data();
      if (data.pasukan)       state.pasukan       = data.pasukan;
      if (data.sukan)         state.sukan         = data.sukan;
      if (data.formatSukan)   state.formatSukan   = data.formatSukan;
      if (data.kumpulanSukan) state.kumpulanSukan = data.kumpulanSukan;
      if (data.jadual)        state.jadual        = data.jadual;
      if (data.roundRobin)    state.roundRobin    = data.roundRobin;
      if (data.bracket)       state.bracket       = data.bracket;
      if (data.keputusan)     state.keputusan     = data.keputusan;
      if (data.staff)         state.staff         = data.staff;
      if (data.password)      state.password      = data.password;
      if (data.streaming)     state.streaming     = data.streaming;
      if (data.mata)          state.mata          = data.mata;
      if (data.logAktiviti)   state.logAktiviti   = data.logAktiviti;

      console.log('⚡ Data SPEKMA dikemaskini secara Real-time!');
      
      /* Hanya snapshot yang sudah disahkan server jadi asas perbandingan.
         Snapshot tempatan (hasPendingWrites) belum tentu diterima server —
         kalau rules menolaknya, kita masih perlu cuba hantar semula. */
      if (!doc.metadata || !doc.metadata.hasPendingWrites) {
        _capJauh = _rakamCapJauh(data);
        _dataServerSedia = true;
      }


      /* JANGAN render() terus — admin lain mungkin sedang mengisi borang.
         renderSelamat() akan menangguhkannya sehingga borang ditutup. */
      if (typeof renderSelamat === 'function') renderSelamat(); else render(); 
    } else {
        console.log("Dokumen mainData belum wujud di Firebase. Gunakan data lokal.");
        muatDataOffline();
    }
  }, (error) => {
    console.error("Gelong sebab Error Firebase:", error);
    muatDataOffline();
  });
}

/* Fallback kalau internet down */
function muatDataOffline() {
  /* Dulu fungsi ini hanya memulihkan 'keputusan'. Semua medan lain
     kekal sebagai data benih demo yang ditetapkan semasa aplikasi
     bermula — jadi bila sambungan gagal, skrin menunjukkan jadual
     MRSM/2025 dan skor sebenar admin "hilang". */
  const ambil = (kunci, gantian) => {
    try {
      const v = localStorage.getItem(kunci);
      return v ? JSON.parse(v) : gantian;
    } catch (e) { return gantian; }
  };

  state.keputusan     = ambil('spekma_keputusan',  {});
  state.pasukan       = ambil('spekma_pasukan',    []);
  state.sukan         = ambil('spekma_sukan',      []);
  /* Kosong lebih baik daripada data demo: jadual palsu mengelirukan
     admin dan boleh ditulis ke server. */
  state.jadual        = ambil('spekma_jadual',     []);
  state.formatSukan   = ambil('spekma_format',     {});
  state.kumpulanSukan = ambil('spekma_kumpulan',   {});
  state.roundRobin    = ambil('spekma_roundrobin', {});
  state.bracket       = ambil('spekma_bracket',    {});
  state.streaming     = ambil('spekma_streaming',  {});
  state.mata          = ambil('spekma_mata', { kolum: [], nilai: {} });

  console.warn('[MUAT] Offline — guna salinan localStorage. Simpanan dikunci.');
  render();
}

initFirebase();