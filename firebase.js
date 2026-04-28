/* ================================================================
   firebase.js — INTEGRASI FIREBASE FIRESTORE
   Projek: spekma-sukan
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
   MUAT DATA — Firebase dulu, fallback localStorage
   ================================================================ */
async function muatData() {
  const el = document.getElementById('main-content');
  if (el) el.innerHTML = `
    <div style="text-align:center;padding:80px 20px;color:var(--muted)">
      <div style="font-size:36px;margin-bottom:12px">⏳</div>
      <div>Memuatkan data...</div>
    </div>`;

  await initFirebase();

  /* Cuba Firebase */
  if (db) {
    try {
      const docSnap = await db.collection('spekma').doc('mainData').get();
      if (docSnap.exists) {
        const data = docSnap.data();
        if (data.pasukan)       state.pasukan       = data.pasukan;
        if (data.sukan)         state.sukan         = data.sukan;
        if (data.formatSukan)   state.formatSukan   = data.formatSukan;
        if (data.kumpulanSukan) state.kumpulanSukan = data.kumpulanSukan;
        if (data.jadual)        state.jadual        = data.jadual;
        if (data.roundRobin)    state.roundRobin    = data.roundRobin;
        if (data.bracket) {
          state.bracket = data.bracket;
          Object.keys(state.bracket).forEach(sid => {
            if (typeof kemaskiniSemakBracket === 'function') kemaskiniSemakBracket(sid);
          });
        }
        if (data.keputusan)  state.keputusan  = data.keputusan;
        if (data.staff)      state.staff      = data.staff;
        if (data.password)   state.password   = data.password;
        if (data.streaming)  state.streaming  = data.streaming;
        console.log('✅ Data loaded from Firebase');
        if (typeof _bersihkanStatus === 'function') _bersihkanStatus();
        return;
      }
    } catch (e) {
      console.warn('Firebase read fail, guna localStorage:', e);
    }
  }

  /* Fallback localStorage */
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
      Object.keys(state.bracket).forEach(sid => {
        if (typeof kemaskiniSemakBracket === 'function') kemaskiniSemakBracket(sid);
      });
    }
  } catch (e) { console.warn('localStorage fail:', e); }

  if (typeof _bersihkanStatus === 'function') _bersihkanStatus();
}

/* Init awal */
initFirebase();