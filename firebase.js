/* ================================================================
   firebase.js — INTEGRASI FIRESTORE (VERSI BETUL)
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

// ========== INIT FIREBASE ==========
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

// ========== SIMPAN DATA (SATU SAHAJA) ==========
async function simpanData() {
  // 1. Simpan ke localStorage
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
  
  // 2. Hantar ke Firebase (pastikan db sedia)
  if (!db) await initFirebase();
  if (!db) return;
  
  const dataToSync = {
    pasukan: state.pasukan,
    sukan: state.sukan,
    formatSukan: state.formatSukan,
    kumpulanSukan: state.kumpulanSukan,
    jadual: state.jadual,
    roundRobin: state.roundRobin,
    bracket: state.bracket,
    keputusan: state.keputusan,
    staff: state.staff,
    password: state.password,
    streaming: state.streaming,  // ← DATA STREAMING DISIMPAN
    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  try {
    await db.collection('spekma').doc('mainData').set(dataToSync, { merge: true });
    console.log('✅ Data synced to Firebase');
  } catch (e) {
    console.warn('Firebase sync fail:', e);
  }
}

// ========== MUAT DATA ==========
async function muatData() {
  const el = document.getElementById('main-content');
  if (el) {
    el.innerHTML = `
      <div style="text-align:center;padding:80px 20px;color:var(--muted)">
        <div style="font-size:36px;margin-bottom:12px">⏳</div>
        <div>Memuatkan data...</div>
      </div>`;
  }
  
  await initFirebase();
  
  if (db) {
    try {
      const docRef = db.collection('spekma').doc('mainData');
      const docSnap = await docRef.get();
      
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
        if (data.keputusan)     state.keputusan     = data.keputusan;
        if (data.staff)         state.staff         = data.staff;
        if (data.password)      state.password      = data.password;
        if (data.streaming)     state.streaming     = data.streaming;  // ← MUAT STREAMING
        
        console.log('✅ Data loaded from Firebase');
        if (typeof _bersihkanStatus === 'function') _bersihkanStatus();
        return;
      }
    } catch (e) {
      console.warn('Firebase read fail, use localStorage:', e);
    }
  }
  
  // Fallback ke localStorage
  try {
    const sm = localStorage.getItem('spekma_streaming');
    if (sm) state.streaming = JSON.parse(sm);
  } catch(e) {}
  
  if (typeof _bersihkanStatus === 'function') _bersihkanStatus();
}

// ========== MULA ==========
initFirebase();