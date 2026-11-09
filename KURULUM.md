# Oyun Araştırması sitesi: kurulum ve kullanım

Bu klasör, 2204-B projesinin tüm sitesidir: rumuzla öğrenci üyeliği ve girişi, oturum akışı, anketler, bilgi testi, oyun çerçevesi ve öğretmen paneli. Sunucu kodu yoktur. Dosyalar herhangi bir ücretsiz statik barındırma servisine yüklenir, veriler Firebase'de (Google'ın ücretsiz planı) tutulur.

> **KVKK notu (3 Kasım 2026):** MEB izin belgelerinde verilerin üçüncü kişilerle paylaşılmayacağı ve yurt dışına aktarılmayacağı yazıyor. Firebase'in sunucuları yurt dışında olabileceği için uygulamada `js/ayarlar.js` içindeki `mod: "yerel"` ayarı korunur. Bu modda yanıtlar ve oyun kayıtları yalnızca uygulamanın yapıldığı kurum bilgisayarının tarayıcısında tutulur. Site dosyaları bir statik barındırma servisinden açılabilir, çünkü bu servis yalnızca dosyaları sunar ve hiçbir veri almaz. Uygulama bitince Öğretmen panelindeki Veri sekmesinden CSV'ler indirilir, şifreli bir klasörde saklanır, ardından "Tüm veriyi sil" ile tarayıcıdaki kopya silinir. Aşağıdaki Firebase adımları yalnızca ileride, izin belgeleri buna göre güncellenirse kullanılır.

## 1. Önce bilgisayarda dene (kurulum gerekmez)

`js/ayarlar.js` içinde `mod: "yerel"` yazılıyken site hiçbir yere veri göndermez, her şeyi o tarayıcının belleğinde tutar.

**En kolay yol (internet ve kurulum gerekmez):** Zip'i bilgisayarda bir klasöre çıkarın ve klasördeki **BASLAT.bat** dosyasına çift tıklayın (Windows). Siyah bir pencere açılır ve tarayıcı `http://localhost:8000` adresinde siteyi açar. Pencere açık kaldıkça site çalışır; ders bitince pencereyi kapatın. Pardus ya da Linux bilgisayarlarda aynı işi `baslat.sh` yapar (python3 gerekir). Masaüstüne BASLAT.bat için bir kısayol koymak işi daha da kolaylaştırır.

- Kamera `localhost` adresinde de çalışır; ilk açılışta tarayıcının kamera iznine "İzin ver" deyin.
- Yerel moddaki veriler tarayıcıda bu adrese bağlı tutulur. Bu yüzden uygulama boyunca siteyi hep aynı bilgisayarda, aynı tarayıcıda ve BASLAT.bat ile açın; klasörü taşımak veriyi silmez ama başka bir tarayıcı ya da başka bir adres (ör. Netlify) veriyi görmez.
- Windows "Bilgisayarınız korundu" uyarısı verirse "Ek bilgi" → "Yine de çalıştır" deyin. BASLAT.bat yalnızca bu klasördeki dosyaları bu bilgisayara sunar, internete bir şey göndermez.

Dosyaları tarayıcıda çift tıklayarak açmak çalışmaz (tarayıcılar güvenlik için engeller). BASLAT.bat çalışmazsa küçük bir yerel sunucu başka yoldan da açılabilir:

- Bilgisayarda Python varsa klasörde bir terminal açıp `python -m http.server 8000` yaz, sonra tarayıcıda `http://localhost:8000` adresine git.
- Ya da VS Code'da "Live Server" eklentisini kurup `index.html` üzerinde "Open with Live Server" seç.

Ana ekranın üstünde kontrol için örnek hesap görünür: öğrenci rumuzu `MaviKus`, şifre `deneme123`; öğretmen paneli `ogretmen@ornek.com`, şifre `ogretmen`. "Örnekle doldur" düğmesi bilgileri giriş kutularına yazar. Örnek öğrenci analize ve istatistiklere katılmaz.

Deneme sırası:

1. `index.html` → "Örnekle doldur" → "Giriş". Yerel modda 1. oturum deneme olarak açık gelir.
2. Başka bir sekmede ya da gizli pencerede `index.html` → "Üye ol" sekmesi → bir rumuz, okul düzeyi ve şifre yazarak yeni bir öğrenci hesabı aç.
3. `panel.html` → Katılımcılar sekmesinde yeni rumuzun, okul düzeyinin ve grubunun (A/B) göründüğünü kontrol et.
4. Oturum sekmesinde oturumları 2'den 4'e kadar sırayla "Deneme oturumu" işaretli açarak her adımı dene. İstatistik sekmesinde "Deneme verilerini de göster"i işaretle.

Yerel moddaki veriyi temizlemek için panelde "Tüm veriyi sil".

## 1a. Rumuzla üyelik

- Öğrenci giriş ekranındaki **Üye ol** sekmesinde kendi rumuzunu (3-12 karakter, harf ve rakam), okul düzeyini ve şifresini (en az 6 karakter) yazar; rumuzun gerçek adını içermediğini onaylar. Ad, soyad ya da okul numarası istenmez.
- Rumuz kayıtta büyük harfe çevrilir ve Türkçe harfler sadeleştirilir (`Şimşek7` → `SIMSEK7`). Girişte büyük-küçük harf ya da ş/s farkı sorun olmaz. Aynı rumuz ikinci kez alınamaz.
- Grup (A: önce YZ, B: önce klasik) üyelik sırasında, aynı okul düzeyindeki A ve B sayıları dengede kalacak biçimde otomatik atanır.
- Panel → **Katılımcılar**: üyeliği açma/kapama, "Çekildi say", henüz verisi olmayan öğrencinin grubunu değiştirme ve (yerel modda) şifre sıfırlama buradadır. Tüm öğrenciler üye olunca üyeliği kapatın.
- **Rumuz listesini yazdır** boş bir "ad soyad" sütunuyla liste basar. Rumuz-ad eşleştirmesi bu kağıda elle yazılır, yalnızca araştırmacıda kalır ve veri toplama tamamlanınca imha edilir (EK-4'teki taahhüt). Ad bilgisayara hiçbir yerde yazılmaz.
- Yerel modda şifreler tarayıcıda açık metin olarak değil, SHA-256 özeti olarak tutulur.
- **Gerçek uygulamadan önce** `js/ayarlar.js` içinde `ornekGirisGoster: false` yapın. Böylece örnek hesap ana ekrandan kalkar ve yeni bilgisayarlarda oluşturulmaz.

### Birden fazla bilgisayar (yerel mod)

Yerel modda her bilgisayar kendi verisini tutar. Bu nedenle bir öğrenci dört oturumun hepsinde **aynı bilgisayarda** üye olmalı ve aynı bilgisayardan girmelidir (bilgisayara rumuzlu bir etiket yapıştırmak işi kolaylaştırır). Uygulama birden fazla bilgisayarda yapılıyorsa:

1. Her oturum sonunda (ya da en geç uygulama bitince) her öğrenci bilgisayarında `panel.html` → Veri ve dışa aktarma → **Yedek indir (JSON)**.
2. Öğretmen bilgisayarında aynı sekmede **Yedeği birleştir** ile her dosyayı ekle. Aynı dosyayı iki kez eklemek kayıtları çoğaltmaz. Aynı rumuz iki bilgisayarda ayrı ayrı açıldıysa panel uyarır.
3. CSV'ler birleştirilmiş veriden indirilir. Yedek dosyaları kişisel veri içerir; şifreli klasörde saklanır, USB bellekten silinir.

## 2. Firebase projesini aç (bir kez, yaklaşık 20 dakika)

1. https://console.firebase.google.com adresine okul ya da kendi Google hesabınla gir, "Proje ekle". Ad örneğin `oyun-arastirmasi-2204`. Google Analytics'i kapatabilirsin.
2. **Authentication** → "Başlayın" → Oturum açma yöntemi olarak **E-posta/Şifre**'yi etkinleştir.
3. Authentication → Users → "Kullanıcı ekle": kendi öğretmen e-postan ve güçlü bir şifre. Bu panel hesabın olacak.
4. **Firestore Database** → "Veritabanı oluştur" → konum olarak `eur3 (europe-west)` → "Üretim modunda başlat".
5. Firestore → **Kurallar** sekmesi: bu klasördeki `firestore.rules` dosyasının tamamını yapıştır, içindeki `ogretmen@ornek.com` yazısını 3. adımdaki e-postanla değiştir, "Yayınla".
6. Proje ayarları (dişli simgesi) → "Uygulamalarınız" → web simgesi `</>` → bir takma ad ver (Hosting kutusunu işaretleme) → çıkan `firebaseConfig` içindeki `apiKey`, `authDomain`, `projectId`, `appId` değerlerini kopyala.
7. `js/ayarlar.js` dosyasını aç:
   - `mod: "firebase"` yap,
   - `firebase` içine 6. adımdaki dört değeri yaz,
   - `ogretmenEposta` alanına 3. adımdaki e-postayı yaz.

`apiKey` gizli bir şifre değildir; sitede görünmesi normaldir. Verileri koruyan şey 5. adımdaki kurallardır.

## 3. Siteyi yayınla

En kolay yol **Netlify Drop**:

1. https://app.netlify.com/drop adresine git (ücretsiz hesap aç).
2. Bu klasörün tamamını sayfaya sürükle. Birkaç saniyede `https://bir-ad.netlify.app` gibi bir adres verir.
3. Site ayarlarından adı `oyun-arastirmasi` gibi akılda kalan bir ada çevirebilirsin.
4. Firebase konsolunda Authentication → Ayarlar → **Yetkili alan adları** → bu adresi (`bir-ad.netlify.app`) ekle. Eklemezsen giriş çalışmaz.

Bir dosyayı değiştirdiğinde klasörü Netlify'da "Deploys" sayfasına yeniden sürüklemen yeterli.

Alternatif: Firebase Hosting (`firebase deploy`) da olur ama komut satırı ister.

## 4. Uygulama öncesi kontrol listesi

- Okul bilgisayarlarında Chrome ya da Edge güncel mi, kamera izni veriliyor mu? (Siteyi bir kez açıp balon oyununun YZ versiyonunda kamera iznine "İzin ver" de; tarayıcı hatırlar.)
- Okul ağı `netlify.app`, `googleapis.com`, `gstatic.com` ve MediaPipe modeli için `storage.googleapis.com` adreslerine izin veriyor mu?
- `js/ayarlar.js` içinde `ornekGirisGoster: false` yapıldı mı?
- Bir deneme oturumu aç, öğrenci bilgisayarlarında baştan sona dene, sonra panelde "Tüm veriyi sil" ile deneme verilerini temizle (yerel modda bu, deneme rumuzlarını da siler).
- Panelde üyeliği aç; öğrenciler ilk oturumdan önce "Üye ol" ile rumuzlarını oluştursun. Herkes üye olunca üyeliği kapat ve "Rumuz listesini yazdır" ile listeyi bas, adları elle yaz.

## 5. Uygulama günleri

| Oturum | Ne yapılır | Yaklaşık süre |
|---|---|---|
| 1 | Tanıtım anketi, genel sıkılma anketi, ön bilgi testi; iki oyun (A grubu YZ, B grubu klasik), oturum sonu anketi | 40 dk |
| 2 | İki oyun (aynı versiyon), oturum sonu ve sıkılma anketi | 30 dk |
| 3 | İki oyun (A grubu klasik, B grubu YZ), oturum sonu anketi | 25 dk |
| 4 | İki oyun (aynı versiyon), oturum sonu ve sıkılma anketi, genel sıkılma anketi, son bilgi testi, tercih | 40 dk |

Her oturum bir ders saatine sığar. 1. ve 4. oturumlar tam 40 dakikadır; bu günlerde öğrencilerin zamanında başlaması önemli.

Her oturumda: panelde oturum numarasını seç, "Oturumu aç", öğrenciler rumuz ve şifreleriyle giriş yapsın, Canlı izleme sekmesinden takip et, herkes bitince "Oturumu kapat". Gelmeyen öğrenci sonraki gün aynı oturum yeniden açıldığında kaldığı yerden devam edebilir. Şifresini unutan öğrencinin şifresi panelde Katılımcılar sekmesinden sıfırlanır.

Her oyun en fazla 10 dakika sürer. "Bu oyunu bitir" düğmesi oyun ekranı açılır açılmaz görünür; YZ sürümünde kamera hazırlığı sırasında da basılabilir (hazırlıkta basılırsa oynama süresi 0 kaydedilir; süre `js/ayarlar.js` içindeki `bitirDugmesiDk` ile değiştirilebilir). Bu düğmeye basılan an, araştırmanın davranışsal sıkılma ölçüsüdür; öğrencilere "istersen bitirebilirsin, puanın düşmez" denmeli, teşvik ya da caydırma yapılmamalı. YZ versiyonunda süre, kamera ve el tanıma hazır olunca (en geç 90 saniye sonra) başlar.

## 6. Veriler

- Panel → Veri ve dışa aktarma → **Katılımcı özeti** analiz için tek dosyadır: her öğrenci bir satır, YZ ve klasik ölçümleri yan yana. Excel'de doğrudan açılır.
- İstatistik sekmesi yalnızca betimsel istatistik gösterir (ortalama, ortanca, oran). Proje veri analizi IBM SPSS Statistics 22 ile betimsel istatistik olarak yapılır; Veri sekmesindeki CSV dosyaları SPSS'e aktarılır.
- **Sıkılma tahmini** sekmesi, oyun oturumları bittikten sonra "Modeli eğit" ile modeli kurar: sıkılmadan önceki dakikalarda davranışın nasıl değiştiğini, modelin bulduğu "EĞER ... İSE" kurallarını ve modelin hiç görmediği öğrencilerdeki başarısını gösterir. "Bu modeli canlı izlemede kullan" denince Canlı izleme sekmesi oyundaki her öğrencinin sıkılma riskini gösterir (sergide canlı gösterim için). Uygulama sırasında bu göstergeye bakıp öğrenciye müdahale edilmez.
- **İstatistik** sekmesinde yenilik etkisi (her sürümün ilk ve ikinci oturumu) ve sıra etkisi (A grubu ile B grubu) betimsel olarak (ortalama, ortanca) gösterilir.
- "Dakika örnekleri" CSV'si, tahmin modelinin kullandığı veriyi öğrencilerin Excel'de grafiğe dökmesi içindir.
- Bir öğrenci çekilirse: Veri sekmesinde rumuzunu yazıp "Bu rumuzun verisini sil".
- Proje bitince: önce bütün CSV'leri indir, sonra "Tüm veriyi sil". Yerel mod birden fazla bilgisayarda kullanıldıysa bunu her bilgisayarda yap. Firebase modu kullanıldıysa ayrıca Firebase konsolu → Authentication → Users listesinde `@ogrenci.proje` ile biten hesapları seçip sil (site öğrenci hesaplarını kendisi silemez). Veli onam formunda yazan saklama süresine uy.

## 7. Proje öğrencisi için: oyunlar ve oyunların yapısı

Dört oyun vardır, her biri iki sürümlüdür. Klasik sürüm fare ve klavyeyle, yapay zeka destekli (YZ) sürüm kamerayla oynanır. Kamera görüntüsü yalnızca tarayıcıda işlenir; kaydedilmez, gönderilmez, yüz tanıma yapılmaz.

| Oyun | Klasik sürüm | YZ sürümü | Oturum |
|---|---|---|---|
| 🎈 Balon Patlatma | Doğru cevabın balonuna tıkla | Başparmak ve işaret parmağını birleştirerek (pinch) balonu patlat; YZ sürümünden sonra bonus ekran açılır | 1 ve 3 |
| ✂️ Hava Dilimleyici | Fareye basılı tutup sürükleyerek zararlı olanları kes | İşaret parmağının ucunu hızla kaydırarak havada kes | 1 ve 3 |
| 🧙 Büyücü Düellosu | Fareye basılı tutup büyünün şeklini çiz (üçgen antivirüs, daire kalkan, zikzak engelle-bildir) | Parmaklarını birleştirip havada şekli çiz | 2 ve 4 |
| 😮 Ağzınla Yakala | Fareyle yüzü kaydır, fare tuşu ya da boşluk tuşu basılıyken ağız açılır | Başını sağa sola çevirerek kaydır, ağzını açarak yakala | 2 ve 4 |

El takibi `oyunlar/ortak/el-takibi.js`, ağız ve baş takibi `oyunlar/ortak/yuz-takibi.js` içindedir (MediaPipe, `lib/mediapipe/` klasöründen çalışır, internet gerekmez). Seviye, soru havuzu ve kamera hazırlık ekranı üç yeni oyunda ortaktır: `oyunlar/ortak/oyun-ortak.js`. Kamera açılamazsa oyun "Fareyle devam et" düğmesi gösterir ve bu durum `yedek_fare` olarak kaydedilir.

Kamera ters çalışıyorsa (elini sağa götürünce imleç sola gidiyorsa) oyundaki "↔ Yönü çevir" düğmesine bir kez basın; seçim o bilgisayarda hatırlanır.

Aşağısı, oyun kodunun siteyle nasıl konuştuğunu merak edenler içindir; değişiklik yapmanız gerekmez. Site oyunu `oyunlar/<oyun>/index.html?versiyon=yz` ya da `?versiyon=klasik` adresiyle açar.

Oyunun başında:

```js
import { kayitHazirla } from "../../js/kayit-istemci.js";
const Kayit = await kayitHazirla("hava");   // "balon", "hava", "buyucu" ya da "agiz"
const ayar = Kayit.ayar();
// ayar.versiyon         "yz" ya da "klasik"
// ayar.baslangicSeviyesi önceki oturumda kalınan seviye
// ayar.sorular          veri/sorular-<oyun>.json içindeki sorular
```

Oyun sırasında şu olayları gönderin:

| Ne zaman | Kod |
|---|---|
| Kamera ve el/yüz takibi hazır olunca (klasikte hemen) | `Kayit.olay("kalibrasyon_bitti")` |
| Yeni soru ekrana gelince | `Kayit.olay("soru_geldi", { soruId, seviye })` |
| Öğrenci cevap verince (balonu patlatınca, öğeyi kesince, büyüyü yapınca, öğe ağza değince) | `Kayit.olay("cevap", { soruId, secilen, dogru, sureMs, seviye })` |
| Süre dolup cevap verilmezse (balonlar kaçtı, zararlı öğe kesilmeden düştü, canavar ulaştı, güvenli öğe yakalanmadı) | `Kayit.olay("kacirildi", { soruId, seviye, sureMs })` |
| Seviye değişince | `Kayit.olay("seviye_degisti", { eskiSeviye, yeniSeviye })` |
| El ya da yüz 5 saniyeden uzun görünmezse | `Kayit.olay("algilama_sorunu", { sureMs })` |
| El, yüz ya da fare hareket edince | `hareket.hareketVar()` (aşağıya bakın) |

Hareketsizlik, sıkılma tahmin modelinin en önemli sinyallerinden biri. Oyunun başında izleyiciyi kurun:

```js
import { kayitHazirla, hareketsizlikIzleyici } from "../../js/kayit-istemci.js";
const hareket = hareketsizlikIzleyici(Kayit);
// klasik sürüm: document.addEventListener("pointermove", () => hareket.hareketVar());
// YZ sürümü: elin ortalama konumu görüntü genişliğinin %2'sinden fazla değişince,
//            ya da baş konumu değişince hareket.hareketVar() çağırın.
```

`window.oyunDurdur` içinde `hareket.bitir()` çağırmayı unutmayın.

Oyunda ayrıca şu işlev olmalı; süre dolunca ya da öğrenci "Bu oyunu bitir"e basınca site onu çağırır:

```js
window.oyunDurdur = () => {
  // her şeyi durdur, kamerayı kapat
  Kayit.bitir({ neden: "site_durdurdu", puan, sonSeviye: seviye });
};
```

Süre sayacı, "Bu oyunu bitir" düğmesi ve sekme değişimi sitenin işidir; oyuna eklemeyin.

Oyunu geliştirirken `oyunlar/balon/index.html?versiyon=yz` adresini tek başına açabilirsiniz. Bu durumda kayıtlar veritabanına değil tarayıcı konsoluna (F12) yazılır.

Her çalışmada `GELISTIRME-GUNLUGU.md` dosyasına bir satır ekleyin. Jüriye oyun içeriklerini ve soruları sizin kontrol edip geliştirdiğinizi gösteren en güçlü kanıt bu günlük olacak.

Sorular `veri/` klasöründeki JSON dosyalarındadır: Balon Patlatma 180 soru (5 konu × 3 seviye × 12), Hava Dilimleyici 60 öğe (her seviyede 10 zararlı, 10 güvenli), Büyücü Düellosu 45 canavar (her seviyede her büyüden 5), Ağzınla Yakala 60 öğe (her seviyede 10 yakalanacak, 10 kaçınılacak), bilgi testi 20 soru. Öğelerdeki `kazanim` alanı BİLSEM BTY çerçeve programının BİL.DEP-1.12.1.2-5 kazanımlarını gösterir. Hepsi **taslaktır** (`"yazan": "taslak"`). Uygulamadan önce her soruyu okuyun: yanlış, belirsiz ya da sınıf düzeyine uymayan soruları düzeltin, değiştirdiğiniz sorularda `yazan` alanına kendi adınızın baş harflerini yazın. Bu kontrol de günlüğe yazılmalı. Balon sorularında doğru cevap her zaman `a` seçeneğidir; oyun seçenekleri ekranda karıştırdığı için sorun olmaz. Yeni soru eklerken var olan örneklerin biçimini aynen kopyalayın; dosyayı kaydettikten sonra https://jsonlint.com adresinde kontrol etmek hataları yakalar.
