/* ================================================================
   firebase.js — INTEGRASI FIRESTORE
   ================================================================ */

// ⚠️ GANTIKAN dengan konfigurasi dari Firebase anda (Langkah 2)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let db = null;
let firestoreInitialized = false;

async function initFirebase() {
  if (firestoreInitialized) return;
  
  try {
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK not loaded yet');
      return;
    }
    
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    firestoreInitialized = true;
    console.log('✅ Firebase connected');
  } catch (e) {
    console.error('Firebase init fail:', e);
  }
}

/* ──────────────────────────────────────────────────────────────── */
async function simpanData() {
  // Simpan ke localStorage sebagai backup
  simpanKeLocalStorage();
  
  if (!db) await initFirebase();
  if (!db) return;
  
  const dataToSync = {
    pasukan:      state.pasukan,
    sukan:        state.sukan,
    formatSukan:  state.formatSukan,
    kumpulanSukan: state.kumpulanSukan,
    jadual:       state.jadual,
    roundRobin:   state.roundRobin,
    bracket:      state.bracket,
    keputusan:    state.keputusan,
    staff:        state.staff,
    password:     state.password,
    streaming:    state.streaming,
    lastUpdated:  firebase.firestore.FieldValue.serverTimestamp()
  };
  
  try {
    await db.collection('spekma').doc('mainData').set(dataToSync, { merge: true });
    console.log('✅ Data synced to Firebase');
  } catch (e) {
    console.warn('Firebase sync fail:', e);
  }
}

function simpanKeLocalStorage() {
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
}

/* ──────────────────────────────────────────────────────────────── */
async function muatData() {
  const el = document.getElementById('main-content');
  if (el) {
    el.innerHTML = `
      <div style="text-align:center;padding:80px 20px;color:var(--muted)">
        <div style="font-size:36px;margin-bottom:12px">⏳</div>
        <div>Memuatkan data dari Firebase...</div>
      </div>`;
  }
  
  await initFirebase();
  
  if (db) {
    try {
      const docRef = db.collection('spekma').doc('mainData');
      const docSnap = await docRef.get();
      
      if (docSnap.exists) {
        const data = docSnap.data();
        muatStateDariData(data);
        console.log('✅ Data loaded from Firebase');
        _bersihkanStatus();
        return;
      }
    } catch (e) {
      console.warn('Firebase read fail, use localStorage:', e);
    }
  }
  
  // Fallback ke localStorage
  muatDariLocalStorage();
  _bersihkanStatus();
}

function muatStateDariData(data) {
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
  if (data.keputusan)     state.keputusan     = data.keputusan;
  if (data.staff)         state.staff         = data.staff;
  if (data.password)      state.password      = data.password;
  if (data.streaming)     state.streaming     = data.streaming;
}

function muatDariLocalStorage() {
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
  } catch (e) { console.warn('Gagal muat localStorage:', e); }
}

initFirebase();