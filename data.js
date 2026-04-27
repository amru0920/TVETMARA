/* ================================================================
   data.js — DATA PASUKAN & SUKAN
   ================================================================ */

const MATA = {
  1: 5,
  2: 3,
  3: 1,
};

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
    modJadual: "auto",
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
    modJadual: "auto",
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
    modJadual: "auto",
    acara: [
      { id: "s3_a1", nama: "Bola Sepak Lelaki" },
    ],
  },

  {
    id: "s4", nama: "Futsal", icon: "🥅", jenis: "pasukan",
    modJadual: "auto",
    acara: [
      { id: "s4_a1", nama: "Futsal Lelaki" },
      { id: "s4_a2", nama: "Futsal Wanita" },
    ],
  },

  {
    id: "s5", nama: "Bola Tampar", icon: "🏐", jenis: "pasukan",
    modJadual: "auto",
    acara: [
      { id: "s5_a1", nama: "Bola Tampar Lelaki" },
      { id: "s5_a2", nama: "Bola Tampar Wanita" },
    ],
  },

  {
    id: "s6", nama: "Renang", icon: "🏊", jenis: "individu",
    modJadual: "auto",
    acara: [
      { id: "s6_a1", nama: "50m Bebas (Lelaki)" },
      { id: "s6_a2", nama: "50m Bebas (Wanita)" },
      { id: "s6_a3", nama: "100m Gaya Dada (Lelaki)" },
      { id: "s6_a4", nama: "100m Gaya Dada (Wanita)" },
    ],
  },

];