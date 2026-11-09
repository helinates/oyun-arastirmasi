// Hava Dilimleyici, Büyücü Düellosu ve Ağzınla Yakala oyunlarının ortak parçaları:
// soru havuzu, uyarlanabilir seviye, kısa geri bildirim ve kamera hazırlık (kalibrasyon) ekranı.
// Balon oyunu kendi içinde aynı kuralları kullanır.

export function karistir(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Aynı öğe, o seviyedeki bütün öğeler gelmeden tekrar gelmez. filtre ile (ör. yalnızca zararlılar) seçilebilir.
export function havuz(sorular) {
  const havuzlar = {};
  return function sec(seviye, filtre = null) {
    const ad = seviye + (filtre ? ":" + filtre.ad : "");
    if (!havuzlar[ad] || !havuzlar[ad].length) {
      let l = sorular.filter((s) => s.seviye === seviye && (!filtre || filtre.f(s)));
      if (!l.length) l = sorular.filter((s) => !filtre || filtre.f(s));
      if (!l.length) l = sorular;
      havuzlar[ad] = karistir(l);
    }
    return havuzlar[ad].pop();
  };
}

// Uyarlanabilir seviye: art arda 3 doğru bir üst seviye, art arda 2 yanlış ya da kaçırma bir alt seviye.
// Puan: her doğru için 10 × seviye.
export function seviyeYoneticisi(Kayit, baslangic) {
  const y = {
    seviye: Math.min(3, Math.max(1, baslangic || 1)),
    puan: 0,
    artArdaDogru: 0,
    artArdaYanlis: 0,
    sonuc(dogru) {
      if (dogru) { y.puan += 10 * y.seviye; y.artArdaDogru++; y.artArdaYanlis = 0; } else { y.artArdaYanlis++; y.artArdaDogru = 0; }
      if (y.artArdaDogru >= 3) y.degistir(y.seviye + 1);
      else if (y.artArdaYanlis >= 2) y.degistir(y.seviye - 1);
    },
    degistir(yeni) {
      if (yeni === y.seviye || yeni < 1 || yeni > 3) { y.artArdaDogru = 0; y.artArdaYanlis = 0; return; }
      Kayit.olay("seviye_degisti", { eskiSeviye: y.seviye, yeniSeviye: yeni });
      y.seviye = yeni;
      y.artArdaDogru = 0;
      y.artArdaYanlis = 0;
    },
  };
  return y;
}

// ---------------------------------------------------------------- ortak görünüm

const STIL = `
  .oo-gizli { display: none !important; }
  #ooKamera { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .2; z-index: 0; pointer-events: none; }
  body.ayna #ooKamera, body.ayna #ooKalVideo { transform: scaleX(-1); }
  #ooGeri { position: absolute; left: 50%; top: 42%; transform: translate(-50%, -50%); font-size: 26px; font-weight: 700; padding: 16px 26px;
    border-radius: 18px; background: #fff; box-shadow: 0 4px 18px rgba(0,0,0,.2); max-width: 80%; text-align: center; z-index: 6; pointer-events: none;
    font-family: "Segoe UI", Arial, sans-serif; }
  #ooGeri.dogru { color: #1f8a4c; } #ooGeri.yanlis { color: #b42318; }
  #ooGeri small { display: block; font-size: 18px; font-weight: 400; color: #334; margin-top: 8px; }
  #ooUyari { position: absolute; left: 50%; bottom: 40px; transform: translateX(-50%); background: #fff; color: #b42318; font-weight: 700;
    padding: 10px 18px; border-radius: 14px; z-index: 6; font-size: 20px; font-family: "Segoe UI", Arial, sans-serif; }
  #ooYon { position: absolute; right: 12px; bottom: 12px; z-index: 7; font-size: 16px; padding: 8px 14px; border: 0; border-radius: 12px;
    background: rgba(255,255,255,.9); color: #1e293b; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.2); }
  #ooKal { position: absolute; inset: 0; background: rgba(15,23,42,.88); color: #fff; display: flex; flex-direction: column;
    align-items: center; justify-content: center; z-index: 8; font-size: 22px; text-align: center; padding: 20px; font-family: "Segoe UI", Arial, sans-serif; }
  #ooKal button { font-size: 20px; padding: 12px 24px; border: 0; border-radius: 14px; background: #2f6fdb; color: #fff; cursor: pointer; margin-top: 12px; }
  #ooKal #ooKalYon { background: #475569; }
  #ooKalVideo { width: 420px; max-width: 80vw; border-radius: 16px; background: #000; margin: 10px 0; }
  #ooKalDurum { font-size: 26px; font-weight: 700; min-height: 1.4em; }
  #ooKal .kucuk { font-size: 15px; opacity: .8; }
  #ooImlec { position: absolute; width: 40px; height: 40px; margin: -20px 0 0 -20px; border-radius: 50%; border: 5px solid #f59e0b;
    background: rgba(255,255,255,.35); z-index: 9; pointer-events: none; }
  #ooImlec.kapali { background: #f59e0b; transform: scale(.7); }
`;

let kuruldu = false;
function kur() {
  if (kuruldu) return;
  kuruldu = true;
  const st = document.createElement("style");
  st.textContent = STIL;
  document.head.appendChild(st);
  const d = document.createElement("div");
  d.innerHTML = `
    <video id="ooKamera" class="oo-gizli" muted playsinline></video>
    <div id="ooGeri" class="oo-gizli"></div>
    <div id="ooUyari" class="oo-gizli"></div>
    <div id="ooImlec" class="oo-gizli"></div>
    <button id="ooYon" class="oo-gizli" title="Hareket ters yöne gidiyorsa bas">↔ Yönü çevir</button>
    <div id="ooKal" class="oo-gizli">
      <p id="ooKalBaslik">📷 Kamera açılıyor… Tarayıcı izin isterse "İzin ver"e bas.</p>
      <video id="ooKalVideo" muted playsinline></video>
      <p id="ooKalDurum"></p>
      <p class="kucuk" id="ooKalIpucu"></p>
      <button id="ooKalYon" class="oo-gizli">↔ Sağ-sol ters, düzelt</button>
      <p class="kucuk">Görüntün kaydedilmez ve hiçbir yere gönderilmez.</p>
      <button id="ooKalFare" class="oo-gizli">Fareyle devam et</button>
    </div>`;
  while (d.firstElementChild) document.body.appendChild(d.firstElementChild);
}
const $ = (id) => document.getElementById(id);

// Kısa geri bildirim kutusu. bekle=false ise oyun akmaya devam eder.
let geriZaman = null;
export function geriBildirim(dogru, metin, bilgi, ms = 1800) {
  kur();
  const g = $("ooGeri");
  g.className = dogru ? "dogru" : "yanlis";
  g.innerHTML = `${metin}${bilgi ? `<small>${bilgi}</small>` : ""}`;
  clearTimeout(geriZaman);
  return new Promise((r) => { geriZaman = setTimeout(() => { g.className = "oo-gizli"; r(); }, ms); });
}

export function imlecGoster(x, y, kapali) {
  kur();
  const i = $("ooImlec");
  if (x == null) { i.classList.add("oo-gizli"); return; }
  i.classList.remove("oo-gizli");
  i.style.left = x + "px";
  i.style.top = y + "px";
  i.classList.toggle("kapali", !!kapali);
}

// Kamera yönü: varsayılan aynasız. Bir bilgisayarda "Yönü çevir"e basılırsa seçim o bilgisayarda hatırlanır
// (balon oyunuyla aynı ayar).
function aynaOku() { try { return localStorage.getItem("kameraAyna") === "1"; } catch (e) { return false; } }

// Kamerayı açar, kalibrasyon adımlarını yürütür ve takipçiyi döndürür. Kamera açılamazsa
// "yedek_fare" kaydedilir ve null döner; oyun o zaman fareyle oynanır.
//   baslat: elTakibiBaslat ya da yuzTakibiBaslat
//   varMi(d): el/yüz görünüyor mu
//   adimlar: [{ mesaj, tamam(d) }]  sırayla geçilecek kalibrasyon adımları
//   yokMesaj: oyun sırasında el/yüz kaybolunca gösterilecek yazı
//   ipucu: kalibrasyon ekranındaki kısa açıklama
//   hareketVar(): el/yüz konumu değişince çağrılır (hareketsizlik izleyici için)
export async function kameraHazirla({ Kayit, baslat, varMi, adimlar, ilkMesaj, yokMesaj, ipucu, konum, hareketVar }) {
  kur();
  $("ooKal").classList.remove("oo-gizli");
  $("ooKalIpucu").textContent = ipucu || "";
  let takip;
  try {
    takip = await baslat({ video: $("ooKalVideo"), ayna: aynaOku() });
  } catch (e) {
    Kayit.olay("algilama_sorunu", { tur: "kamera_acilamadi", hata: String((e && e.name) || e).slice(0, 80) });
    $("ooKalBaslik").textContent = "Kamera açılamadı. Öğretmenine haber ver.";
    $("ooKalFare").classList.remove("oo-gizli");
    await new Promise((r) => { $("ooKalFare").onclick = r; });
    Kayit.olay("yedek_fare", {});
    $("ooKal").classList.add("oo-gizli");
    return null;
  }

  function aynaUygula(v) {
    document.body.classList.toggle("ayna", v);
    takip.aynaAyarla(v);
    try { localStorage.setItem("kameraAyna", v ? "1" : "0"); } catch (e) { /* yoksay */ }
  }
  function yonCevir() {
    const v = !document.body.classList.contains("ayna");
    aynaUygula(v);
    Kayit.olay("kamera_yonu", { ayna: v });
  }
  aynaUygula(aynaOku());
  $("ooKalYon").classList.remove("oo-gizli");
  $("ooKalYon").onclick = yonCevir;
  $("ooYon").onclick = yonCevir;
  $("ooKalBaslik").textContent = ilkMesaj;

  let kalibrasyonda = true;
  // Kalibrasyon sırasında imleç görünür; öğrenci sağ-sol yönünün doğru olduğunu görür.
  takip.dinle((d) => {
    if (!kalibrasyonda) return;
    if (!varMi(d)) { imlecGoster(null); return; }
    const k = konum(d);
    imlecGoster(k.x * window.innerWidth, k.y * window.innerHeight, k.kapali);
  });
  // 30 saniyede kalibrasyon bitmezse (ışık yetersiz, kamera uzak) öğretmen "Fareyle devam et"i seçebilir.
  let fareyeGec = false;
  const yedekZaman = setTimeout(() => {
    $("ooKalFare").classList.remove("oo-gizli");
    $("ooKalIpucu").textContent = "Kamera seni göremiyorsa ışığı ve kameranın yönünü kontrol et ya da öğretmenine haber ver.";
  }, 30000);
  await new Promise((bitti) => {
    $("ooKalFare").onclick = () => { fareyeGec = true; bitti(); };
    let asama = 0;
    $("ooKalDurum").textContent = "";
    takip.dinle((d) => {
      if (!kalibrasyonda || asama >= adimlar.length) return;
      if (!varMi(d)) { if (asama > 0) { asama = 0; $("ooKalDurum").textContent = yokMesaj; } return; }
      if (adimlar[asama].tamam(d)) {
        asama++;
        if (asama >= adimlar.length) { $("ooKalDurum").textContent = "Harika! Oyun başlıyor…"; setTimeout(bitti, 900); }
        else $("ooKalDurum").textContent = adimlar[asama].mesaj;
      } else if (!$("ooKalDurum").textContent || $("ooKalDurum").textContent === yokMesaj) {
        $("ooKalDurum").textContent = adimlar[asama].mesaj;
      }
    });
  });
  kalibrasyonda = false;
  clearTimeout(yedekZaman);
  imlecGoster(null);
  $("ooKal").classList.add("oo-gizli");
  if (fareyeGec) {
    takip.durdur();
    document.body.classList.remove("ayna");
    Kayit.olay("yedek_fare", { neden: "kalibrasyon_bitmedi" });
    return null;
  }
  $("ooYon").classList.remove("oo-gizli");
  const v = $("ooKamera");
  v.srcObject = $("ooKalVideo").srcObject;
  v.classList.remove("oo-gizli");
  v.play().catch(() => {});

  // Oyun sırasında: el/yüz 1,5 sn görünmezse uyarı; 5 sn ve üstü kayıpta "algilama_sorunu".
  let yokBaslangic = null;
  let sonX = 0.5; let sonY = 0.5;
  let durdu = false;
  function kayipBitir() {
    if (yokBaslangic != null) {
      const gecen = performance.now() - yokBaslangic;
      if (gecen >= 5000) Kayit.olay("algilama_sorunu", { sureMs: Math.round(gecen) });
      yokBaslangic = null;
    }
  }
  takip.dinle((d) => {
    if (durdu) return;
    if (!varMi(d)) {
      if (yokBaslangic == null) yokBaslangic = performance.now();
      if (performance.now() - yokBaslangic > 1500) { $("ooUyari").textContent = yokMesaj; $("ooUyari").classList.remove("oo-gizli"); }
      return;
    }
    kayipBitir();
    $("ooUyari").classList.add("oo-gizli");
    const k = konum(d);
    if (Math.abs(k.x - sonX) > 0.02 || Math.abs(k.y - sonY) > 0.02) { hareketVar(); sonX = k.x; sonY = k.y; }
  });
  const eskiDurdur = takip.durdur;
  takip.durdur = () => { durdu = true; kayipBitir(); eskiDurdur(); };
  return takip;
}

// Metni verilen genişliğe sığacak satırlara böler (canvas için).
export function satirlaraBol(ctx, metin, genislik) {
  const kelimeler = String(metin).split(/\s+/);
  const satirlar = [];
  let s = "";
  for (const k of kelimeler) {
    const deneme = s ? s + " " + k : k;
    if (ctx.measureText(deneme).width > genislik && s) { satirlar.push(s); s = k; } else s = deneme;
  }
  if (s) satirlar.push(s);
  return satirlar;
}
