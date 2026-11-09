# Geliştirme günlüğü

Her çalışmada bir satır ekleyin. Ne denediğinizi kısaca yazın. "Kararımız" sütunu en önemlisi: sonucu nasıl değerlendirdiğinizi ve neyi neden seçtiğinizi yazın.

| Tarih | Kim | Hangi parça | Ne denedik | Sonuç | Kararımız ve nedeni |
|---|---|---|---|---|---|
| 2026-11-20 | Öğrenci | Büyücü Düellosu | Daireyi hızlı ve küçük çizdik | Şekil bazen tanınmadı | Büyük ve yavaş çizmenin daha iyi çalıştığını not ettik |
|  |  |  |  |  |  |

## Haftalık "kodunu anlat" notları

| Tarih | Anlatan | Anlattığı parça | Sorulan sorular | Anlatabildi mi? |
|---|---|---|---|---|
|  |  |  |  |  |

## Tahmin modeli hipotezleri (veri gelmeden önce, Aralık)

Her öğrenci kendi tahminini yazar: "Sıkılmayı en iyi hangi sinyal gösterir? Neden?"

- Öğrenci:
- 2026-11-02: Balon oyununda kamera ayna etkisi kaldırıldı (varsayılan aynasız); 'Yönü çevir' düğmesi eklendi, seçim bilgisayarda hatırlanır.
- 2026-11-02: Balon oyununun YZ sürümünden sonra açılan bonus ekran eklendi (oyunlar/balon/bonus.html): 20 hareketli balon, internette doğru/yanlış davranışlar, pinch ile doğruları patlatma, her doğru patlatmada %7 hızlanma, en fazla 3 dakika. Bonus araştırma verisi kaydetmez.
- 2026-11-02: Kart oyunu (Teachable Machine) projeden çıkarıldı. Yeni oyun seti: Balon Patlatma, Hava Dilimleyici, Büyücü Düellosu, Ağzınla Yakala (yeni üç oyun henüz yazılmadı). Anket yönergeleri, tercih seçenekleri ve bilgi testi (t11-t20 artık siber güvenlik) buna göre güncellendi.
- 2026-11-02: Hava Dilimleyici, Büyücü Düellosu ve Ağzınla Yakala yazıldı (her biri YZ ve klasik sürümlü, uyarlanabilir 3 seviye). Yüz takibi (yalnızca ağız açıklığı ve baş konumu, yüz tanıma yok) eklendi. Oturum eşleşmesi: 1. ve 3. oturum Balon + Hava, 2. ve 4. oturum Büyücü + Ağız. Panelde sınıf yerine okul düzeyi (ilkokul, ortaokul, lise). İstatistik sekmesi betimsel istatistiğe indirildi (proje belgeleriyle uyum için).
- 2026-11-03: MEB ret gerekçesine (KVKK ve mevzuata uygunluk) göre kişisel bilgi formundan cinsiyet sorusu çıkarıldı (analizde kullanılmıyordu, KVKK ölçülülük ilkesi). Oyun formu maddelerindeki "Bugünkü" ifadesi "Bu" yapıldı. Uygulamada yerel mod kullanılacak (veriler yurt dışına aktarılmaz).
- 2026-11-09: MEB araştırma izni alındı; site uygulamaya hazırlandı. Kod + resimli şifre girişi kaldırıldı, yerine rumuzla üyelik geldi: öğrenci "Üye ol" sekmesinde rumuz, okul düzeyi ve şifre (en az 6 karakter) belirler, gerçek ad yazmadığını onaylar. Ad hiçbir yerde istenmez (izin belgelerindeki "veriler rumuz koduyla toplanır" ifadesiyle uyumlu). Grup (A/B) üyelikte okul düzeyi içinde dengeli atanır. Yerel modda şifre açık metin değil SHA-256 özeti olarak tutulur.
- 2026-11-09: Kontrolü kolaylaştırmak için ana ekranda örnek hesap kutusu var (öğrenci MaviKus / deneme123, öğretmen ogretmen@ornek.com / ogretmen, "Örnekle doldur" düğmesi). Örnek öğrenci analize, istatistiğe, tahmin modeline ve CSV'lere katılmaz. Uygulamadan önce js/ayarlar.js içinde ornekGirisGoster: false yapılacak.
- 2026-11-09: Panel Katılımcılar sekmesi yenilendi: üyeliği aç/kapat, çekildi say, verisi olmayan öğrencinin grubunu değiştirme, şifre sıfırlama (yerel mod), boş ad sütunlu "Rumuz listesini yazdır" (rumuz-ad eşleşmesi yalnızca kağıtta). Veri sekmesine yerel mod için "Yedek indir / Yedeği birleştir" eklendi: birden fazla bilgisayarda toplanan veriler öğretmen bilgisayarında tek yerde birleşir.
- 2026-11-09: Firebase kuralları rumuzla üyeliğe göre güncellendi (öğrenci yalnızca kendi rumuz belgesini, üyelik açıkken oluşturabilir; grup sayacı birer birer artar). Uygulama yerel modda yapılacağı için Firebase modu canlı bir projede denenmedi.
- 2026-11-09: Balon sorularındaki şapkalı harfler kaldırıldı (zekâ → zeka, şikâyet → şikayet, resmî → resmi). KURULUM.md rumuzla üyelik ve çok bilgisayarlı yerel kullanıma göre güncellendi; istatistik bölümündeki "test edilir" ifadesi "betimsel olarak gösterilir" yapıldı.
- 2026-11-09: Büyücü Düellosu'nda daire çizimlerinin tanınmaması düzeltildi. Eski yöntem yalnızca ucu tam kapanan çizimleri daire sayıyordu; başlangıç ile bitişin birleştiği yerde yapay köşe oluşunca daireyi bazen üçgen sanıyordu. Yeni yöntem çizimi yumuşatıyor, yol boyunca toplam dönüşü hesaplıyor (en az 270°) ve elips biçimini de kabul ediyor. Bilgisayarda üretilen titrek el çizimleriyle yapılan denemede daire tanıma oranı yaklaşık %52'den %97'ye çıktı; üçgen ve zikzak tanıma oranı değişmedi (%97-99).
- 2026-11-09: Helin'in isteğiyle "Bu oyunu bitir" düğmesi 3. dakika yerine oyun başlar başlamaz görünür (bitirDugmesiDk: 0). Düğme her sürümde oyun ekranı açılır açılmaz görünür, YZ sürümünde kamera hazırlığı sırasında da (hazırlıkta basılırsa oynama süresi 0 kaydedilir).
- 2026-11-09: Netlify'a her seferinde yükleme zahmetli olduğu için siteyi bilgisayarda açan BASLAT.bat (Windows, kurulum gerektirmez, PowerShell ile http://localhost:8000) ve baslat.sh (Pardus/Linux, python3) eklendi. İnternet gerekmez; veriler zaten yerel modda tutulduğu için KVKK açısından da en sade yol budur.
- 2026-11-09: Helin'in seçimiyle ("sade ama canlı") anket ve bilgi testi ekranları yenilendi: renkli arka plan, her soruda kayarak gelen kart, renkli ve harfli seçenek kartları, kırmızıdan yeşile duygu ölçeği, renkli ilerleme çubuğu, seçilen seçeneğin kısa vurgusu ve her bölüm sonunda kutlama ekranı. Soru ve seçenek metinleri değişmedi; ölçmeyi etkilememek için puan, süre sınırı ve doğru/yanlış geri bildirimi eklenmedi. Hareket azaltma ayarı açık bilgisayarlarda animasyonlar kapanır.
- 2026-11-09: Site GitHub Pages'e taşındı (https://helinates.github.io/oyun-arastirmasi/, depo helinates/oyun-arastirmasi). Güncellemeler depoya gönderilince adrese kendiliğinden gelir; Netlify'a sürükleme ve zip indirme gerekmez.
