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
    localStorage.setItem('spekma_bracket',    JSON.stringify(state.bracket));
    localStorage.setItem('spekma_log',       JSON.stringify(state.logAktiviti || []));
  } catch (e) { console.warn('localStorage fail:', e); }

  /* 2. Firebase sync */
  if (!db) await initFirebase();
  if (!db) return;

  try {
    await db.collection('spekma').doc('mainData').set({
      pasukan:       state.pasukan,
      sukan:         state.sukan,
      formatSukan:   state.formatSukan,
      kumpulanSukan: state.kumpulanSukan,
      jadual:        state.jadual,
      roundRobin:    state.roundRobin,
      bracket:       state.bracket,
      keputusan:     state.keputusan,
      staff:         state.staff,
      password:      state.password,
      streaming:     state.streaming,
      lastUpdated:   firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch (e) {
    console.warn('Firebase sync fail:', e);
  }
}

/* ================================================================
   MUAT DATA — Menggunakan onSnapshot (Real-time Sync)
   ================================================================ */
async function muatData() {
  const el = document.getElementById('main-content');
  if (el) el.innerHTML = `
    <div style="text-align:center;padding:80px 20px;color:var(--muted)">
      <div style="font-size:36px;margin-bottom:12px">⏳</div>
      <div>Menghubungkan ke server SPEKMA...</div>
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
      if (data.logAktiviti)   state.logAktiviti   = data.logAktiviti;

      console.log('⚡ Data SPEKMA dikemaskini secara Real-time!');
      
      if (typeof _bersihkanStatus === 'function') _bersihkanStatus();
      render(); 
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
  try {
    const k = localStorage.getItem('spekma_keputusan');
    if (k) state.keputusan = JSON.parse(k);
    // ... sambung parse yang lain kalau perlu ...
    render();
  } catch (e) { console.error("Backup lokal pun gagal:", e); }
}

initFirebase();