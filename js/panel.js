// Öğretmen paneli: katılımcılar, oturum yönetimi, canlı izleme, istatistik, dışa aktarma, silme.

import { AYARLAR } from "./ayarlar.js";
import { Veri, rumuzKodu, sifreHatasi } from "./veri.js";
import { OTURUM_SAYISI } from "./akis.js";
import { ortalama, medyan } from "./istatistik.js";
import { ornekler, agacEgit, riskHesapla, kurallar, birakBirDegerlendir, OZELLIKLER, TAHMIN_PENCERESI_DK } from "./sinyaller.js";

const $ = (id) => document.getElementById(id);

function html(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}


function yuvarla(x, b = 1) {
  if (x == null || Number.isNaN(x)) return "–";
  return Number(x).toFixed(b).replace(".", ",");
}

// ------------------------------------------------------------------ giriş

await Veri.baslat();
if (AYARLAR.mod === "yerel") {
  $("denemeSeridi").classList.remove("gizli");
  $("eposta").value = AYARLAR.ogretmenEposta;
}

const k = await Veri.aktifKullanici();
if (k && k.rol === "ogretmen") panelAc();
else $("girisKutusu").classList.remove("gizli");

$("girisDugmesi").onclick = async () => {
  $("girisHata").textContent = "";
  try {
    await Veri.ogretmenGiris($("eposta").value, $("sifre").value);
    $("girisKutusu").classList.add("gizli");
    panelAc();
  } catch (e) {
    $("girisHata").textContent = e.message;
  }
};
$("sifre").addEventListener("keydown", (e) => { if (e.key === "Enter") $("girisDugmesi").click(); });
$("cikis").onclick = async () => { await Veri.cikis(); location.reload(); };

let canliZamanlayici = null;

function panelAc() {
  $("panel").classList.remove("gizli");
  document.querySelectorAll("#sekmeler button").forEach((b) => {
    b.onclick = () => sekmeAc(b.dataset.s);
  });
  oturumCiz();
  katilimcilariCiz();
}

function sekmeAc(ad) {
  document.querySelectorAll("#sekmeler button").forEach((b) => b.classList.toggle("aktif", b.dataset.s === ad));
  document.querySelectorAll("[data-sekme]").forEach((s) => s.classList.toggle("gizli", s.dataset.sekme !== ad));
  clearInterval(canliZamanlayici);
  if (ad === "oturum") oturumCiz();
  if (ad === "katilimcilar") katilimcilariCiz();
  if (ad === "canli") { modelYukle().then(canliCiz); canliZamanlayici = setInterval(canliCiz, 5000); }
  if (ad === "istatistik") istatistikCiz();
  if (ad === "tahmin") tahminGiris();
}

// ------------------------------------------------------------------ oturum

async function oturumCiz() {
  const o = await Veri.oturumDurumu();
  $("oturumNo").value = String(o.no || 1);
  $("denemeKutusu").checked = !!o.deneme;
  $("oturumDurum").innerHTML = o.acik
    ? `<span class="rozet iyi">Açık</span> ${o.no}. oturum ${o.deneme ? '<span class="rozet uyari">deneme</span>' : ""}`
    : `<span class="rozet">Kapalı</span> (son: ${o.no}. oturum)`;
}

$("oturumAc").onclick = async () => {
  await Veri.oturumAyarla({ no: Number($("oturumNo").value), acik: true, deneme: $("denemeKutusu").checked });
  oturumCiz();
};
$("oturumKapat").onclick = async () => {
  const o = await Veri.oturumDurumu();
  await Veri.oturumAyarla({ ...o, acik: false });
  oturumCiz();
};

// ------------------------------------------------------------------ katılımcılar

const tarihYaz = (t) => (t ? new Date(t).toLocaleDateString("tr-TR") : "–");

async function katilimcilariCiz() {
  $("katilimciHata").textContent = "";
  const [liste0, uyelik, bloklar, anketler] = await Promise.all([
    Veri.katilimcilar(), Veri.uyelikDurumu(), Veri.hepsi("bloklar"), Veri.hepsi("anketler"),
  ]);
  const liste = liste0.sort((a, b) => (a.ornek ? 1 : 0) - (b.ornek ? 1 : 0) || a.kod.localeCompare(b.kod));
  const verisiVar = new Set([...bloklar, ...anketler].map((r) => r.kod));
  $("uyelikDurum").innerHTML = uyelik.acik ? '<span class="rozet iyi">Üyelik açık</span>' : '<span class="rozet">Üyelik kapalı</span>';
  $("uyelikDegistir").textContent = uyelik.acik ? "Üyeliği kapat" : "Üyeliği aç";
  $("uyelikDegistir").onclick = async () => { await Veri.uyelikAyarla(!uyelik.acik); katilimcilariCiz(); };

  const gercek = liste.filter((x) => !x.ornek && x.durum !== "cekildi");
  const sayim = {};
  for (const x of gercek) {
    sayim[x.sinif] = sayim[x.sinif] || { A: 0, B: 0 };
    sayim[x.sinif][x.grup] += 1;
  }
  const yerel = AYARLAR.mod === "yerel";
  $("katilimciTablosu").innerHTML = `
    <tr><th>Rumuz</th><th>Düzey</th><th>Grup</th><th>Üyelik</th><th>Durum</th><th></th></tr>
    ${liste.map((x) => `<tr ${x.ornek ? 'class="soluk"' : ""}>
      <td><strong>${html(x.kod)}</strong>${x.ornek ? ' <span class="rozet uyari">örnek, analize katılmaz</span>' : ""}</td>
      <td>${html(x.sinif)}</td>
      <td>${html(x.grup)}</td>
      <td>${tarihYaz(x.olusturma)}</td>
      <td>${x.durum === "cekildi" ? '<span class="rozet kotu">çekildi</span>' : '<span class="rozet iyi">aktif</span>'}</td>
      <td><div class="satir" style="margin:0;gap:6px">
        ${x.durum === "cekildi"
          ? `<button class="ikincil" data-geri="${html(x.kod)}">Geri al</button>`
          : `<button class="ikincil" data-cek="${html(x.kod)}">Çekildi say</button>`}
        ${verisiVar.has(x.kod) ? "" : `<button class="ikincil" data-grup="${html(x.kod)}" data-g="${x.grup}">Grubu ${x.grup === "A" ? "B" : "A"} yap</button>`}
        ${yerel ? `<button class="ikincil" data-sifre="${html(x.kod)}">Şifreyi sıfırla</button>` : ""}
      </div></td>
    </tr>`).join("")}
    <tr><td colspan="6" class="soluk">Toplam ${gercek.length} aktif öğrenci${Object.keys(sayim).length ? " · " : ""}${Object.entries(sayim).map(([d, g]) => `${html(d)}: A ${g.A}, B ${g.B}`).join(" · ")}</td></tr>`;
  document.querySelectorAll("[data-cek]").forEach((b) => {
    b.onclick = async () => { await Veri.katilimciGuncelle(b.dataset.cek, { durum: "cekildi" }); katilimcilariCiz(); };
  });
  document.querySelectorAll("[data-geri]").forEach((b) => {
    b.onclick = async () => { await Veri.katilimciGuncelle(b.dataset.geri, { durum: "aktif" }); katilimcilariCiz(); };
  });
  document.querySelectorAll("[data-grup]").forEach((b) => {
    b.onclick = async () => {
      const yeni = b.dataset.g === "A" ? "B" : "A";
      if (!confirm(`${b.dataset.grup} rumuzlu öğrencinin grubu ${yeni} olacak. Emin misin?`)) return;
      await Veri.katilimciGuncelle(b.dataset.grup, { grup: yeni });
      katilimcilariCiz();
    };
  });
  document.querySelectorAll("[data-sifre]").forEach((b) => {
    b.onclick = async () => {
      const yeni = prompt(`${b.dataset.sifre} için yeni şifreyi yaz (en az 6 karakter). Öğrenciye söyle, o da bir kağıda yazsın.`);
      if (yeni == null) return;
      const h = sifreHatasi(yeni);
      if (h) { $("katilimciHata").textContent = h; return; }
      try {
        await Veri.sifreSifirla(b.dataset.sifre, yeni);
        $("katilimciHata").innerHTML = `<span class="basari">${html(b.dataset.sifre)} şifresi değiştirildi.</span>`;
      } catch (e) { $("katilimciHata").textContent = e.message; }
    };
  });
  rumuzListesiHazirla(gercek);
}

// Rumuz-ad eşleştirmesi bilgisayarda tutulmaz: liste boş ad sütunuyla yazdırılır, ad kağıda elle yazılır.
function rumuzListesiHazirla(liste) {
  $("rumuzListesi").innerHTML = `
    <h2>Rumuz listesi</h2>
    <p class="kucuk">Bu kağıt yalnızca araştırmacıda kalır; veri toplama tamamlanınca imha edilir. Öğrenci adı bilgisayara yazılmaz.</p>
    <table>
      <tr><th style="width:28%">Rumuz</th><th style="width:16%">Düzey</th><th style="width:10%">Grup</th><th>Öğrencinin adı soyadı (elle yazılır)</th></tr>
      ${liste.map((x) => `<tr><td>${html(x.kod)}</td><td>${html(x.sinif)}</td><td>${html(x.grup)}</td><td></td></tr>`).join("")}
      ${Array.from({ length: 5 }, () => "<tr><td></td><td></td><td></td><td></td></tr>").join("")}
    </table>`;
}

$("listeYazdir").onclick = () => {
  $("rumuzListesi").classList.remove("gizli");
  setTimeout(() => { window.print(); $("rumuzListesi").classList.add("gizli"); }, 100);
};

// ------------------------------------------------------------------ canlı

const ADIM_ADLARI = { bekliyor: "Bekliyor", anket: "Anket", test: "Bilgi testi", oyun: "Oyunda", serbest: "Serbest oyun", bitti: "Bitirdi" };

let kayitliModel = null;
async function modelYukle() {
  try { kayitliModel = await Veri.ayarOku("model"); } catch (e) { kayitliModel = null; }
}

function riskRozeti(c) {
  if (c.adimTip !== "oyun" || !c.ozellik) return "–";
  if (!kayitliModel) return '<span class="soluk kucuk">model yok</span>';
  const r = riskHesapla(kayitliModel.agac, c.ozellik);
  const sinif = r >= 0.5 ? "kotu" : r >= 0.25 ? "uyari" : "iyi";
  return `<span class="rozet ${sinif}">%${Math.round(r * 100)}</span>`;
}

async function canliCiz() {
  const [canli, o] = await Promise.all([Veri.hepsi("canli"), Veri.oturumDurumu()]);
  const simdi = Date.now();
  const satirlar = canli.filter((c) => c.oturum === o.no).sort((a, b) => a.kod.localeCompare(b.kod));
  $("canliTablo").innerHTML = `
    <tr><th>Rumuz</th><th>Adım</th><th>Ne yapıyor</th><th>Oyun</th><th>Dakika</th><th>Sıkılma riski</th><th>Son haber</th></tr>
    ${satirlar.map((c) => {
      const gecen = Math.round((simdi - c.guncelleme) / 1000);
      const rozet = c.adimTip === "bitti" ? "iyi" : gecen > 60 ? "uyari" : "";
      return `<tr>
        <td><strong>${html(c.kod)}</strong></td>
        <td>${c.adimNo ?? "–"}</td>
        <td><span class="rozet ${rozet}">${html(ADIM_ADLARI[c.adimTip] || c.adimTip)}</span></td>
        <td>${c.oyun ? `${html(c.oyun)} · ${html(c.versiyon)}` : "–"}</td>
        <td>${c.dakika ?? "–"}</td>
        <td>${riskRozeti(c)}</td>
        <td>${gecen < 60 ? `${gecen} sn önce` : `${Math.round(gecen / 60)} dk önce`}</td>
      </tr>`;
    }).join("") || `<tr><td colspan="7" class="soluk">Bu oturumda henüz giriş yapan yok.</td></tr>`}`;
}

// ------------------------------------------------------------------ istatistik

async function ornekKodlar() {
  return new Set((await Veri.katilimcilar()).filter((k) => k.ornek).map((k) => k.kod));
}

async function tumVeri() {
  const dahil = $("denemeleriDahilEt").checked;
  let [katilimcilar, bloklar, anketler, testler, serbest] = await Promise.all([
    Veri.katilimcilar(), Veri.hepsi("bloklar"), Veri.hepsi("anketler"), Veri.hepsi("bilgiTesti"), Veri.hepsi("serbestOyun"),
  ]);
  const ornekler_ = new Set(katilimcilar.filter((k) => k.ornek).map((k) => k.kod));
  const suz = (l) => (dahil ? l : l.filter((r) => !r.deneme && !ornekler_.has(r.kod)));
  if (!dahil) katilimcilar = katilimcilar.filter((k) => !k.ornek);
  return { katilimcilar, bloklar: suz(bloklar), anketler: suz(anketler), testler: suz(testler), serbest: suz(serbest) };
}

// Her katılımcı için analizde kullanılacak tek satır.
function katilimciOzeti(v) {
  return v.katilimcilar.sort((a, b) => a.kod.localeCompare(b.kod)).map((k) => {
    const s = { kod: k.kod, sinif: k.sinif, grup: k.grup, durum: k.durum };
    const bl = v.bloklar.filter((b) => b.kod === k.kod && !b.serbest);
    for (const ver of ["yz", "klasik"]) {
      const b = bl.filter((x) => x.versiyon === ver);
      s[`${ver}_blokSayisi`] = b.length;
      s[`${ver}_ortOynamaDk`] = b.length ? ortalama(b.map((x) => x.oynamaSn / 60)) : null;
      s[`${ver}_gonulluBitirme`] = b.filter((x) => x.neden === "gonullu").length;
      s[`${ver}_dogruOrani`] = b.reduce((t, x) => t + x.soruSayisi, 0)
        ? b.reduce((t, x) => t + x.dogruSayisi, 0) / b.reduce((t, x) => t + x.soruSayisi, 0) : null;
      s[`${ver}_ortCevapSn`] = b.filter((x) => x.ortCevapMs).length
        ? ortalama(b.filter((x) => x.ortCevapMs).map((x) => x.ortCevapMs / 1000)) : null;
      // Yenilik etkisi için: bu sürümü oynadığı ilk ve ikinci oturum ayrı ayrı.
      const oturumlar = [...new Set(b.map((x) => x.oturum))].sort((x, y) => x - y);
      ["ilk", "ikinci"].forEach((ad, i) => {
        const ob = b.filter((x) => x.oturum === oturumlar[i]);
        s[`${ver}_${ad}OturumDk`] = ob.length ? ortalama(ob.map((x) => x.oynamaSn / 60)) : null;
      });
      const os = v.anketler.filter((a) => a.kod === k.kod && a.anket === "oturumSonu" && a.versiyon === ver);
      s[`${ver}_oturumSonuPuan`] = os.length ? ortalama(os.map((a) => a.puan)) : null;
      const sk = v.anketler.find((a) => a.kod === k.kod && a.anket === "sikilma" && a.baglam === "oyun" && a.versiyon === ver);
      s[`${ver}_sikilmaPuan`] = sk ? sk.puan : null;
    }
    for (const ver of ["yz", "klasik"]) {
      const a = s[`${ver}_ilkOturumDk`]; const b = s[`${ver}_ikinciOturumDk`];
      s[`${ver}_dusus`] = a != null && b != null ? a - b : null;
    }
    s.yzAvantaji = s.yz_ortOynamaDk != null && s.klasik_ortOynamaDk != null ? s.yz_ortOynamaDk - s.klasik_ortOynamaDk : null;
    const sikOn = v.anketler.find((a) => a.kod === k.kod && a.anket === "sikilma" && a.baglam === "genel" && a.oturum === 1);
    const sikSon = v.anketler.find((a) => a.kod === k.kod && a.anket === "sikilma" && a.baglam === "genel" && a.oturum === OTURUM_SAYISI);
    s.sikilmaGenelOn = sikOn ? sikOn.puan : null;
    s.sikilmaGenelSon = sikSon ? sikSon.puan : null;
    const on = v.testler.find((t) => t.kod === k.kod && t.tur === "on");
    const son = v.testler.find((t) => t.kod === k.kod && t.tur === "son");
    s.testOn = on ? on.dogruSayisi : null;
    s.testSon = son ? son.dogruSayisi : null;
    const tercih = v.anketler.find((a) => a.kod === k.kod && a.anket === "tercih");
    s.tercih = tercih ? tercih.yanitlar.tercih : null;
    s.tercihNeden = tercih ? tercih.yanitlar.neden : null;
    const secimler = v.serbest.filter((x) => x.kod === k.kod && x.tip === "secim");
    s.serbest_yzSn = secimler.filter((x) => x.versiyon === "yz").reduce((t, x) => t + x.sureSn, 0);
    s.serbest_klasikSn = secimler.filter((x) => x.versiyon === "klasik").reduce((t, x) => t + x.sureSn, 0);
    s.serbest_ilkSecim = secimler.sort((a, b) => a.sira - b.sira)[0]?.versiyon || null;
    return s;
  });
}

// Betimsel karşılaştırma satırı: n, ortalama ve ortanca (medyan). Proje veri analizi betimsel istatistikle sınırlıdır.
function betimselSatir(ad, ozet, alanYz, alanKl, birim) {
  const ciftler = ozet.filter((s) => s.durum !== "cekildi" && s[alanYz] != null && s[alanKl] != null);
  const yz = ciftler.map((s) => s[alanYz]);
  const kl = ciftler.map((s) => s[alanKl]);
  const fark = yz.length ? ortalama(yz) - ortalama(kl) : null;
  return `<tr>
    <td>${ad}</td><td>${ciftler.length}</td>
    <td>${yuvarla(ortalama(yz))} ${birim}</td><td>${yuvarla(medyan(yz))} ${birim}</td>
    <td>${yuvarla(ortalama(kl))} ${birim}</td><td>${yuvarla(medyan(kl))} ${birim}</td>
    <td>${fark == null ? "–" : (fark > 0 ? "+" : "") + yuvarla(fark) + " " + birim}</td>
  </tr>`;
}

function cubuk(deger, enBuyuk, sinif = "") {
  const g = enBuyuk ? Math.round((deger / enBuyuk) * 100) : 0;
  return `<div class="cubuk ${sinif}" style="width:${g}%;min-width:2px"></div>`;
}

async function istatistikCiz() {
  $("istatistikIcerik").innerHTML = "<p>Hesaplanıyor…</p>";
  const v = await tumVeri();
  const ozet = katilimciOzeti(v);
  const bl = v.bloklar.filter((b) => !b.serbest);

  // Versiyon bazında blok özeti.
  const blokOzet = ["yz", "klasik"].map((ver) => {
    const b = bl.filter((x) => x.versiyon === ver);
    const gonullu = b.filter((x) => x.neden === "gonullu");
    return {
      ver, n: b.length,
      ortDk: b.length ? ortalama(b.map((x) => x.oynamaSn / 60)) : null,
      gonulluOran: b.length ? gonullu.length / b.length : null,
      bitirmeDk: gonullu.length ? medyan(gonullu.map((x) => x.oynamaSn / 60)) : null,
      dogru: b.reduce((t, x) => t + x.soruSayisi, 0) ? b.reduce((t, x) => t + x.dogruSayisi, 0) / b.reduce((t, x) => t + x.soruSayisi, 0) : null,
      algilama: b.reduce((t, x) => t + (x.algilamaSorunu || 0), 0),
    };
  });

  // Dakika dakika "hala oynuyor" eğrisi.
  const egri = [];
  for (let dk = 0; dk <= AYARLAR.oyunSuresiDk; dk++) {
    const satir = { dk };
    for (const ver of ["yz", "klasik"]) {
      const b = bl.filter((x) => x.versiyon === ver);
      satir[ver] = b.length ? b.filter((x) => x.oynamaSn / 60 >= dk || x.neden === "sure").length / b.length : null;
    }
    egri.push(satir);
  }

  // Oturum katılımı.
  const katilim = Array.from({ length: OTURUM_SAYISI }, (_, i) => i + 1).map((no) => {
    const kodlar = new Set();
    [...v.anketler, ...v.testler, ...v.bloklar, ...v.serbest].filter((r) => r.oturum === no).forEach((r) => kodlar.add(r.kod));
    return { no, n: kodlar.size };
  });

  const tercihSay = {};
  ozet.forEach((s) => { if (s.tercih) tercihSay[s.tercih] = (tercihSay[s.tercih] || 0) + 1; });


  // Oturum oturum seyir: heyecan geçince oynama süresi düşüyor mu?
  const seyir = [1, 2, 3, 4].map((no) => {
    const satir = { no };
    for (const ver of ["yz", "klasik"]) {
      const b = bl.filter((x) => x.oturum === no && x.versiyon === ver);
      satir[ver] = b.length ? { n: b.length, dk: medyan(b.map((x) => x.oynamaSn / 60)), bitir: b.filter((x) => x.neden === "gonullu").length / b.length } : null;
    }
    return satir;
  });
  const aktif = ozet.filter((x) => x.durum !== "cekildi");
  const siraA = aktif.filter((x) => x.grup === "A" && x.yzAvantaji != null).map((x) => x.yzAvantaji);
  const siraB = aktif.filter((x) => x.grup === "B" && x.yzAvantaji != null).map((x) => x.yzAvantaji);

  $("istatistikIcerik").innerHTML = `
    <h2>Oturum katılımı</h2>
    <div class="satir">${katilim.map((k) => `<span class="rozet">${k.no}. oturum: ${k.n}</span>`).join(" ")}</div>

    <h2>Oyun blokları</h2>
    <div class="tablo-kap"><table>
      <tr><th>Versiyon</th><th>Blok</th><th>Ort. oynama</th><th>"Bitir"e basma oranı</th><th>Basanların medyan süresi</th><th>Doğru oranı</th><th>Algılama sorunu</th></tr>
      ${blokOzet.map((o) => `<tr>
        <td><strong>${o.ver === "yz" ? "YZ" : "Klasik"}</strong></td><td>${o.n}</td>
        <td>${yuvarla(o.ortDk)} dk</td><td>${o.gonulluOran == null ? "–" : "%" + Math.round(o.gonulluOran * 100)}</td>
        <td>${yuvarla(o.bitirmeDk)} dk</td><td>${o.dogru == null ? "–" : "%" + Math.round(o.dogru * 100)}</td>
        <td>${o.algilama}</td></tr>`).join("")}
    </table></div>

    <h2>Dakika dakika oynamaya devam edenler</h2>
    <p class="soluk kucuk">Mavi: YZ, gri: klasik. Çizgi kısaldıkça o dakikada oyunu bırakan öğrenci artıyor demektir.</p>
    <div class="tablo-kap"><table>
      <tr><th style="width:70px">Dakika</th><th>YZ</th><th>Klasik</th></tr>
      ${egri.map((e) => `<tr><td>${e.dk}</td>
        <td>${e.yz == null ? "–" : cubuk(e.yz, 1) + `<span class="kucuk">%${Math.round(e.yz * 100)}</span>`}</td>
        <td>${e.klasik == null ? "–" : cubuk(e.klasik, 1, "k") + `<span class="kucuk">%${Math.round(e.klasik * 100)}</span>`}</td></tr>`).join("")}
    </table></div>

    <h2>YZ ile klasik karşılaştırması (betimsel)</h2>
    <p class="soluk kucuk">Her öğrenci iki sürümü de oynadığı için değerler aynı öğrencilerden gelir. Tablo yalnızca betimsel istatistik (ortalama, ortanca, fark) gösterir; ayrıntılı analiz verinin dışa aktarılmasıyla SPSS'te yapılır.</p>
    <div class="tablo-kap"><table>
      <tr><th>Ölçüm</th><th>n</th><th>YZ ortalama</th><th>YZ ortanca</th><th>Klasik ortalama</th><th>Klasik ortanca</th><th>Fark (YZ − klasik)</th></tr>
      ${betimselSatir("Ortalama oynama süresi", ozet, "yz_ortOynamaDk", "klasik_ortOynamaDk", "dk")}
      ${betimselSatir("Sıkılma anketi puanı", ozet, "yz_sikilmaPuan", "klasik_sikilmaPuan", "")}
      ${betimselSatir("Oturum sonu anketi", ozet, "yz_oturumSonuPuan", "klasik_oturumSonuPuan", "")}
      ${betimselSatir("Doğru cevap oranı", ozet, "yz_dogruOrani", "klasik_dogruOrani", "")}
      ${betimselSatir("Bilgi testi (ön → son)", ozet, "testSon", "testOn", "")}
    </table></div>
    <p class="soluk kucuk">Sıkılma anketi puanı yükseldikçe ilgi kaybı artar. Bilgi testi satırında "YZ" sütunları son testi, "Klasik" sütunları ön testi gösterir.</p>

    <h2>Yenilik etkisi: heyecan geçince fark sürüyor mu?</h2>
    <p class="soluk kucuk">Her öğrenci bir sürümü art arda iki oturum oynar. YZ sürümünde ikinci oturumdaki düşüş klasikten belirgin şekilde büyükse,
      ilk farkın bir kısmı "yeni bir şey" heyecanından geliyor demektir.</p>
    <div class="tablo-kap"><table>
      <tr><th>Oturum</th><th>YZ: medyan oynama</th><th>YZ: "bitir" oranı</th><th>Klasik: medyan oynama</th><th>Klasik: "bitir" oranı</th></tr>
      ${seyir.map((r) => `<tr><td>${r.no}</td>
        <td>${r.yz ? yuvarla(r.yz.dk) + " dk" : "–"}</td><td>${r.yz ? "%" + Math.round(r.yz.bitir * 100) : "–"}</td>
        <td>${r.klasik ? yuvarla(r.klasik.dk) + " dk" : "–"}</td><td>${r.klasik ? "%" + Math.round(r.klasik.bitir * 100) : "–"}</td></tr>`).join("")}
    </table></div>
    <div class="tablo-kap" style="margin-top:10px"><table>
      <tr><th>Karşılaştırma</th><th>n</th><th>1. ortalama</th><th>1. ortanca</th><th>2. ortalama</th><th>2. ortanca</th><th>Fark (1 − 2)</th></tr>
      ${betimselSatir("YZ: ilk oturum → ikinci oturum", ozet, "yz_ilkOturumDk", "yz_ikinciOturumDk", "dk")}
      ${betimselSatir("Klasik: ilk oturum → ikinci oturum", ozet, "klasik_ilkOturumDk", "klasik_ikinciOturumDk", "dk")}
      ${betimselSatir("Düşüş miktarı: YZ ile klasik", ozet, "yz_dusus", "klasik_dusus", "dk")}
    </table></div>

    <h2>Sıra etkisi: önce hangi sürümü oynadığı fark ediyor mu?</h2>
    <p class="soluk kucuk">YZ avantajı = öğrencinin YZ'de oynadığı ortalama süre eksi klasikte oynadığı ortalama süre. A grubu önce YZ, B grubu önce klasik oynadı. İki grubun değerleri birbirine yakınsa sıranın belirgin bir etkisi görünmüyor demektir.</p>
    <div class="tablo-kap"><table>
      <tr><th>Grup</th><th>n</th><th>YZ avantajı ortalaması</th><th>YZ avantajı ortancası</th></tr>
      <tr><td>A (önce YZ)</td><td>${siraA.length}</td><td>${yuvarla(ortalama(siraA))} dk</td><td>${yuvarla(medyan(siraA))} dk</td></tr>
      <tr><td>B (önce klasik)</td><td>${siraB.length}</td><td>${yuvarla(ortalama(siraB))} dk</td><td>${yuvarla(medyan(siraB))} dk</td></tr>
    </table></div>

    <h2>Son oturum tercihleri</h2>
    <div class="satir">${Object.entries(tercihSay).map(([t, n]) => `<span class="rozet">${html(t)}: ${n}</span>`).join(" ") || '<span class="soluk">Henüz yok</span>'}</div>

    <h2>Katılımcılar</h2>
    <div class="tablo-kap"><table>
      <tr><th>Rumuz</th><th>Düzey</th><th>Grup</th><th>YZ dk</th><th>Klasik dk</th><th>YZ sıkılma</th><th>Klasik sıkılma</th><th>Ön test</th><th>Son test</th><th>Tercih</th></tr>
      ${ozet.map((s) => `<tr ${s.durum === "cekildi" ? 'class="soluk"' : ""}>
        <td>${html(s.kod)}</td><td>${html(s.sinif)}</td><td>${s.grup}</td>
        <td>${yuvarla(s.yz_ortOynamaDk)}</td><td>${yuvarla(s.klasik_ortOynamaDk)}</td>
        <td>${s.yz_sikilmaPuan ?? "–"}</td><td>${s.klasik_sikilmaPuan ?? "–"}</td>
        <td>${s.testOn ?? "–"}</td><td>${s.testSon ?? "–"}</td><td>${html(s.tercih ?? "–")}</td></tr>`).join("")}
    </table></div>`;
}

$("yenile").onclick = istatistikCiz;
$("denemeleriDahilEt").onchange = istatistikCiz;

// ------------------------------------------------------------------ dışa aktarma

function csvYap(satirlar) {
  if (!satirlar.length) return "";
  const alanlar = [];
  satirlar.forEach((s) => Object.keys(s).forEach((k) => { if (!alanlar.includes(k)) alanlar.push(k); }));
  const hucre = (x) => {
    if (x == null) return "";
    if (typeof x === "number") return String(Math.round(x * 1000) / 1000).replace(".", ",");
    if (typeof x === "object") x = JSON.stringify(x);
    x = String(x);
    return /[;"\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x;
  };
  return [alanlar.join(";"), ...satirlar.map((s) => alanlar.map((k) => hucre(s[k])).join(";"))].join("\n");
}

// Anketlerin yanıtlarını her madde ayrı sütun olacak şekilde açar.
function duzlestir(kol, satirlar) {
  return satirlar.map((r) => {
    const { sunucuZamani, eposta, ...kalan } = r;
    if (typeof kalan.zaman === "number") kalan.tarih = new Date(kalan.zaman).toLocaleString("tr-TR");
    if (kol === "anketler" && r.yanitlar) {
      const { yanitlar, ...diger } = kalan;
      return { ...diger, ...Object.fromEntries(Object.entries(yanitlar).map(([k, v]) => [`m_${k}`, v])) };
    }
    if (kol === "bilgiTesti" && r.yanitlar) {
      const { yanitlar, ...diger } = kalan;
      return { ...diger, ...Object.fromEntries(yanitlar.map((y) => [`s_${y.soruId}`, y.dogru ? 1 : 0])) };
    }
    return kalan;
  });
}

function indir(ad, metin) {
  const blob = new Blob(["﻿" + metin], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = ad;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

document.querySelectorAll("[data-csv]").forEach((b) => {
  b.onclick = async () => {
    const tarih = new Date().toISOString().slice(0, 10);
    if (b.dataset.csv === "dakikalar") {
      const orn = await ornekKodlar();
      const bl = (await Veri.hepsi("bloklar")).filter((x) => !x.deneme && !orn.has(x.kod));
      indir(`dakika-ornekleri-${tarih}.csv`, csvYap(ornekler(bl).map((o) => ({
        kod: o.kod, oyun: o.oyun, versiyon: o.versiyon, ...o.x, sikiliyor: o.y,
      }))));
      return;
    }
    if (b.dataset.csv === "ozet") {
      const v = await tumVeri();
      indir(`katilimci-ozeti-${tarih}.csv`, csvYap(katilimciOzeti(v)));
      return;
    }
    const satirlar = await Veri.hepsi(b.dataset.csv);
    indir(`${b.dataset.csv}-${tarih}.csv`, csvYap(duzlestir(b.dataset.csv, satirlar)));
  };
});

// ------------------------------------------------------------------ silme

$("koduSil").onclick = async () => {
  const kod = rumuzKodu($("silKod").value);
  if (!kod || !(await Veri.katilimciBilgisi(kod))) { $("veriMesaj").textContent = "Bu rumuzla kayıtlı öğrenci yok."; return; }
  if (!confirm(`${kod} rumuzuna ait TÜM veriler kalıcı olarak silinecek. Emin misin?`)) return;
  await Veri.kodunVerisiniSil(kod);
  await Veri.katilimciGuncelle(kod, { durum: "cekildi" }).catch(() => {});
  $("veriMesaj").textContent = `${kod} verileri silindi.`;
};

// ------------------------------------------------------------------ yedek (yerel mod)

if (AYARLAR.mod === "yerel") $("yedekBolumu").classList.remove("gizli");

$("yedekIndir").onclick = async () => {
  const y = await Veri.yedekAl();
  const blob = new Blob([JSON.stringify(y)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `site-yedegi-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

$("yedekDosya").onchange = async (e) => {
  const f = e.target.files[0];
  e.target.value = "";
  if (!f) return;
  try {
    const s = await Veri.yedekBirlestir(JSON.parse(await f.text()));
    $("veriMesaj").textContent = `Yedek birleştirildi: ${s.katilimci} yeni öğrenci, ${s.kayit} yeni kayıt.`
      + (s.cakisan.length ? ` Dikkat: ${s.cakisan.join(", ")} rumuzu iki bilgisayarda ayrı ayrı açılmış; bu öğrencilerin kayıtları aynı rumuzda birleşti, kontrol et.` : "");
    katilimcilariCiz();
  } catch (err) {
    $("veriMesaj").textContent = "Yedek okunamadı: " + err.message;
  }
};

$("hepsiniSil").onclick = async () => {
  const yanit = prompt('Tüm katılımcılar ve tüm veriler kalıcı olarak silinecek. Onaylamak için SİL yaz.');
  if (yanit !== "SİL") return;
  await Veri.tumVeriyiSil();
  $("veriMesaj").textContent = "Tüm veriler silindi." + (AYARLAR.mod === "firebase" ? " Öğrenci hesaplarını Firebase konsolundan silmeyi unutma (KURULUM.md)." : "");
  katilimcilariCiz();
};

// ------------------------------------------------------------------ sıkılma tahmini

const yuzde = (x) => (x == null ? "–" : `%${Math.round(x * 100)}`);

async function tahminGiris() {
  $("pencere").textContent = TAHMIN_PENCERESI_DK;
  await modelYukle();
  $("tahminIcerik").innerHTML = kayitliModel
    ? `<p class="basari">Kayıtlı bir model var (${new Date(kayitliModel.tarih).toLocaleString("tr-TR")}, ${kayitliModel.ornekSayisi} örnek). Canlı izleme sekmesi bu modeli kullanıyor.</p>
       ${kuralTablosu(kayitliModel.agac)}`
    : `<p class="soluk">Henüz kayıtlı model yok. Oyun oturumlarından sonra "Modeli eğit"e bas.</p>`;
}

function kuralTablosu(agac) {
  const k = kurallar(agac).sort((a, b) => b.risk - a.risk);
  return `<div class="tablo-kap"><table>
    <tr><th>Kural</th><th>Örnek</th><th>Bunların kaçı sıkıldı</th><th>Risk</th></tr>
    ${k.map((r) => `<tr>
      <td>${r.kosullar.length ? "EĞER " + r.kosullar.map(html).join(" <strong>VE</strong> ") : "Her durumda"}</td>
      <td>${r.n}</td><td>${r.pozitif}</td>
      <td><span class="rozet ${r.risk >= 0.5 ? "kotu" : r.risk >= 0.25 ? "uyari" : "iyi"}">${yuzde(r.risk)}</span></td>
    </tr>`).join("")}
  </table></div>`;
}

let sonEgitim = null;

$("egit").onclick = async () => {
  $("tahminIcerik").innerHTML = "<p>Eğitiliyor…</p>";
  const dahil = $("tahminDeneme").checked;
  const orn = await ornekKodlar();
  const bl = (await Veri.hepsi("bloklar")).filter((b) => dahil || (!b.deneme && !orn.has(b.kod)));
  const liste = ornekler(bl);
  const pozitif = liste.filter((o) => o.y).length;
  const secenekler = { derinlik: Number($("derinlik").value), enAzYaprak: Math.max(2, Number($("enAzYaprak").value) || 4) };
  if (pozitif < 3 || liste.length < 20) {
    $("tahminIcerik").innerHTML = `<p class="hata">Yeterli veri yok: ${liste.length} dakika örneği, bunların ${pozitif} tanesi "sıkılıyor".
      En az 20 örnek ve 3 "sıkılıyor" örneği gerekiyor. Oyun oturumları bitince yeniden dene.</p>`;
    return;
  }
  const agac = agacEgit(liste, secenekler);
  const d = birakBirDegerlendir(liste, secenekler);

  // Sıkılan ve sıkılmayan dakikaların ortalama değerleri: öğrencilerin ilk bakacağı tablo.
  const ort = (y, oz) => ortalama(liste.filter((o) => o.y === y).map((o) => o.x[oz]));
  sonEgitim = { agac, ornekSayisi: liste.length, pozitif, secenekler, degerlendirme: d, tarih: Date.now() };

  $("tahminIcerik").innerHTML = `
    <p>${liste.length} dakika örneği (${new Set(liste.map((o) => o.kod)).size} öğrenci), bunların <strong>${pozitif}</strong> tanesi "sıkılıyor".</p>

    <h2>1. Sıkılmadan önce davranış nasıl değişiyor?</h2>
    <div class="tablo-kap"><table>
      <tr><th>Sinyal</th><th>Sıkılmadan önceki dakikalar</th><th>Diğer dakikalar</th></tr>
      ${Object.entries(OZELLIKLER).map(([oz, o]) => `<tr><td>${html(o.ad)}</td>
        <td>${yuvarla(ort(1, oz), 2)} ${o.birim}</td><td>${yuvarla(ort(0, oz), 2)} ${o.birim}</td></tr>`).join("")}
    </table></div>

    <h2>2. Modelin bulduğu kurallar</h2>
    ${kuralTablosu(agac)}

    <h2>3. Model hiç görmediği öğrencilerde ne kadar başarılı?</h2>
    <p class="soluk kucuk">Her öğrenci sırayla dışarıda bırakıldı, model diğer öğrencilerle eğitilip o öğrencide denendi.
      Karşılaştırma için "her zaman en sık görülen cevabı söyleyen" tahmincinin başarısı da verildi; model bunu geçmiyorsa işe yaramıyor demektir.</p>
    <div class="tablo-kap"><table>
      <tr><th>Ölçü</th><th>Değer</th><th>Ne demek</th></tr>
      <tr><td>Doğruluk</td><td><strong>${yuzde(d.dogruluk)}</strong></td><td>Tüm tahminlerin ne kadarı doğru</td></tr>
      <tr><td>Taban doğruluk</td><td>${yuzde(d.tabanDogruluk)}</td><td>Hep "sıkılmıyor" deseydik</td></tr>
      <tr><td>Yakalama</td><td><strong>${yuzde(d.yakalama)}</strong></td><td>Gerçekten sıkılanların ne kadarını fark etti (${d.dp} / ${d.dp + d.yn})</td></tr>
      <tr><td>İsabet</td><td>${yuzde(d.isabet)}</td><td>"Sıkılıyor" dediklerinin ne kadarı gerçekten sıkıldı (${d.dp} / ${d.dp + d.yp})</td></tr>
    </table></div>
    <div class="tablo-kap" style="margin-top:10px"><table>
      <tr><th></th><th>Gerçekte sıkıldı</th><th>Gerçekte sıkılmadı</th></tr>
      <tr><th>Model "sıkılıyor" dedi</th><td>${d.dp}</td><td>${d.yp}</td></tr>
      <tr><th>Model "sıkılmıyor" dedi</th><td>${d.yn}</td><td>${d.dn}</td></tr>
    </table></div>

    <div class="satir" style="margin-top:14px">
      <button id="modelKaydet">Bu modeli canlı izlemede kullan</button>
      <span class="soluk kucuk">Kaydedilen model, Canlı izleme sekmesinde oyundaki her öğrenci için sıkılma riskini gösterir.</span>
    </div>
    <p class="basari" id="modelMesaj"></p>`;

  $("modelKaydet").onclick = async () => {
    await Veri.ayarYaz("model", sonEgitim);
    kayitliModel = sonEgitim;
    $("modelMesaj").textContent = "Model kaydedildi.";
  };
};

