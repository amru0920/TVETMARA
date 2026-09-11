/* ================================================================
   data.js — DATA PASUKAN & SUKAN
   ================================================================ */

/* ================================================================
   SISTEM KIRAAN MARKAH RASMI SPARTA XIII
   ================================================================
   Tiga sistem, ikut format acara. Tempat 1-4 sama bagi ketiga-tiga;
   perbezaannya bermula selepas tempat ke-4:

   · Ranking          → mata ikut NOMBOR TEMPAT (5-10, 11-15, ...)
   · Liga+Kalah Mati  → mata ikut PERINGKAT DICAPAI (Suku Akhir dll.)
   · Kalah Mati       → sama, cuma nama peringkat terakhir berbeza

   Peringkat guna id yang sama bagi kedua-dua sistem berperingkat,
   supaya tukar sistem tidak menghilangkan data yang sudah dimasukkan.

   *Tiada markah bagi kontinjen yang tidak menghantar penyertaan.
   ================================================================ */
const SISTEM_MARKAH = {
  liga_kalah_mati: {
    label: 'Liga + Kalah Mati',
    icon:  '🏆',
    tempat: { 1: 20, 2: 16, 3: 14, 4: 12 },
    peringkat: [
      { id: 'suku_akhir',     label: 'Suku Akhir',        mata: 8 },
      { id: 'pusingan_kedua', label: 'Pusingan Kedua',    mata: 4 },
      { id: 'peringkat_awal', label: 'Pusingan Kumpulan', mata: 2 },
    ],
  },
  ranking: {
    label: 'Ranking',
    icon:  '📊',
    tempat: { 1: 20, 2: 16, 3: 14, 4: 12 },
    julat: [
      { min:  5, max: 10,       mata: 8 },
      { min: 11, max: 15,       mata: 4 },
      { min: 16, max: 26,       mata: 2 },
      { min: 27, max: Infinity, mata: 1 },
    ],
  },
  kalah_mati: {
    label: 'Kalah Mati',
    icon:  '⚔️',
    tempat: { 1: 20, 2: 16, 3: 14, 4: 12 },
    peringkat: [
      { id: 'suku_akhir',     label: 'Suku Akhir',       mata: 8 },
      { id: 'pusingan_kedua', label: 'Pusingan Kedua',   mata: 4 },
      { id: 'peringkat_awal', label: 'Pusingan Pertama', mata: 2 },
    ],
  },
};

const SISTEM_ASAL = 'liga_kalah_mati';   /* kebanyakan acara guna ini */

/* Sistem markah bagi satu acara */
function sistemAcara(acara) {
  const id = acara && acara.sistem;
  return SISTEM_MARKAH[id] ? id : SISTEM_ASAL;
}

/* Mata bagi satu kedudukan bernombor */
function mataTempat(sistemId, pos) {
  const S = SISTEM_MARKAH[sistemId] || SISTEM_MARKAH[SISTEM_ASAL];
  pos = parseInt(pos, 10);
  if (!pos || pos < 1) return 0;
  if (S.tempat[pos] != null) return S.tempat[pos];
  /* Sistem berperingkat: selepas tempat 4 mata datang dari peringkat,
     bukan dari nombor tempat. */
  if (!S.julat) return 0;
  const j = S.julat.find(x => pos >= x.min && pos <= x.max);
  return j ? j.mata : 0;
}

/* Mata bagi satu peringkat yang dicapai */
function mataPeringkat(sistemId, peringkatId) {
  const S = SISTEM_MARKAH[sistemId] || SISTEM_MARKAH[SISTEM_ASAL];
  const p = (S.peringkat || []).find(x => x.id === peringkatId);
  return p ? p.mata : 0;
}

/* Senarai peringkat bagi satu sistem (kosong bagi Ranking) */
function senaraiPeringkat(sistemId) {
  const S = SISTEM_MARKAH[sistemId] || SISTEM_MARKAH[SISTEM_ASAL];
  return S.peringkat || [];
}

/* ================================================================
   SENARAI RASMI SPARTA XIII — Jadual 2
   ================================================================
   Sukan, kategori dan sistem markah, terus dari dokumen rasmi.
   Sistem sudah ditetapkan bagi setiap kategori, jadi admin tidak
   perlu memilihnya — cuma masukkan keputusan.

   Dua pemetaan yang saya buat sendiri kerana dokumen tidak
   menyenaraikan jadual markah berasingan untuknya:
     · "Double Knock Out + Kalah Mati" (Petanque) → Kalah Mati
     · "Swiss Ranking" (Catur)                    → Ranking
   ================================================================ */
const SUKAN_RASMI = [
  { nama: 'Bola Sepak',   icon: '⚽',   jenis: 'pasukan', kategori: [
      { nama: 'Berpasukan Lelaki', sistem: 'liga_kalah_mati' } ] },

  { nama: 'Futsal',       icon: '🥅', jenis: 'pasukan', kategori: [
      { nama: 'Berpasukan Lelaki', sistem: 'liga_kalah_mati' } ] },

  { nama: 'Bola Tampar',  icon: '🏐', jenis: 'pasukan', kategori: [
      { nama: 'Berpasukan Lelaki', sistem: 'liga_kalah_mati' } ] },

  { nama: 'Sepak Takraw', icon: '🪀', jenis: 'pasukan', kategori: [
      { nama: 'Berpasukan Lelaki', sistem: 'liga_kalah_mati' } ] },

  { nama: 'Bola Baling',  icon: '🤾', jenis: 'pasukan', kategori: [
      { nama: 'Berpasukan Lelaki', sistem: 'liga_kalah_mati' } ] },

  { nama: 'Bola Jaring',  icon: '🏀', jenis: 'pasukan', kategori: [
      { nama: 'Berpasukan Wanita', sistem: 'liga_kalah_mati' } ] },

  { nama: 'Badminton',    icon: '🏸', jenis: 'pasukan', kategori: [
      { nama: 'Beregu Lelaki 1', sistem: 'liga_kalah_mati' },
      { nama: 'Beregu Lelaki 2', sistem: 'liga_kalah_mati' },
      { nama: 'Beregu Wanita',   sistem: 'liga_kalah_mati' } ] },

  { nama: 'Ping Pong',    icon: '🏓', jenis: 'pasukan', kategori: [
      { nama: 'Perseorangan Wanita', sistem: 'liga_kalah_mati' },
      { nama: 'Beregu Lelaki',       sistem: 'liga_kalah_mati' },
      { nama: 'Beregu Wanita',       sistem: 'liga_kalah_mati' } ] },

  { nama: 'Dart',         icon: '🎯', jenis: 'pasukan', kategori: [
      { nama: 'Threesome',       sistem: 'liga_kalah_mati' },
      { nama: 'Beregu Campuran', sistem: 'liga_kalah_mati' },
      { nama: 'Beregu Lelaki',   sistem: 'liga_kalah_mati' } ] },

  { nama: 'Petanque',     icon: '🎳', jenis: 'pasukan', kategori: [
      { nama: 'Triple Lelaki', sistem: 'kalah_mati' },
      { nama: 'Triple Wanita', sistem: 'kalah_mati' } ] },

  { nama: 'E-Sport Mobile Legend', icon: '🎮', jenis: 'pasukan', kategori: [
      { nama: 'Berpasukan (MLBB)', sistem: 'kalah_mati' } ] },

  { nama: 'E-Sport PUBG', icon: '🎮', jenis: 'pasukan', kategori: [
      { nama: 'Berpasukan (PUBG)', sistem: 'ranking' } ] },

  { nama: 'TVET Run',     icon: '🏃', jenis: 'individu', kategori: [
      { nama: 'Lelaki',    sistem: 'ranking' },
      { nama: 'Perempuan', sistem: 'ranking' } ] },

  { nama: 'Catur',        icon: '♟️', jenis: 'individu', kategori: [
      { nama: 'Terbuka', sistem: 'ranking' } ] },
];

/* Padankan nama tanpa mengira huruf besar/kecil, ruang atau tanda */
function _kunciNama(n) {
  return String(n || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}


const PASUKAN_ASAL = [
  "MRSM Kepala Batas",
  "MRSM Balik Pulau",
  "MRSM Kubang Pasu",
  "MRSM Langkawi",
  "IKBN Darul Aman",
  "IKM Alor Setar",
  "ADTEC Kedah",
  "MRSM Taiping",
];

const SUKAN_ASAL = [
  {
    id: "s1", nama: "Olahraga", icon: "🏃", jenis: "individu",
    acara: [
      { id: "s1_a1", nama: "Lari 100m (Lelaki)" },
      { id: "s1_a2", nama: "Lari 100m (Wanita)" },
      { id: "s1_a3", nama: "Lari 200m (Lelaki)" },
      { id: "s1_a4", nama: "Lari 200m (Wanita)" },
      { id: "s1_a5", nama: "Lari 400m (Lelaki)" },
      { id: "s1_a6", nama: "Lari 400m (Wanita)" },
      { id: "s1_a7", nama: "Lompat Jauh (Lelaki)" },
      { id: "s1_a8", nama: "Lompat Tinggi (Wanita)" },
      { id: "s1_a9", nama: "Rejam Peluru (Lelaki)" },
      { id: "s1_a10", nama: "4x100m Pemancar (Lelaki)" },
      { id: "s1_a11", nama: "4x100m Pemancar (Wanita)" },
    ],
  },
  {
    id: "s2", nama: "Badminton", icon: "🏸", jenis: "pasukan",
    acara: [
      { id: "s2_a1", nama: "Beregu Lelaki" },
      { id: "s2_a2", nama: "Beregu Wanita" },
      { id: "s2_a3", nama: "Campuran" },
      { id: "s2_a4", nama: "Perseorangan Lelaki" },
      { id: "s2_a5", nama: "Perseorangan Wanita" },
    ],
  },
  {
    id: "s3", nama: "Bola Sepak", icon: "⚽", jenis: "pasukan",
    acara: [
      { id: "s3_a1", nama: "Bola Sepak Lelaki" },
    ],
  },
  {
    id: "s4", nama: "Futsal", icon: "🥅", jenis: "pasukan",
    acara: [
      { id: "s4_a1", nama: "Futsal Lelaki" },
      { id: "s4_a2", nama: "Futsal Wanita" },
    ],
  },
  {
    id: "s5", nama: "Bola Tampar", icon: "🏐", jenis: "pasukan",
    acara: [
      { id: "s5_a1", nama: "Bola Tampar Lelaki" },
      { id: "s5_a2", nama: "Bola Tampar Wanita" },
    ],
  },
  {
    id: "s6", nama: "Renang", icon: "🏊", jenis: "individu",
    acara: [
      { id: "s6_a1", nama: "50m Bebas (Lelaki)" },
      { id: "s6_a2", nama: "50m Bebas (Wanita)" },
      { id: "s6_a3", nama: "100m Gaya Dada (Lelaki)" },
      { id: "s6_a4", nama: "100m Gaya Dada (Wanita)" },
    ],
  },
];

/* ================================================================
   MASKOT SPARTA XIII MENGIKUT SUKAN
   Padanan ikut nama sukan (huruf kecil, tanpa ruang/tanda).
   Kalau nama sukan tak match, kad guna emoji ikon sahaja (fallback).
   ================================================================ */
const MASKOT_SUKAN = {
  olahraga:        "assets/maskot/maskot-umum.png",
  larian:          "assets/maskot/maskot-umum.png",
  badminton:       "assets/maskot/maskot-badminton.png",
  bolasepak:       "assets/maskot/maskot-bola-sepak.png",
  futsal:          "assets/maskot/maskot-futsal.png",
  bolatampar:      "assets/maskot/maskot-bola-tampar.png",
  bolajaring:      "assets/maskot/maskot-bola-jaring.png",
  netball:         "assets/maskot/maskot-bola-jaring.png",
  bolabaling:      "assets/maskot/maskot-bola-baling.png",
  handball:        "assets/maskot/maskot-bola-baling.png",
  catur:           "assets/maskot/maskot-catur.png",
  chess:           "assets/maskot/maskot-catur.png",
  sepaktakraw:     "assets/maskot/maskot-sepak-takraw.png",
  takraw:          "assets/maskot/maskot-sepak-takraw.png",
  petanque:        "assets/maskot/maskot-petanque.png",
  boling:          "assets/maskot/maskot-petanque.png",
  pingpong:        "assets/maskot/maskot-ping-pong.png",
  tenismeja:       "assets/maskot/maskot-ping-pong.png",
  dart:            "assets/maskot/maskot-dart.png",
  panahdarts:      "assets/maskot/maskot-dart.png",
  esukan:          "assets/maskot/maskot-esukan.png",
  esports:         "assets/maskot/maskot-esukan.png",
};

/* Kata kunci separa — untuk nama sukan yang ada tambahan di belakang,
   contoh "E-Sport PUBG", "Bola Sepak Lelaki", "Badminton Beregu".
   Susunan penting: yang lebih spesifik mesti didahulukan. */
const MASKOT_KUNCI = [
  ["sepaktakraw",  "assets/maskot/maskot-sepak-takraw.png"],
  ["takraw",       "assets/maskot/maskot-sepak-takraw.png"],
  ["bolasepak",    "assets/maskot/maskot-bola-sepak.png"],
  ["bolatampar",   "assets/maskot/maskot-bola-tampar.png"],
  ["bolajaring",   "assets/maskot/maskot-bola-jaring.png"],
  ["netball",      "assets/maskot/maskot-bola-jaring.png"],
  ["bolabaling",   "assets/maskot/maskot-bola-baling.png"],
  ["handball",     "assets/maskot/maskot-bola-baling.png"],
  ["futsal",       "assets/maskot/maskot-futsal.png"],
  ["badminton",    "assets/maskot/maskot-badminton.png"],
  ["pingpong",     "assets/maskot/maskot-ping-pong.png"],
  ["tenismeja",    "assets/maskot/maskot-ping-pong.png"],
  ["tabletennis",  "assets/maskot/maskot-ping-pong.png"],
  ["catur",        "assets/maskot/maskot-catur.png"],
  ["chess",        "assets/maskot/maskot-catur.png"],
  ["petanque",     "assets/maskot/maskot-petanque.png"],
  ["boling",       "assets/maskot/maskot-petanque.png"],
  ["bowling",      "assets/maskot/maskot-petanque.png"],
  ["dart",         "assets/maskot/maskot-dart.png"],
  ["panah",        "assets/maskot/maskot-dart.png"],
  /* e-Sukan — termasuk nama permainan */
  ["esukan",       "assets/maskot/maskot-esukan.png"],
  ["esport",       "assets/maskot/maskot-esukan.png"],
  ["egame",        "assets/maskot/maskot-esukan.png"],
  ["pubg",         "assets/maskot/maskot-esukan.png"],
  ["mobilelegend", "assets/maskot/maskot-esukan.png"],
  ["mlbb",         "assets/maskot/maskot-esukan.png"],
  ["dota",         "assets/maskot/maskot-esukan.png"],
  ["valorant",     "assets/maskot/maskot-esukan.png"],
  ["freefire",     "assets/maskot/maskot-esukan.png"],
  ["fifa",         "assets/maskot/maskot-esukan.png"],
  /* Larian & umum — maskot-umum.png ialah maskot sedang berlari */
  ["tvetrun",      "assets/maskot/maskot-umum.png"],
  ["olahraga",     "assets/maskot/maskot-umum.png"],
  ["larian",       "assets/maskot/maskot-umum.png"],
  ["lari",         "assets/maskot/maskot-umum.png"],
  ["run",          "assets/maskot/maskot-umum.png"],
  ["merentasdesa", "assets/maskot/maskot-umum.png"],
  ["balapan",      "assets/maskot/maskot-umum.png"],
  ["padang",       "assets/maskot/maskot-umum.png"],
];

function maskotSukan(nama) {
  if (!nama) return null;
  const key = nama.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!key) return null;

  /* 1. Padanan tepat */
  if (MASKOT_SUKAN[key]) return MASKOT_SUKAN[key];

  /* 2. Padanan kata kunci — nama ada tambahan, cth "E-Sport PUBG" */
  for (const [kunci, fail] of MASKOT_KUNCI) {
    if (key.includes(kunci)) return fail;
  }

  return null;
}

/* ================================================================
   STATE GLOBAL — mesti di sini (data.js diload pertama)
   Nilai kosong/asas sahaja — app.js akan isi nilai betul kemudian
   ================================================================ */
var state = {
  staffLogin:          null,
  tab:                 'kedudukan',
  subTab:              'urus_akaun',
  selectedSukan:       null,
  editingAcara:        null,
  editingPerlawanan:   null,
  selectedHari:        {},
  jadualSukanTab:      null,
  kumpulanSukanTab:    null,
  rrSukanTab:          null,
  rrEditingMatch:      null,
  rrEditPresetSelesai: null,
  streamTab:           'awam',
  jadualPenuhMode:     null,
  jadualPenuhHari:     {},
  drawMode:            null,
  selectedKategori:    {},
  selectedKatKumpulan: {},
  keputusan:           {},
  pasukan:             [],
  sukan:               [],
  jadual:              [],
  staff:               [],
  password:            'tvet2025',
  formatSukan:         {},
  kumpulanSukan:       {},
  roundRobin:          {},
  streaming:           [],
  bracket:             {},
  bracketEdit:              null,
  bracketPresetSelesai:     false,
  _panelTambahCepat:        null,
  logAktiviti:              [],
};