// Veri katmanı. Site geri kalanı yalnızca bu dosyadaki işlevleri kullanır.
// İki arka uç var: "yerel" (tarayıcı belleği, deneme için) ve "firebase" (gerçek uygulama).

import { AYARLAR } from "./ayarlar.js";

export const KOLEKSIYONLAR = ["bloklar", "olaylar", "anketler", "bilgiTesti", "serbestOyun"];

export function ogrenciEpostasi(kod) {
  return `${kod.trim().toLowerCase()}@${AYARLAR.ogrenciAlanAdi}`;
}

// Rumuz: öğrencinin kendi seçtiği takma ad. Gerçek ad yazılmaz. Kayıtlarda kimlik olarak
// rumuzun büyük harfli ve Türkçe harfleri sadeleştirilmiş hali ("kod") kullanılır:
// "Mavi Kuş" -> "MAVIKUS". Böylece giriş yaparken büyük/küçük harf ya da ş/s farkı sorun olmaz.
export const RUMUZ_KURALI = "3-12 karakter; harf ve rakam, harfle başlar";
const TR = { "ç": "c", "ğ": "g", "ı": "i", "i": "i", "ö": "o", "ş": "s", "ü": "u", "â": "a", "î": "i", "û": "u" };

export function rumuzKodu(rumuz) {
  return String(rumuz || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıiöşüâîû]/g, (c) => TR[c])
    .replace(/[\s._-]+/g, "")
    .toUpperCase();
}

export function rumuzHatasi(rumuz) {
  const kod = rumuzKodu(rumuz);
  if (!kod) return "Bir rumuz yaz.";
  if (!/^[A-Z][A-Z0-9]*$/.test(kod)) return "Rumuzda yalnızca harf ve rakam olabilir, harfle başlamalı.";
  if (kod.length < 3 || kod.length > 12) return "Rumuz 3 ile 12 karakter arasında olmalı.";
  return null;
}

export function sifreHatasi(sifre) {
  if (String(sifre || "").length < 6) return "Şifre en az 6 karakter olmalı.";
  if (String(sifre).length > 30) return "Şifre en fazla 30 karakter olabilir.";
  return null;
}

// Yerel modda şifre açık metin olarak değil, SHA-256 özeti olarak tutulur.
// (crypto.subtle her adreste çalışmadığı için küçük bir JS uygulaması kullanılır.)
export function sifreOzeti(sifre) {
  return sha256("proje2204|" + sifre);
}

function sha256(metin) {
  const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const b = Array.from(new TextEncoder().encode(metin));
  const bitUzunluk = b.length * 8;
  b.push(0x80);
  while (b.length % 64 !== 56) b.push(0);
  for (let i = 7; i >= 0; i--) b.push(i >= 4 ? 0 : (bitUzunluk >>> (i * 8)) & 0xff);
  const r = (x, n) => (x >>> n) | (x << (32 - n));
  const w = new Array(64);
  for (let o = 0; o < b.length; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = (b[o + 4 * i] << 24) | (b[o + 4 * i + 1] << 16) | (b[o + 4 * i + 2] << 8) | b[o + 4 * i + 3];
    for (let i = 16; i < 64; i++) {
      const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, bb, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + bb) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  return H.map((x) => (x >>> 0).toString(16).padStart(8, "0")).join("");
}

// Okul düzeyi içinde A ve B gruplarını dengeler: az olan gruba, eşitse rastgele birine atar.
export function dengeliGrup(a, b) {
  if (a < b) return "A";
  if (b < a) return "B";
  return Math.random() < 0.5 ? "A" : "B";
}

export const OKUL_DUZEYLERI = ["İlkokul", "Ortaokul", "Lise"];

function oturumBilgisiYaz(bilgi) {
  try {
    if (bilgi) sessionStorage.setItem("giris", JSON.stringify(bilgi));
    else sessionStorage.removeItem("giris");
  } catch (e) { /* özel pencerede sessionStorage kapalı olabilir */ }
}

function oturumBilgisiOku() {
  try { return JSON.parse(sessionStorage.getItem("giris") || "null"); } catch (e) { return null; }
}

// ---------------------------------------------------------------- yerel arka uç

const YEREL_ANAHTAR = "proje2204-veri";

function yerelOku() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(YEREL_ANAHTAR) || "null"); } catch (e) { d = null; }
  if (!d) d = ornekVeri();
  d = surumGuncelle(d);
  for (const k of KOLEKSIYONLAR) if (!d[k]) d[k] = [];
  if (!d.katilimcilar) d.katilimcilar = {};
  if (!d.canli) d.canli = {};
  if (AYARLAR.ornekGirisGoster) {
    const o = ornekKatilimci();
    if (!d.katilimcilar[o.kod]) d.katilimcilar[o.kod] = o;
  }
  return d;
}

// Yerel deneme modunda hazır bir örnek öğrenci ve açık bir deneme oturumu gelir.
// Örnek rumuz ve şifre ayarlar.js içindeki ornekGiris alanındadır; ana ekranda gösterilir.
export const ORNEK_OGRENCI = AYARLAR.ornekGiris || { rumuz: "MaviKus", sifre: "deneme123", sinif: "Ortaokul", grup: "A" };

function ornekKatilimci() {
  const o = ORNEK_OGRENCI;
  const kod = rumuzKodu(o.rumuz);
  return { kod, sinif: o.sinif || "Ortaokul", grup: o.grup || "A", eposta: ogrenciEpostasi(kod), sifreOzeti: sifreOzeti(o.sifre), durum: "aktif", ornek: true, olusturma: Date.now() };
}

function ornekVeri() {
  return {
    surum: 2,
    katilimcilar: {},
    ayar: { oturum: { no: 1, acik: true, deneme: true }, uyelik: { acik: true } },
    canli: {},
  };
}

// Önceki sürümün (kod + resimli şifre) yerel verisi varsa yeni yapıya taşınır.
function surumGuncelle(d) {
  if (d.surum === 2) return d;
  for (const [kod, k] of Object.entries(d.katilimcilar || {})) {
    if (!k.sifreOzeti) delete d.katilimcilar[kod];
  }
  d.ayar = d.ayar || {};
  if (!d.ayar.uyelik) d.ayar.uyelik = { acik: true };
  d.surum = 2;
  return d;
}

function yerelYaz(d) {
  localStorage.setItem(YEREL_ANAHTAR, JSON.stringify(d));
}

let sayac = 0;
function yeniKimlik() {
  sayac += 1;
  return Date.now().toString(36) + "-" + sayac + "-" + Math.random().toString(36).slice(2, 7);
}

const yerel = {
  async baslat() {},

  async ogrenciGiris(rumuz, sifre) {
    const d = yerelOku();
    const k = d.katilimcilar[rumuzKodu(rumuz)];
    if (!k || k.sifreOzeti !== sifreOzeti(sifre)) throw new Error("Rumuz ya da şifre hatalı.");
    if (k.durum === "cekildi") throw new Error("Bu rumuz kullanılamıyor. Öğretmenine sor.");
    oturumBilgisiYaz({ rol: "ogrenci", kod: k.kod, eposta: k.eposta });
    return k;
  },

  async uyelikDurumu() { return yerelOku().ayar.uyelik || { acik: true }; },

  async ogrenciUyeOl(rumuz, sifre, sinif) {
    const d = yerelOku();
    if (!(d.ayar.uyelik || { acik: true }).acik) throw new Error("Üyelik şu an kapalı. Öğretmenine sor.");
    const kod = rumuzKodu(rumuz);
    if (d.katilimcilar[kod]) throw new Error("Bu rumuz alınmış. Başka bir rumuz seç.");
    const ayni = Object.values(d.katilimcilar).filter((x) => x.sinif === sinif && x.durum !== "cekildi" && !x.ornek);
    const grup = dengeliGrup(ayni.filter((x) => x.grup === "A").length, ayni.filter((x) => x.grup === "B").length);
    const k = { kod, sinif, grup, eposta: ogrenciEpostasi(kod), sifreOzeti: sifreOzeti(sifre), durum: "aktif", olusturma: Date.now() };
    d.katilimcilar[kod] = k;
    yerelYaz(d);
    oturumBilgisiYaz({ rol: "ogrenci", kod, eposta: k.eposta });
    return k;
  },

  async ogretmenGiris(eposta, sifre) {
    if (eposta.trim().toLowerCase() !== AYARLAR.ogretmenEposta.toLowerCase() || sifre !== "ogretmen") {
      throw new Error("Yerel deneme modunda öğretmen şifresi: ogretmen");
    }
    oturumBilgisiYaz({ rol: "ogretmen", eposta: AYARLAR.ogretmenEposta });
  },

  async cikis() { oturumBilgisiYaz(null); },

  async aktifKullanici() { return oturumBilgisiOku(); },

  async katilimciBilgisi(kod) {
    return yerelOku().katilimcilar[kod] || null;
  },

  async oturumDurumu() { return yerelOku().ayar.oturum; },

  async ekleToplu(kol, liste) {
    const b = oturumBilgisiOku();
    const d = yerelOku();
    for (const v of liste) {
      d[kol].push({ ...v, id: yeniKimlik(), kod: b.kod, eposta: b.eposta, deneme: !!d.ayar.oturum.deneme, zaman: Date.now() });
    }
    yerelYaz(d);
  },

  async kendiKayitlarim(kol, oturumNo) {
    const b = oturumBilgisiOku();
    return yerelOku()[kol].filter((r) => r.eposta === b.eposta && (oturumNo == null || r.oturum === oturumNo));
  },

  async canliYaz(veri) {
    const b = oturumBilgisiOku();
    const d = yerelOku();
    d.canli[b.kod] = { ...veri, kod: b.kod, eposta: b.eposta, guncelleme: Date.now() };
    yerelYaz(d);
  },

  // --- öğretmen
  async katilimcilar() { return Object.values(yerelOku().katilimcilar); },

  async sifreSifirla(kod, yeniSifre) {
    const d = yerelOku();
    if (!d.katilimcilar[kod]) throw new Error("Rumuz bulunamadı.");
    d.katilimcilar[kod].sifreOzeti = sifreOzeti(yeniSifre);
    yerelYaz(d);
  },

  async uyelikAyarla(acik) {
    const d = yerelOku();
    d.ayar.uyelik = { acik: !!acik, guncelleme: Date.now() };
    yerelYaz(d);
  },

  // Birden çok bilgisayarda yerel modla çalışılırsa her bilgisayarın verisi yedek dosyası olarak
  // indirilir ve öğretmen bilgisayarında birleştirilir.
  async yedekAl() {
    const d = yerelOku();
    return { tur: "proje2204-yedek", surum: 2, alinma: Date.now(), katilimcilar: d.katilimcilar,
      ...Object.fromEntries(KOLEKSIYONLAR.map((k) => [k, d[k]])) };
  },

  async yedekBirlestir(y) {
    if (!y || y.tur !== "proje2204-yedek") throw new Error("Bu dosya bir site yedeği değil.");
    const d = yerelOku();
    const sonuc = { katilimci: 0, kayit: 0, cakisan: [] };
    for (const [kod, k] of Object.entries(y.katilimcilar || {})) {
      if (!d.katilimcilar[kod]) { d.katilimcilar[kod] = k; sonuc.katilimci += 1; }
      else if (d.katilimcilar[kod].olusturma !== k.olusturma && !k.ornek) sonuc.cakisan.push(kod);
    }
    for (const kol of KOLEKSIYONLAR) {
      const var_ = new Set(d[kol].map((r) => r.id));
      for (const r of y[kol] || []) if (!var_.has(r.id)) { d[kol].push(r); sonuc.kayit += 1; }
    }
    yerelYaz(d);
    return sonuc;
  },

  async katilimciGuncelle(kod, alanlar) {
    const d = yerelOku();
    if (d.katilimcilar[kod]) Object.assign(d.katilimcilar[kod], alanlar);
    yerelYaz(d);
  },

  async oturumAyarla(oturum) {
    const d = yerelOku();
    d.ayar.oturum = { ...oturum, guncelleme: Date.now() };
    yerelYaz(d);
  },

  async ayarOku(ad) { return yerelOku().ayar[ad] || null; },

  async ayarYaz(ad, veri) {
    const d = yerelOku();
    d.ayar[ad] = veri;
    yerelYaz(d);
  },

  async hepsi(kol) {
    const d = yerelOku();
    if (kol === "canli") return Object.values(d.canli);
    return d[kol];
  },

  async kodunVerisiniSil(kod) {
    const d = yerelOku();
    for (const k of KOLEKSIYONLAR) d[k] = d[k].filter((r) => r.kod !== kod);
    delete d.canli[kod];
    yerelYaz(d);
  },

  async tumVeriyiSil() {
    localStorage.removeItem(YEREL_ANAHTAR);
  },
};

// ---------------------------------------------------------------- firebase arka uç

const SURUM = "10.12.2";
let fb = null; // { app, auth, db, m: modüller }

async function fbYukle() {
  if (fb) return fb;
  const temel = `https://www.gstatic.com/firebasejs/${SURUM}`;
  const [appM, authM, fsM] = await Promise.all([
    import(`${temel}/firebase-app.js`),
    import(`${temel}/firebase-auth.js`),
    import(`${temel}/firebase-firestore.js`),
  ]);
  const app = appM.initializeApp(AYARLAR.firebase);
  const auth = authM.getAuth(app);
  const db = fsM.getFirestore(app);
  fb = { app, auth, db, appM, authM, fsM };
  await new Promise((coz) => {
    const bitir = authM.onAuthStateChanged(auth, () => { bitir(); coz(); });
  });
  return fb;
}

const firebase = {
  async baslat() { await fbYukle(); },

  async ogrenciGiris(rumuz, sifre) {
    const { auth, db, authM, fsM } = await fbYukle();
    const kod = rumuzKodu(rumuz);
    try {
      await authM.signInWithEmailAndPassword(auth, ogrenciEpostasi(kod), sifre);
    } catch (e) {
      throw new Error("Rumuz ya da şifre hatalı.");
    }
    const s = await fsM.getDoc(fsM.doc(db, "katilimcilar", kod));
    if (!s.exists() || s.data().durum === "cekildi") {
      await authM.signOut(auth);
      throw new Error("Bu rumuz kullanılamıyor. Öğretmenine sor.");
    }
    oturumBilgisiYaz({ rol: "ogrenci", kod, eposta: ogrenciEpostasi(kod) });
    return s.data();
  },

  async uyelikDurumu() {
    const { db, fsM } = await fbYukle();
    try {
      const s = await fsM.getDoc(fsM.doc(db, "acik", "uyelik"));
      return s.exists() ? s.data() : { acik: false };
    } catch (e) { return { acik: false }; }
  },

  async ogrenciUyeOl(rumuz, sifre, sinif) {
    const { auth, db, authM, fsM } = await fbYukle();
    const kod = rumuzKodu(rumuz);
    const eposta = ogrenciEpostasi(kod);
    try {
      await authM.createUserWithEmailAndPassword(auth, eposta, sifre);
    } catch (e) {
      if (e.code === "auth/email-already-in-use") throw new Error("Bu rumuz alınmış. Başka bir rumuz seç.");
      throw new Error("Üyelik açılamadı: " + (e.code || e.message));
    }
    // Grup, okul düzeyi içinde dengeli atanır. Sayaç belgesi yalnızca birer birer artırılabilir (firestore.rules).
    let grup;
    try {
      grup = await fsM.runTransaction(db, async (t) => {
        const ref = fsM.doc(db, "acik", "grupSayaci");
        const s = await t.get(ref);
        const v = s.exists() ? s.data() : {};
        const g = dengeliGrup(v[`${sinif}_A`] || 0, v[`${sinif}_B`] || 0);
        const alan = `${sinif}_${g}`;
        if (s.exists()) t.update(ref, { [alan]: (v[alan] || 0) + 1 });
        else t.set(ref, { [alan]: 1 });
        return g;
      });
    } catch (e) {
      grup = Math.random() < 0.5 ? "A" : "B";
    }
    try {
      await fsM.setDoc(fsM.doc(db, "katilimcilar", kod), { kod, sinif, grup, eposta, durum: "aktif", olusturma: Date.now() });
    } catch (e) {
      await authM.deleteUser(auth.currentUser).catch(() => {});
      throw new Error("Üyelik şu an kapalı ya da kaydedilemedi. Öğretmenine sor.");
    }
    oturumBilgisiYaz({ rol: "ogrenci", kod, eposta });
    return { kod, sinif, grup };
  },

  async ogretmenGiris(eposta, sifre) {
    const { auth, authM } = await fbYukle();
    if (eposta.trim().toLowerCase() !== AYARLAR.ogretmenEposta.toLowerCase()) throw new Error("Bu e-posta öğretmen hesabı değil.");
    try {
      await authM.signInWithEmailAndPassword(auth, eposta.trim(), sifre);
    } catch (e) {
      throw new Error("E-posta ya da şifre hatalı.");
    }
    oturumBilgisiYaz({ rol: "ogretmen", eposta: eposta.trim().toLowerCase() });
  },

  async cikis() {
    const { auth, authM } = await fbYukle();
    await authM.signOut(auth);
    oturumBilgisiYaz(null);
  },

  async aktifKullanici() {
    const { auth } = await fbYukle();
    if (!auth.currentUser) { oturumBilgisiYaz(null); return null; }
    return oturumBilgisiOku();
  },

  async katilimciBilgisi(kod) {
    const { db, fsM } = await fbYukle();
    const s = await fsM.getDoc(fsM.doc(db, "katilimcilar", kod));
    return s.exists() ? s.data() : null;
  },

  async oturumDurumu() {
    const { db, fsM } = await fbYukle();
    const s = await fsM.getDoc(fsM.doc(db, "ayar", "oturum"));
    return s.exists() ? s.data() : { no: 1, acik: false, deneme: true };
  },

  async ekleToplu(kol, liste) {
    if (!liste.length) return;
    const { db, fsM } = await fbYukle();
    const b = oturumBilgisiOku();
    const o = await this.oturumDurumu();
    // Firestore toplu yazmada en fazla 500 kayıt kabul eder.
    for (let i = 0; i < liste.length; i += 400) {
      const toplu = fsM.writeBatch(db);
      for (const v of liste.slice(i, i + 400)) {
        const ref = fsM.doc(fsM.collection(db, kol));
        toplu.set(ref, { ...v, kod: b.kod, eposta: b.eposta, deneme: !!o.deneme, zaman: Date.now(), sunucuZamani: fsM.serverTimestamp() });
      }
      await toplu.commit();
    }
  },

  async kendiKayitlarim(kol, oturumNo) {
    const { db, fsM } = await fbYukle();
    const b = oturumBilgisiOku();
    const kosullar = [fsM.where("eposta", "==", b.eposta)];
    if (oturumNo != null) kosullar.push(fsM.where("oturum", "==", oturumNo));
    const s = await fsM.getDocs(fsM.query(fsM.collection(db, kol), ...kosullar));
    return s.docs.map((x) => ({ id: x.id, ...x.data() }));
  },

  async canliYaz(veri) {
    const { db, fsM } = await fbYukle();
    const b = oturumBilgisiOku();
    await fsM.setDoc(fsM.doc(db, "canli", b.kod), { ...veri, kod: b.kod, eposta: b.eposta, guncelleme: Date.now() });
  },

  // --- öğretmen
  async katilimcilar() {
    const { db, fsM } = await fbYukle();
    const s = await fsM.getDocs(fsM.collection(db, "katilimcilar"));
    return s.docs.map((x) => x.data());
  },

  async sifreSifirla() {
    throw new Error("Firebase modunda şifre panelden değiştirilemez. Firebase konsolu > Authentication > Users bölümünden hesabı silip öğrencinin yeniden üye olmasını sağlayın.");
  },

  async uyelikAyarla(acik) {
    const { db, fsM } = await fbYukle();
    await fsM.setDoc(fsM.doc(db, "acik", "uyelik"), { acik: !!acik, guncelleme: Date.now() });
  },

  async katilimciGuncelle(kod, alanlar) {
    const { db, fsM } = await fbYukle();
    await fsM.updateDoc(fsM.doc(db, "katilimcilar", kod), alanlar);
  },

  async oturumAyarla(oturum) {
    const { db, fsM } = await fbYukle();
    await fsM.setDoc(fsM.doc(db, "ayar", "oturum"), { ...oturum, guncelleme: Date.now() });
  },

  async ayarOku(ad) {
    const { db, fsM } = await fbYukle();
    const s = await fsM.getDoc(fsM.doc(db, "ayar", ad));
    return s.exists() && s.data().json ? JSON.parse(s.data().json) : null;
  },

  async ayarYaz(ad, veri) {
    const { db, fsM } = await fbYukle();
    // Firestore iç içe dizileri kabul etmez; model metin olarak saklanır.
    await fsM.setDoc(fsM.doc(db, "ayar", ad), { json: JSON.stringify(veri), guncelleme: Date.now() });
  },

  async hepsi(kol) {
    const { db, fsM } = await fbYukle();
    const s = await fsM.getDocs(fsM.collection(db, kol));
    return s.docs.map((x) => ({ id: x.id, ...x.data() }));
  },

  async kodunVerisiniSil(kod) {
    const { db, fsM } = await fbYukle();
    for (const kol of [...KOLEKSIYONLAR, "canli"]) {
      const s = await fsM.getDocs(fsM.query(fsM.collection(db, kol), fsM.where("kod", "==", kod)));
      for (let i = 0; i < s.docs.length; i += 400) {
        const toplu = fsM.writeBatch(db);
        s.docs.slice(i, i + 400).forEach((x) => toplu.delete(x.ref));
        await toplu.commit();
      }
    }
  },

  async tumVeriyiSil() {
    const { db, fsM } = await fbYukle();
    for (const kol of [...KOLEKSIYONLAR, "canli", "katilimcilar", "acik"]) {
      const s = await fsM.getDocs(fsM.collection(db, kol));
      for (let i = 0; i < s.docs.length; i += 400) {
        const toplu = fsM.writeBatch(db);
        s.docs.slice(i, i + 400).forEach((x) => toplu.delete(x.ref));
        await toplu.commit();
      }
    }
  },
};

export const Veri = AYARLAR.mod === "firebase" ? firebase : yerel;
