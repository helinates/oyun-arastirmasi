// Öğrenci tarafı: oturumu bekler, o günün adımlarını sırayla çalıştırır, her şeyi kaydeder.

import { AYARLAR } from "./ayarlar.js";
import { Veri } from "./veri.js";
import { oturumAdimlari, adimKimligi, karistir, OYUN_ADLARI, OYUN_SIMGELERI, VERSIYON_ADLARI, TUM_OYUNLAR } from "./akis.js";
import { dakikaOzetleri, ozellikler } from "./sinyaller.js";

const ana = document.getElementById("ana");
const $ = (id) => document.getElementById(id);

let kullanici = null;
let katilimci = null;
let oturum = null;
const VERI = {};
const canli = { adimNo: null, adimTip: "bekliyor", oyun: null, versiyon: null };

function html(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function kutu(icerik) {
  document.body.classList.remove("soru-modu");
  ana.innerHTML = `<div class="kutu ortala">${icerik}</div>`;
}

function bekle(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function jsonYukle(yol) {
  const r = await fetch(yol, { cache: "no-store" });
  if (!r.ok) throw new Error(`${yol} yüklenemedi`);
  return r.json();
}

// ------------------------------------------------------------------ başlangıç

async function basla() {
  await Veri.baslat();
  kullanici = await Veri.aktifKullanici();
  if (!kullanici || kullanici.rol !== "ogrenci") { location.href = "index.html"; return; }
  katilimci = await Veri.katilimciBilgisi(kullanici.kod);
  if (!katilimci) { await Veri.cikis(); location.href = "index.html"; return; }

  const [anketler, test, ...sorular] = await Promise.all([
    jsonYukle("veri/anketler.json"),
    jsonYukle("veri/bilgi-testi.json"),
    ...TUM_OYUNLAR.map((o) => jsonYukle(`veri/sorular-${o}.json`)),
  ]);
  Object.assign(VERI, { anketler, test, sorular: Object.fromEntries(TUM_OYUNLAR.map((o, i) => [o, sorular[i]])) });

  setInterval(canliGonder, 15000);
  document.addEventListener("visibilitychange", () => {
    if (aktifBlok) aktifBlok.olay(document.hidden ? "sekme_gizlendi" : "sekme_dondu", {});
  });

  if (new URLSearchParams(location.search).get("yeni") === "1") {
    history.replaceState(null, "", "ogrenci.html");
    kutu(`<h1>Üyeliğin hazır! 🎉</h1>
      <p style="font-size:22px">Rumuzun: <strong>${html(katilimci.kod)}</strong></p>
      <p class="soluk">Rumuzunu ve şifreni bir kağıda yaz. Her oturumda bu rumuz ve şifreyle gireceksin.</p>
      <p><button id="devam" class="buyuk">Devam</button></p>`);
    await new Promise((r) => { $("devam").onclick = r; });
  }

  dongu();
}

async function canliGonder() {
  if (!oturum || !oturum.acik) return;
  try {
    await Veri.canliYaz({
      oturum: oturum.no, ...canli,
      dakika: aktifBlok ? aktifBlok.dakika() : null,
      ozellik: aktifBlok ? aktifBlok.ozellik() : null,
    });
  } catch (e) { /* canlı izleme kritik değil */ }
}

async function tamamlananAdimlar(no) {
  const [a, t, b, s] = await Promise.all([
    Veri.kendiKayitlarim("anketler", no),
    Veri.kendiKayitlarim("bilgiTesti", no),
    Veri.kendiKayitlarim("bloklar", no),
    Veri.kendiKayitlarim("serbestOyun", no),
  ]);
  const tamam = new Set();
  a.forEach((r) => tamam.add(r.adim));
  t.forEach((r) => tamam.add(r.adim));
  b.filter((r) => !r.serbest).forEach((r) => tamam.add(r.adim));
  s.filter((r) => r.tip === "bitti").forEach((r) => tamam.add(r.adim));
  return { tamam, bloklar: b };
}

async function dongu() {
  oturum = await Veri.oturumDurumu();
  const serit = $("denemeSeridi");
  if (oturum.deneme) {
    serit.textContent = "Deneme modu: bu oturumun verileri analize katılmaz.";
    serit.classList.remove("gizli");
  } else if (AYARLAR.mod === "yerel") {
    serit.textContent = "Yerel deneme modu: veriler yalnızca bu bilgisayarda tutulur.";
    serit.classList.remove("gizli");
  } else {
    serit.classList.add("gizli");
  }

  if (!oturum.acik) {
    canli.adimTip = "bekliyor";
    kutu(`<h1>Merhaba ${html(kullanici.kod)}!</h1>
      <p style="font-size:24px">⏳ Öğretmeninin oturumu başlatmasını bekle.</p>
      <p class="soluk">Bu sayfa kendiliğinden yenilenecek.</p>
      <p><button class="ikincil" id="cikis">Çıkış</button></p>`);
    $("cikis").onclick = cikis;
    setTimeout(dongu, 5000);
    return;
  }

  const adimlar = oturumAdimlari(oturum.no, katilimci.grup);
  const { tamam, bloklar } = await tamamlananAdimlar(oturum.no);
  const i = adimlar.findIndex((_, j) => !tamam.has(adimKimligi(oturum.no, j)));
  if (i === -1) { bitisEkrani(bloklar); return; }

  const adim = adimlar[i];
  const adimId = adimKimligi(oturum.no, i);
  Object.assign(canli, { adimNo: i + 1, adimTip: adim.tip, oyun: adim.oyun || null, versiyon: adim.versiyon || null });
  canliGonder();

  if (adim.tip === "anket") await anketCalistir(adim, adimId);
  else if (adim.tip === "test") await testCalistir(adim, adimId);
  else if (adim.tip === "oyun") await oyunAdimi(adim, adimId, adimlar, i);
  else if (adim.tip === "serbest") await serbestCalistir(adimId);
  dongu();
}

async function cikis() {
  await Veri.cikis();
  location.href = "index.html";
}

function bitisEkrani(bloklar) {
  canli.adimTip = "bitti";
  canliGonder();
  const puan = bloklar.reduce((t, b) => t + (b.puan || 0), 0);
  kutu(`<h1>Bugünlük bu kadar! 🎉</h1>
    ${puan ? `<p style="font-size:24px">Bugün toplam <strong>${puan}</strong> puan topladın.</p>` : ""}
    <p>Teşekkür ederiz. Öğretmenin söyleyince kağıt etkinliğine geçebilirsin.</p>
    <p><button class="ikincil" id="cikis">Çıkış</button></p>`);
  $("cikis").onclick = cikis;
}

// ------------------------------------------------------------------ anket

const EMOJI5 = [
  { d: 1, e: "😠", t: "Hiç katılmıyorum" },
  { d: 2, e: "🙁", t: "Katılmıyorum" },
  { d: 3, e: "😐", t: "Kararsızım" },
  { d: 4, e: "🙂", t: "Katılıyorum" },
  { d: 5, e: "😀", t: "Tamamen katılıyorum" },
];

// Soru ekranlarının görünüşü: renkli kartlar, ilerleme çubuğu, seçimde kısa vurgu, bölüm sonunda kutlama.
// Soru ve seçenek metinleri değişmez; puan, süre sınırı ya da doğru/yanlış geri bildirimi gösterilmez.
const SIMGE = { demografik: "👋", sikilma: "💭", oturumSonu: "⭐", tercih: "🎮", test: "🧠" };
const HARF = ["A", "B", "C", "D", "E", "F"];

function soruEkrani(icerik, ileri = true) {
  document.body.classList.add("soru-modu");
  ana.innerHTML = `<div class="kutu ortala soru-kart ${ileri ? "giris-sag" : "giris-sol"}">${icerik}</div>`;
}

function ilerlemeCubugu(i, n) {
  const yuzde = Math.round((i / n) * 100);
  return `<div class="ilerleme-kap">
      <div class="ilerleme"><div style="width:${yuzde}%"></div></div>
      <span class="ilerleme-yazi">${i + 1} / ${n}</span>
    </div>`;
}

// Tıklanan seçenek kısa bir an vurgulanır, sonra sonraki soruya geçilir.
async function secimVurgula(dugme) {
  if (!dugme) return;
  dugme.classList.add("secildi");
  ana.querySelectorAll(".soru-kart button").forEach((b) => { b.disabled = true; });
  await bekle(280);
}

async function kutlama(baslik, alt) {
  const renkler = ["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6"];
  const konfeti = Array.from({ length: 28 }, (_, k) =>
    `<i style="left:${Math.round(Math.random() * 100)}%;background:${renkler[k % renkler.length]};animation-delay:${(Math.random() * 0.6).toFixed(2)}s"></i>`).join("");
  ana.innerHTML = `<div class="kutu ortala soru-kart kutlama">
      <div class="konfeti" aria-hidden="true">${konfeti}</div>
      <div class="kutlama-simge">🎉</div>
      <h1>${html(baslik)}</h1>
      ${alt ? `<p class="soluk">${html(alt)}</p>` : ""}
      <p><button class="buyuk" id="kutlamaDevam">Devam</button></p>
    </div>`;
  await new Promise((r) => {
    const t = setTimeout(r, 4000);
    $("kutlamaDevam").onclick = () => { clearTimeout(t); r(); };
  });
  document.body.classList.remove("soru-modu");
}

function anketCalistir(adim, adimId) {
  const a = VERI.anketler[adim.anket];
  const baglam = adim.baglam || "oyun";
  const maddeler = a.maddeler;
  const yanitlar = {};
  const basla = Date.now();
  let i = 0;

  return new Promise((coz) => {
    function ciz(ileri = true) {
      const m = maddeler[i];
      const metin = a.tip === "emoji5" ? (m[baglam] || m.oyun) : m.metin;
      let secenekler = "";
      if (a.tip === "emoji5") {
        secenekler = `<div class="emoji-satir">${EMOJI5.map((s) =>
          `<button data-d="${s.d}" class="d${s.d} ${yanitlar[m.id] === s.d ? "onceki" : ""}"><span class="em">${s.e}</span><span class="et">${s.t}</span></button>`).join("")}</div>`;
      } else if (m.tip === "metin") {
        secenekler = `<p><textarea id="metin" rows="3" style="width:100%;max-width:520px">${html(yanitlar[m.id] || "")}</textarea></p>
          <p><button id="metinDevam">Devam</button></p>`;
      } else {
        secenekler = `<div class="secenek-liste">${m.secenekler.map((s, k) =>
          `<button data-d="${html(s)}" class="r${k % 6} ${yanitlar[m.id] === s ? "onceki" : ""}"><span class="harf">${HARF[k] || ""}</span><span>${html(s)}</span></button>`).join("")}</div>`;
      }
      const surum = adim.versiyon === "yz" ? "yapay zeka destekli sürümüyle, yani kamerayla elini ve yüzünü kullanarak" : "klasik sürümüyle, yani fare ve klavyeyle";
      const yonerge = a.yonerge ? (a.yonerge[baglam] || a.yonerge.oyun || "").replace("{surum}", surum) : "";
      soruEkrani(`
        <div class="soru-baslik"><span class="soru-simge">${SIMGE[adim.anket] || "📝"}</span><h1>${html(a.baslik)}</h1></div>
        ${yonerge ? `<p class="yonerge">${html(yonerge)}</p>` : ""}
        ${ilerlemeCubugu(i, maddeler.length)}
        <div class="madde">${html(metin)}</div>
        ${secenekler}
        <div class="alt-satir">
          <button class="ikincil" id="geri" ${i === 0 ? "disabled" : ""}>← Geri</button>
          ${a.tip === "emoji5" ? `<button class="ikincil" id="yok">Cevap vermek istemiyorum</button>` : ""}
        </div>`, ileri);
      ana.querySelectorAll("[data-d]").forEach((b) => {
        b.onclick = () => sec(a.tip === "emoji5" ? Number(b.dataset.d) : b.dataset.d, b);
      });
      if ($("metinDevam")) $("metinDevam").onclick = () => sec($("metin").value.trim());
      $("geri").onclick = () => { if (i > 0) { i -= 1; ciz(false); } };
      if ($("yok")) $("yok").onclick = () => sec(null, $("yok"));
    }

    async function sec(deger, dugme) {
      await secimVurgula(dugme);
      yanitlar[maddeler[i].id] = deger;
      i += 1;
      if (i < maddeler.length) { ciz(); return; }
      kutu("<p>Kaydediliyor…</p>");
      const kayit = {
        oturum: oturum.no, adim: adimId, anket: adim.anket, baglam: adim.baglam || null,
        versiyon: adim.versiyon || null, yanitlar, sureSn: Math.round((Date.now() - basla) / 1000),
      };
      if (a.tip === "emoji5") {
        let puan = 0; let sayi = 0;
        for (const m of maddeler) {
          const d = yanitlar[m.id];
          if (typeof d === "number") { puan += m.ters ? 6 - d : d; sayi += 1; }
        }
        kayit.puan = puan;
        kayit.cevaplanan = sayi;
      }
      await kaydetTekrarla("anketler", [kayit]);
      await kutlama("Bu bölüm tamam!", "Cevapların için teşekkürler.");
      coz();
    }

    ciz();
  });
}

// Kayıt internet kesintisinde kaybolmasın diye birkaç kez denenir.
async function kaydetTekrarla(kol, liste) {
  for (let deneme = 1; ; deneme++) {
    try { await Veri.ekleToplu(kol, liste); return; } catch (e) {
      if (deneme >= 5) {
        kutu(`<p class="hata">Kayıt yapılamadı. İnternet bağlantısını kontrol edip öğretmenine haber ver.</p>
          <p><button id="tekrar">Tekrar dene</button></p>`);
        await new Promise((r) => { $("tekrar").onclick = r; });
        deneme = 0;
      } else {
        await bekle(1500 * deneme);
      }
    }
  }
}

// ------------------------------------------------------------------ bilgi testi

function testCalistir(adim, adimId) {
  const sorular = adim.test === "son" ? karistir(VERI.test.sorular) : VERI.test.sorular.slice();
  const yanitlar = [];
  const basla = Date.now();
  let i = 0;

  return new Promise((coz) => {
    function ciz() {
      const s = sorular[i];
      soruEkrani(`
        <div class="soru-baslik"><span class="soru-simge">${SIMGE.test}</span><h1>Bilgi yarışması</h1></div>
        ${i === 0 ? `<p class="yonerge">Not verilmeyecek. Bildiğin kadarını işaretle, emin değilsen tahmin edebilirsin.</p>` : ""}
        ${ilerlemeCubugu(i, sorular.length)}
        <div class="madde">${html(s.soru)}</div>
        <div class="secenek-liste">${Object.entries(s.secenekler).map(([k, v], n) =>
          `<button data-k="${k}" class="r${n % 6}"><span class="harf">${HARF[n] || ""}</span><span>${html(v)}</span></button>`).join("")}</div>`);
      ana.querySelectorAll("[data-k]").forEach((b) => { b.onclick = () => sec(b.dataset.k, b); });
    }

    async function sec(k, dugme) {
      await secimVurgula(dugme);
      const s = sorular[i];
      yanitlar.push({ soruId: s.id, cevap: k, dogru: k === s.dogru });
      i += 1;
      if (i < sorular.length) { ciz(); return; }
      kutu("<p>Kaydediliyor…</p>");
      await kaydetTekrarla("bilgiTesti", [{
        oturum: oturum.no, adim: adimId, tur: adim.test, yanitlar,
        dogruSayisi: yanitlar.filter((y) => y.dogru).length, soruSayisi: yanitlar.length,
        sureSn: Math.round((Date.now() - basla) / 1000),
      }]);
      await kutlama("Bilgi yarışmasını bitirdin!", "Emeğin için teşekkürler.");
      coz();
    }

    ciz();
  });
}

// ------------------------------------------------------------------ oyun çerçevesi

let aktifBlok = null;

async function baslangicSeviyesi(oyun, versiyon) {
  const tum = await Veri.kendiKayitlarim("bloklar", null);
  const onceki = tum.filter((b) => b.oyun === oyun && b.versiyon === versiyon && !b.serbest && !b.deneme);
  return onceki.reduce((m, b) => Math.max(m, b.sonSeviye || 1), 1);
}

async function oyunAdimi(adim, adimId, adimlar, i) {
  // Oyun bloğundan önce kısa bir hazırlık ekranı.
  const sira = adimlar.slice(0, i).filter((a) => a.tip === "oyun").length + 1;
  kutu(`<h1>${sira}. oyun: ${OYUN_SIMGELERI[adim.oyun]} ${OYUN_ADLARI[adim.oyun]}</h1>
    <p style="font-size:24px">Bu oyunu <strong>${VERSIYON_ADLARI[adim.oyun][adim.versiyon]}</strong> oynayacaksın.</p>
    <p class="soluk">Oyun en fazla ${AYARLAR.oyunSuresiDk} dakika sürer. ${AYARLAR.bitirDugmesiDk > 0 ? `${AYARLAR.bitirDugmesiDk}. dakikadan sonra` : "İstediğin an"}
      istersen "Bu oyunu bitir" düğmesiyle bitirebilirsin; bu tamamen senin seçimin.</p>
    <p><button class="buyuk" id="basla">Başla</button></p>`);
  await new Promise((r) => { $("basla").onclick = r; });
  await oyunCalistir(adim, adimId, {});
  // Balon oyununun el hareketli (YZ) sürümünden sonra bonus ekran açılır. Bonus araştırma verisi kaydetmez.
  if (adim.oyun === "balon" && adim.versiyon === "yz") await bonusCalistir();
}

// Bonus ekran: "İnternette nasıl davranmalıyız?" balonları. Bitince bonus sayfası window.bonusBitti() çağırır.
function bonusCalistir() {
  return new Promise((coz) => {
    const sahne = document.createElement("div");
    sahne.className = "oyun-sahne";
    sahne.innerHTML = `<iframe allow="camera; autoplay" title="Bonus oyun" style="flex:1;border:0;width:100%;height:100%"></iframe>`;
    document.body.appendChild(sahne);
    let bitti = false;
    window.bonusBitti = () => {
      if (bitti) return;
      bitti = true;
      delete window.bonusBitti;
      sahne.remove();
      coz();
    };
    sahne.querySelector("iframe").src = "oyunlar/balon/bonus.html";
  });
}

// Bir oyunu tam ekran çerçevede çalıştırır. Oyunlar window.parent.Kayit üzerinden konuşur.
async function oyunCalistir(adim, adimId, { serbest = false, serbestBitis = null } = {}) {
  const { oyun, versiyon } = adim;
  kutu("<p>Oyun yükleniyor…</p>");
  const seviye = await baslangicSeviyesi(oyun, versiyon);
  const blokId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const yuklenme = Date.now();
  let oyunBasladi = serbest ? yuklenme : null;
  let bitti = false;
  let sonlandiriliyor = false;
  let oyunOzeti = null;
  const tumOlaylar = [];
  let bekleyen = [];

  const ayar = {
    oyun, versiyon, blokId, serbest,
    sureDk: AYARLAR.oyunSuresiDk, bitirDugmesiDk: AYARLAR.bitirDugmesiDk,
    baslangicSeviyesi: seviye,
    sorular: VERI.sorular[oyun],
  };

  const sahne = document.createElement("div");
  sahne.className = "oyun-sahne";
  sahne.innerHTML = `
    <div class="oyun-ust">
      <span>${html(OYUN_ADLARI[oyun])} · ${html(VERSIYON_ADLARI[oyun][versiyon])}</span>
      <span id="sure"></span>
      <span>
        ${serbest
          ? `<button class="ikincil" id="secimeDon">Başka oyun seç</button> <button id="bitirdim">Bitirdim</button>`
          : `<button id="bitirDugmesi" class="${AYARLAR.bitirDugmesiDk > 0 ? "gizli" : ""}">Bu oyunu bitir</button>`}
      </span>
    </div>
    <iframe id="oyunCercevesi" allow="camera; autoplay" title="${html(OYUN_ADLARI[oyun])}"></iframe>`;
  document.body.appendChild(sahne);
  const cerceve = sahne.querySelector("iframe");

  function olay(tur, veri = {}) {
    if (bitti) return;
    const o = { blokId, oturum: oturum.no, adim: adimId, oyun, versiyon, serbest, tur, t: Date.now(), ...veri };
    tumOlaylar.push(o);
    bekleyen.push(o);
    if (tur === "kalibrasyon_bitti" && !oyunBasladi) oyunBasladi = Date.now();
  }

  async function gonder() {
    if (!bekleyen.length) return;
    const parca = bekleyen;
    bekleyen = [];
    try { await Veri.ekleToplu("olaylar", parca); } catch (e) { bekleyen = parca.concat(bekleyen); }
  }

  aktifBlok = {
    olay,
    dakika: () => (oyunBasladi ? Math.floor((Date.now() - oyunBasladi) / 60000) : 0),
    // Canlı izlemedeki sıkılma riski için son tamamlanan dakikanın özellikleri.
    ozellik: () => {
      if (!oyunBasladi || serbest) return null;
      const d = dakikaOzetleri(tumOlaylar, oyunBasladi, Date.now()).filter((m) => m.tamSure);
      return d.length ? ozellikler(d, d.length - 1) : null;
    },
  };

  window.Kayit = {
    ayar: () => ayar,
    olay: (tur, veri) => olay(tur, veri),
    bitir: (ozet) => { oyunOzeti = ozet || {}; sonlandir(ozet && ozet.neden ? ozet.neden : "oyun_bitti"); },
  };

  let cozucu;
  const sonuc = new Promise((r) => { cozucu = r; });

  async function sonlandir(neden) {
    if (sonlandiriliyor) return;
    sonlandiriliyor = true;
    clearInterval(saat);
    clearInterval(gonderici);
    // Oyun durdurulurken son olaylarını (ör. hareketsizlik) ve özetini hala gönderebilir.
    try { cerceve.contentWindow && cerceve.contentWindow.oyunDurdur && cerceve.contentWindow.oyunDurdur(); } catch (e) { /* oyun durdurulamazsa çerçeve zaten kaldırılacak */ }
    olay("blok_bitti", { neden });
    bitti = true;
    const simdi = Date.now();
    const cevaplar = tumOlaylar.filter((o) => o.tur === "cevap");
    const sureler = cevaplar.map((o) => o.sureMs).filter((x) => typeof x === "number");
    const seviyeOlaylari = tumOlaylar.filter((o) => o.tur === "seviye_degisti");
    const ozet = {
      oturum: oturum.no, adim: adimId, blokId, oyun, versiyon, serbest, neden,
      baslama: yuklenme, oyunBaslama: oyunBasladi, bitis: simdi,
      kalibrasyonSn: oyunBasladi ? Math.round((oyunBasladi - yuklenme) / 1000) : null,
      oynamaSn: oyunBasladi ? Math.round((simdi - oyunBasladi) / 1000) : 0,
      baslangicSeviyesi: seviye,
      sonSeviye: (oyunOzeti && oyunOzeti.sonSeviye) || (seviyeOlaylari.length ? seviyeOlaylari[seviyeOlaylari.length - 1].yeniSeviye : seviye),
      soruSayisi: cevaplar.length,
      dogruSayisi: cevaplar.filter((o) => o.dogru).length,
      ortCevapMs: sureler.length ? Math.round(sureler.reduce((a, b) => a + b, 0) / sureler.length) : null,
      kacirilan: tumOlaylar.filter((o) => o.tur === "kacirildi").length,
      algilamaSorunu: tumOlaylar.filter((o) => o.tur === "algilama_sorunu").length,
      sekmeGizlenme: tumOlaylar.filter((o) => o.tur === "sekme_gizlendi").length,
      hareketsizSn: Math.round(tumOlaylar.filter((o) => o.tur === "hareketsizlik").reduce((t, o) => t + (o.sureMs || 0), 0) / 1000),
      dakikalik: dakikaOzetleri(tumOlaylar, oyunBasladi, simdi),
      puan: oyunOzeti && typeof oyunOzeti.puan === "number" ? oyunOzeti.puan : cevaplar.filter((o) => o.dogru).length * 10,
    };
    sahne.innerHTML = `<div class="sayfa"><div class="kutu ortala"><p>Kaydediliyor…</p></div></div>`;
    await gonder();
    while (bekleyen.length) { await bekle(1500); await gonder(); }
    await kaydetTekrarla("bloklar", [ozet]);
    sahne.remove();
    aktifBlok = null;
    delete window.Kayit;
    cozucu(ozet);
  }

  const saat = setInterval(() => {
    const simdi = Date.now();
    if (!oyunBasladi && simdi - yuklenme > AYARLAR.kalibrasyonBekleSn * 1000) oyunBasladi = simdi;
    const sureEl = sahne.querySelector("#sure");
    if (serbest) {
      const kalan = Math.max(0, serbestBitis - simdi);
      if (sureEl) sureEl.textContent = `Kalan: ${Math.ceil(kalan / 60000)} dk`;
      if (kalan <= 0) sonlandir("sure");
      return;
    }
    if (!oyunBasladi) { if (sureEl) sureEl.textContent = "Hazırlık…"; return; }
    const gecen = simdi - oyunBasladi;
    const kalan = AYARLAR.oyunSuresiDk * 60000 - gecen;
    if (sureEl) sureEl.textContent = `Kalan: ${Math.max(0, Math.ceil(kalan / 60000))} dk`;
    if (gecen >= AYARLAR.bitirDugmesiDk * 60000) {
      const d = sahne.querySelector("#bitirDugmesi");
      if (d) d.classList.remove("gizli");
    }
    if (kalan <= 0) sonlandir("sure");
  }, 500);
  const gonderici = setInterval(gonder, 5000);

  if (serbest) {
    sahne.querySelector("#secimeDon").onclick = () => sonlandir("secime_don");
    sahne.querySelector("#bitirdim").onclick = () => sonlandir("bitirdim");
  } else {
    sahne.querySelector("#bitirDugmesi").onclick = () => { olay("bitir_basildi", {}); sonlandir("gonullu"); };
  }

  olay("blok_basladi", { baslangicSeviyesi: seviye });
  cerceve.src = `oyunlar/${oyun}/index.html?versiyon=${versiyon}`;
  return sonuc;
}

// ------------------------------------------------------------------ serbest oyun

function serbestDurumu(adimId) {
  const anahtar = `serbest-${kullanici.kod}-${adimId}`;
  let d = null;
  try { d = JSON.parse(sessionStorage.getItem(anahtar) || "null"); } catch (e) { d = null; }
  if (!d) {
    d = {
      bitis: Date.now() + AYARLAR.serbestOyunDk * 60000,
      baslama: Date.now(),
      sira: 0,
      dizilim: karistir(TUM_OYUNLAR.flatMap((oyun) => [{ oyun, versiyon: "yz" }, { oyun, versiyon: "klasik" }])),
    };
  }
  const yaz = () => { try { sessionStorage.setItem(anahtar, JSON.stringify(d)); } catch (e) { /* yoksay */ } };
  yaz();
  return { d, yaz };
}

async function serbestCalistir(adimId) {
  const { d, yaz } = serbestDurumu(adimId);
  canli.adimTip = "serbest";

  for (;;) {
    const kalan = d.bitis - Date.now();
    if (kalan <= 0) break;
    const secim = await new Promise((coz) => {
      ana.innerHTML = `<div class="kutu ortala">
        <h1>Serbest oyun 🎮</h1>
        <p>İstediğin oyunu, istediğin kadar oyna. İstediğin zaman değiştirebilir ya da bitirebilirsin.</p>
        <p class="soluk">Kalan süre: ${Math.ceil(kalan / 60000)} dakika</p>
        <div class="serbest-izgara">${d.dizilim.map((s, i) =>
          `<button data-i="${i}">${OYUN_SIMGELERI[s.oyun]}<br>${html(OYUN_ADLARI[s.oyun])}<br><small>${html(VERSIYON_ADLARI[s.oyun][s.versiyon])}</small></button>`).join("")}</div>
        <p style="margin-top:20px"><button class="ikincil" id="bitirdim">Bitirdim</button></p>
      </div>`;
      ana.querySelectorAll("[data-i]").forEach((b) => { b.onclick = () => coz(d.dizilim[Number(b.dataset.i)]); });
      $("bitirdim").onclick = () => coz(null);
      setTimeout(() => coz("sure"), Math.max(0, kalan));
    });
    if (secim === null || secim === "sure") break;

    d.sira += 1;
    yaz();
    Object.assign(canli, { oyun: secim.oyun, versiyon: secim.versiyon });
    const ozet = await oyunCalistir(secim, adimId, { serbest: true, serbestBitis: d.bitis });
    await kaydetTekrarla("serbestOyun", [{
      oturum: oturum.no, adim: adimId, tip: "secim", sira: d.sira, oyun: secim.oyun, versiyon: secim.versiyon,
      sureSn: Math.round((ozet.bitis - ozet.baslama) / 1000), soruSayisi: ozet.soruSayisi, neden: ozet.neden,
    }]);
    Object.assign(canli, { oyun: null, versiyon: null });
    if (ozet.neden === "bitirdim" || ozet.neden === "sure") break;
  }

  await kaydetTekrarla("serbestOyun", [{
    oturum: oturum.no, adim: adimId, tip: "bitti", secimSayisi: d.sira,
    toplamSn: Math.round((Math.min(Date.now(), d.bitis) - d.baslama) / 1000),
    sureDoldu: Date.now() >= d.bitis,
  }]);
}

basla().catch((e) => {
  kutu(`<p class="hata">Bir sorun oluştu: ${html(e.message)}</p><p>Öğretmenine haber ver.</p>`);
});
