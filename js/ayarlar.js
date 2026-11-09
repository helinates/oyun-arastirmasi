// Sitenin tüm ayarları bu dosyada. Kurulumda yalnızca burası değiştirilir.

export const AYARLAR = {
  // "yerel": veriler bu bilgisayarın tarayıcısında tutulur (deneme ve geliştirme için).
  // "firebase": veriler Firebase'de tutulur (gerçek uygulama için).
  mod: "yerel",

  // Firebase konsolundaki "Proje ayarları > Web uygulaması" bölümünden kopyalanır.
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    appId: "",
  },

  // Öğretmen paneline girecek tek hesabın e-postası (firestore.rules dosyasında da aynısı yazılmalı).
  ogretmenEposta: "ogretmen@ornek.com",

  // Öğrenci hesapları bu alan adıyla oluşturulur (gerçek bir e-posta değildir).
  ogrenciAlanAdi: "ogrenci.proje",

  // Kontrolü kolaylaştırmak için ana ekranda örnek rumuz ve şifre gösterilir; bu örnek öğrenci
  // yerel modda kendiliğinden oluşur ve analize katılmaz. Gerçek uygulamadan önce false yapın.
  ornekGirisGoster: true,
  ornekGiris: { rumuz: "MaviKus", sifre: "deneme123", sinif: "Ortaokul", grup: "A" },

  oyunSuresiDk: 10,       // her oyun bloğunun en uzun süresi
  bitirDugmesiDk: 0,      // "Bu oyunu bitir" düğmesinin göründüğü dakika (0: oyun ekranı açılır açılmaz, hazırlık sırasında da)
  serbestOyunDk: 15,      // serbest oyun adımı süresi (şu anki 4 oturumluk planda kullanılmıyor)
  kalibrasyonBekleSn: 90, // oyun "kalibrasyon_bitti" demezse süre bu kadar sonra yine de başlar
};
