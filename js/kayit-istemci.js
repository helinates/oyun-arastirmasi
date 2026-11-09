// Oyunların siteyle konuştuğu tek yer. Oyun sitenin içinde açılınca gerçek kayıt aracını,
// tek başına açılınca (oyunu geliştirirken) konsola yazan sahte bir aracı kullanır.
//
// Oyun şu üç şeyi kullanır:
//   const Kayit = await kayitHazirla("balon");
//   Kayit.ayar()                    -> { oyun, versiyon, baslangicSeviyesi, sorular, ... }
//   Kayit.olay("cevap", { soruId, secilen, dogru, sureMs, seviye })
//   Kayit.bitir({ neden: "oyun_bitti", puan, sonSeviye })   // yalnızca oyun kendisi biterse
//
// Kaydedilen olay türleri: kalibrasyon_bitti, soru_geldi, cevap, kacirildi, seviye_degisti,
// algilama_sorunu, gecti (zararlı/güvenli öğe dokunulmadan geçti), taninmayan_sekil. Süreyi, "Bu oyunu bitir" düğmesini ve sekme değişimini site kendisi tutar.
// Site oyunu durdurmak isterse window.oyunDurdur() işlevini çağırır.

export async function kayitHazirla(oyun) {
  try {
    if (window.parent !== window && window.parent.Kayit) return window.parent.Kayit;
  } catch (e) { /* farklı adresten açıldıysa ana sayfaya erişilemez */ }

  const p = new URLSearchParams(location.search);
  const kok = new URL("../../", location.href);
  const sorular = await (await fetch(new URL(`veri/sorular-${oyun}.json`, kok))).json();
  const ayar = {
    oyun, versiyon: p.get("versiyon") || "klasik", blokId: "tek-basina", serbest: false,
    sureDk: 10, bitirDugmesiDk: 0, baslangicSeviyesi: Number(p.get("seviye")) || 1, sorular,
  };
  console.info("[Kayit] Oyun tek başına açıldı, kayıtlar yalnızca konsola yazılıyor.", ayar);
  bitirDugmesiEkle();
  return {
    ayar: () => ayar,
    olay: (tur, veri) => console.log("[Kayit] olay", tur, veri || {}),
    bitir: (ozet) => console.log("[Kayit] bitir", ozet || {}),
  };
}

// Hareketsizlik izleyici: oyuncu en az 3 saniye hiç hareket etmezse, hareket geri gelince
// "hareketsizlik" olayı gönderir. Klasik sürümde fare hareketinde, YZ sürümünde el ya da yüz
// konumu değişince hareketVar() çağrılır. Bu, sıkılma tahmin modelinin sinyallerinden biridir.
export function hareketsizlikIzleyici(Kayit, esikMs = 3000) {
  let son = performance.now();
  function kapat() {
    const gecen = performance.now() - son;
    if (gecen >= esikMs) Kayit.olay("hareketsizlik", { sureMs: Math.round(gecen) });
  }
  return {
    hareketVar() { kapat(); son = performance.now(); },
    bitir: kapat,
  };
}

// Oyun tek başına (ör. "Oyunları dene" sayfasından) açıldığında, sitenin oyun çerçevesindeki gibi
// bir "Bu oyunu bitir" düğmesi gösterilir. Basınca oyun durur ve oyun listesine dönülür.
function bitirDugmesiEkle() {
  const ekle = () => {
    if (document.getElementById("tekBasinaBitir")) return;
    const b = document.createElement("button");
    b.id = "tekBasinaBitir";
    b.textContent = "Bu oyunu bitir";
    b.style.cssText = "position:fixed;left:14px;bottom:14px;z-index:9999;font:600 17px system-ui,sans-serif;"
      + "padding:12px 20px;border:0;border-radius:12px;background:#b42318;color:#fff;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25)";
    b.onclick = () => {
      try { if (typeof window.oyunDurdur === "function") window.oyunDurdur(); } catch (e) { /* oyun zaten durmuş olabilir */ }
      location.href = new URL("../dene.html", location.href).href;
    };
    document.body.appendChild(b);
  };
  if (document.body) ekle(); else document.addEventListener("DOMContentLoaded", ekle);
}
