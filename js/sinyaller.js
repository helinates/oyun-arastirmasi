// Sıkılma sinyalleri ve sıkılma tahmin modeli.
//
// Fikir: öğrenci "Bu oyunu bitir" düğmesine basmadan önce davranışı değişir mi?
// (cevaplar yavaşlar, balonlar kaçar, el/fare hareketsiz kalır, sekme değiştirilir...)
// Her oyun bloğu dakikalara bölünür, her dakika bir "örnek" olur. Etiket: öğrenci sonraki
// TAHMIN_PENCERESI_DK dakika içinde bitir düğmesine bastı mı. Model, bu örneklerden
// öğrencilerin okuyup anlayabileceği "EĞER ... İSE" kuralları çıkaran küçük bir karar ağacıdır.

export const TAHMIN_PENCERESI_DK = 2;
const CEVAPSIZ_DAKIKA_SN = 20; // hiç cevap verilmeyen dakikada cevap süresi bu kabul edilir

export const OZELLIKLER = {
  cevapSn: { ad: "ortalama cevap süresi", birim: "sn" },
  cevapArtisi: { ad: "cevap süresinin ilk dakikaya göre artışı", birim: "kat" },
  cevapSayisi: { ad: "cevap sayısı", birim: "" },
  kacirma: { ad: "kaçırılan soru sayısı", birim: "" },
  dogruOrani: { ad: "doğru oranı", birim: "" },
  hareketsizSn: { ad: "hareketsiz geçen süre", birim: "sn" },
  sekme: { ad: "başka sekmeye geçme sayısı", birim: "" },
  dakika: { ad: "oyunun kaçıncı dakikası", birim: "" },
};

// Bir bloğun olaylarından dakika dakika özet çıkarır. baslangic: oyunun asıl başladığı an (ms).
export function dakikaOzetleri(olaylar, baslangic, bitis) {
  if (!baslangic) return [];
  const dakikaSayisi = Math.max(1, Math.ceil((bitis - baslangic) / 60000));
  const d = Array.from({ length: dakikaSayisi }, (_, dk) => ({
    dk, cevap: 0, dogru: 0, kacirma: 0, cevapMsToplam: 0, cevapMsSayi: 0, hareketsizMs: 0, sekme: 0,
    tamSure: baslangic + (dk + 1) * 60000 <= bitis,
  }));
  for (const o of olaylar) {
    const dk = Math.floor((o.t - baslangic) / 60000);
    if (dk < 0 || dk >= dakikaSayisi) continue;
    const m = d[dk];
    if (o.tur === "cevap") {
      m.cevap += 1;
      if (o.dogru) m.dogru += 1;
      if (typeof o.sureMs === "number") { m.cevapMsToplam += o.sureMs; m.cevapMsSayi += 1; }
    } else if (o.tur === "kacirildi") m.kacirma += 1;
    else if (o.tur === "hareketsizlik" && typeof o.sureMs === "number") m.hareketsizMs += Math.min(o.sureMs, 60000);
    else if (o.tur === "sekme_gizlendi") m.sekme += 1;
  }
  return d.map((m) => ({
    dk: m.dk, tamSure: m.tamSure, cevap: m.cevap, dogru: m.dogru, kacirma: m.kacirma, sekme: m.sekme,
    ortCevapSn: m.cevapMsSayi ? Math.round(m.cevapMsToplam / m.cevapMsSayi / 100) / 10 : null,
    hareketsizSn: Math.round(m.hareketsizMs / 1000),
  }));
}

// dk. dakikanın özelliklerini modelin kullandığı biçime çevirir.
export function ozellikler(dakikalik, dk) {
  const m = dakikalik[dk];
  const ilk = dakikalik.find((x) => x.ortCevapSn != null);
  const cevapSn = m.ortCevapSn ?? CEVAPSIZ_DAKIKA_SN;
  return {
    cevapSn,
    cevapArtisi: ilk ? Math.round((cevapSn / ilk.ortCevapSn) * 100) / 100 : 1,
    cevapSayisi: m.cevap,
    kacirma: m.kacirma,
    dogruOrani: m.cevap ? Math.round((m.dogru / m.cevap) * 100) / 100 : 0,
    hareketsizSn: m.hareketsizSn,
    sekme: m.sekme,
    dakika: dk,
  };
}

// Blok kayıtlarından eğitim örnekleri. Serbest oyun ve kalibrasyonu bitmemiş bloklar alınmaz.
export function ornekler(bloklar) {
  const liste = [];
  for (const b of bloklar) {
    if (b.serbest || !Array.isArray(b.dakikalik) || !b.dakikalik.length) continue;
    const bitirDk = b.neden === "gonullu" ? b.oynamaSn / 60 : null;
    for (const m of b.dakikalik) {
      if (!m.tamSure) continue;
      // Etiket: bu dakika bittikten sonraki pencere içinde bitir'e bastı mı?
      const sonra = m.dk + 1;
      const etiket = bitirDk != null && bitirDk >= sonra && bitirDk < sonra + TAHMIN_PENCERESI_DK ? 1 : 0;
      liste.push({ kod: b.kod, blokId: b.blokId, versiyon: b.versiyon, oyun: b.oyun, x: ozellikler(b.dakikalik, m.dk), y: etiket });
    }
  }
  return liste;
}

// ------------------------------------------------------------------ karar ağacı

function gini(liste) {
  if (!liste.length) return 0;
  const p = liste.reduce((t, o) => t + o.y, 0) / liste.length;
  return 2 * p * (1 - p);
}

function yaprak(liste) {
  const pozitif = liste.reduce((t, o) => t + o.y, 0);
  return { yaprak: true, n: liste.length, pozitif, risk: liste.length ? pozitif / liste.length : 0 };
}

function enIyiBolme(liste, enAzYaprak) {
  let enIyi = null;
  const temel = gini(liste);
  for (const oz of Object.keys(OZELLIKLER)) {
    const degerler = [...new Set(liste.map((o) => o.x[oz]))].sort((a, b) => a - b);
    for (let i = 0; i < degerler.length - 1; i++) {
      const esik = (degerler[i] + degerler[i + 1]) / 2;
      const sol = liste.filter((o) => o.x[oz] <= esik);
      const sag = liste.filter((o) => o.x[oz] > esik);
      if (sol.length < enAzYaprak || sag.length < enAzYaprak) continue;
      const kazanc = temel - (sol.length * gini(sol) + sag.length * gini(sag)) / liste.length;
      if (!enIyi || kazanc > enIyi.kazanc) enIyi = { oz, esik: Math.round(esik * 100) / 100, kazanc, sol, sag };
    }
  }
  return enIyi && enIyi.kazanc > 0.001 ? enIyi : null;
}

export function agacEgit(liste, { derinlik = 2, enAzYaprak = 4 } = {}) {
  if (derinlik === 0 || liste.length < 2 * enAzYaprak) return yaprak(liste);
  const b = enIyiBolme(liste, enAzYaprak);
  if (!b) return yaprak(liste);
  return {
    oz: b.oz, esik: b.esik, n: liste.length,
    sol: agacEgit(b.sol, { derinlik: derinlik - 1, enAzYaprak }),
    sag: agacEgit(b.sag, { derinlik: derinlik - 1, enAzYaprak }),
  };
}

export function riskHesapla(agac, x) {
  let d = agac;
  while (!d.yaprak) d = x[d.oz] <= d.esik ? d.sol : d.sag;
  return d.risk;
}

// Ağacı "EĞER ... VE ... İSE" cümlelerine çevirir.
export function kurallar(agac, kosullar = []) {
  if (agac.yaprak) return [{ kosullar, n: agac.n, pozitif: agac.pozitif, risk: agac.risk }];
  const o = OZELLIKLER[agac.oz];
  const esik = `${String(agac.esik).replace(".", ",")}${o.birim ? " " + o.birim : ""}`;
  return [
    ...kurallar(agac.sol, [...kosullar, `${o.ad} ≤ ${esik}`]),
    ...kurallar(agac.sag, [...kosullar, `${o.ad} > ${esik}`]),
  ];
}

// Her öğrenci sırayla dışarıda bırakılır: model diğerleriyle eğitilip o öğrencide denenir.
// Böylece model, hiç görmediği bir öğrencide ne kadar başarılı olur, onu ölçeriz.
export function birakBirDegerlendir(liste, secenekler) {
  const kodlar = [...new Set(liste.map((o) => o.kod))];
  let dp = 0; let yp = 0; let dn = 0; let yn = 0;
  for (const kod of kodlar) {
    const egitim = liste.filter((o) => o.kod !== kod);
    const test = liste.filter((o) => o.kod === kod);
    if (!egitim.some((o) => o.y) || !test.length) continue;
    const agac = agacEgit(egitim, secenekler);
    for (const o of test) {
      const tahmin = riskHesapla(agac, o.x) >= 0.5 ? 1 : 0;
      if (tahmin && o.y) dp++; else if (tahmin && !o.y) yp++; else if (!tahmin && o.y) yn++; else dn++;
    }
  }
  const toplam = dp + yp + dn + yn;
  const pozitif = liste.filter((o) => o.y).length;
  return {
    toplam, dp, yp, dn, yn,
    dogruluk: toplam ? (dp + dn) / toplam : null,
    yakalama: dp + yn ? dp / (dp + yn) : null, // sıkılanların ne kadarını yakaladı
    isabet: dp + yp ? dp / (dp + yp) : null, // "sıkılıyor" dediklerinin ne kadarı gerçekten sıkıldı
    tabanDogruluk: liste.length ? Math.max(pozitif, liste.length - pozitif) / liste.length : null,
  };
}
