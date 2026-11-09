// Oturum akışı: hangi oturumda, hangi grup, hangi adımları, hangi sırayla yapar.

export const RESIMLER = [
  { id: "kedi", e: "🐱", ad: "Kedi" },
  { id: "roket", e: "🚀", ad: "Roket" },
  { id: "cicek", e: "🌸", ad: "Çiçek" },
  { id: "top", e: "⚽", ad: "Top" },
  { id: "gunes", e: "☀️", ad: "Güneş" },
  { id: "balik", e: "🐟", ad: "Balık" },
  { id: "araba", e: "🚗", ad: "Araba" },
  { id: "agac", e: "🌳", ad: "Ağaç" },
  { id: "yildiz", e: "⭐", ad: "Yıldız" },
];

export const OYUN_ADLARI = {
  balon: "Balon Patlatma", hava: "Hava Dilimleyici", buyucu: "Büyücü Düellosu", agiz: "Ağzınla Yakala",
};
export const OYUN_SIMGELERI = { balon: "🎈", hava: "✂️", buyucu: "🧙", agiz: "😮" };
export const VERSIYON_ADLARI = {
  balon: { yz: "elinle (parmak sıkıştırarak)", klasik: "fareyle" },
  hava: { yz: "işaret parmağınla havada keserek", klasik: "fareyle sürükleyerek" },
  buyucu: { yz: "elinle havada şekil çizerek", klasik: "fareyle şekil çizerek" },
  agiz: { yz: "başını ve ağzını kullanarak", klasik: "fare ve boşluk tuşuyla" },
};

// Oturum başına iki oyun: 1. ve 3. oturumda Balon Patlatma + Hava Dilimleyici,
// 2. ve 4. oturumda Büyücü Düellosu + Ağzınla Yakala. Böylece her oyun iki sürümde de birer kez oynanır.
export const OTURUM_OYUNLARI = { 1: ["balon", "hava"], 2: ["buyucu", "agiz"], 3: ["balon", "hava"], 4: ["buyucu", "agiz"] };
export const TUM_OYUNLAR = ["balon", "hava", "buyucu", "agiz"];

export const OTURUM_SAYISI = 4;

// A grubu 1-2. oturumda YZ, 3-4. oturumda klasik oynar; B grubu tersi.
export function oturumVersiyonu(no, grup) {
  const ilkYari = no === 1 || no === 2;
  if (grup === "A") return ilkYari ? "yz" : "klasik";
  return ilkYari ? "klasik" : "yz";
}

// Her oturum bir ders saati (40 dk). Oyun sırası oturumdan oturuma değişir.
export function oturumAdimlari(no, grup) {
  if (no < 1 || no > OTURUM_SAYISI) return [];
  const v = oturumVersiyonu(no, grup);
  const sira = OTURUM_OYUNLARI[no];
  const adimlar = [];
  if (no === 1) {
    adimlar.push(
      { tip: "anket", anket: "demografik" },
      { tip: "anket", anket: "sikilma", baglam: "genel" },
      { tip: "test", test: "on" },
    );
  }
  sira.forEach((oyun) => adimlar.push({ tip: "oyun", oyun, versiyon: v }));
  adimlar.push({ tip: "anket", anket: "oturumSonu", versiyon: v });
  // Her sürümün ikinci oturumunun sonunda o sürüme özel sıkılma anketi
  if (no === 2 || no === 4) adimlar.push({ tip: "anket", anket: "sikilma", baglam: "oyun", versiyon: v });
  if (no === OTURUM_SAYISI) {
    adimlar.push(
      { tip: "anket", anket: "sikilma", baglam: "genel" },
      { tip: "test", test: "son" },
      { tip: "anket", anket: "tercih" },
    );
  }
  return adimlar;
}

// Her adımın oturum içinde benzersiz adı, ör. "3-1".
export function adimKimligi(no, i) {
  return `${no}-${i}`;
}

export function karistir(dizi) {
  const a = dizi.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
