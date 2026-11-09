// El takibi: kamerayı açar, MediaPipe Hand Landmarker ile eli bulur, pinch (başparmak + işaret parmağı
// birleştirme) hareketini algılar. Görüntü hiçbir yere gönderilmez ve kaydedilmez; her kare yalnızca
// bu bilgisayarın tarayıcısında işlenip atılır.
//
// Kullanım:
//   const el = await elTakibiBaslat({ video, ayna: true });
//   el.dinle((d) => { d.elVar, d.x, d.y (0-1 arası ekran konumu), d.pinch (true/false), d.oran,
//                     d.ix, d.iy (işaret parmağı ucunun ekran konumu, 0-1) });
//   el.aynaAyarla(true/false);  // sağ-sol yönünü oyun sırasında değiştirir
//   el.durdur();

import { FilesetResolver, HandLandmarker } from "../../lib/mediapipe/vision_bundle.mjs";

const KOK = new URL("../../lib/mediapipe/", import.meta.url).href;

// Pinch oranı = başparmak ucu (4) ile işaret parmağı ucu (8) arası mesafe ÷ bilek (0) ile orta parmak kökü (9) arası.
// Bu bölme sayesinde el kameraya yakın da uzak da olsa oran aynı kalır.
export const PINCH_KAPAN = 0.25; // bunun altına inince parmaklar birleşti
export const PINCH_AC = 0.35; // bunun üstüne çıkınca parmaklar ayrıldı (arada kalan bölge titremeyi önler)
const BEKLEME_MS = 300; // bir pinch'ten sonra bu kadar süre yeni pinch sayılmaz

function mesafe(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export async function elTakibiBaslat({ video, ayna = true }) {
  const akis = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, audio: false,
  });
  video.srcObject = akis;
  video.muted = true;
  video.playsInline = true;
  await video.play();

  const dosyalar = await FilesetResolver.forVisionTasks(KOK + "wasm");
  let isaretci;
  try {
    isaretci = await HandLandmarker.createFromOptions(dosyalar, {
      baseOptions: { modelAssetPath: KOK + "hand_landmarker.task", delegate: "GPU" },
      runningMode: "VIDEO", numHands: 1,
    });
  } catch (e) {
    // Bazı okul bilgisayarlarında ekran kartı desteği yoktur; o zaman işlemciyle çalışır.
    isaretci = await HandLandmarker.createFromOptions(dosyalar, {
      baseOptions: { modelAssetPath: KOK + "hand_landmarker.task", delegate: "CPU" },
      runningMode: "VIDEO", numHands: 1,
    });
  }

  const dinleyiciler = [];
  let calisiyor = true;
  let sonZaman = -1;
  let pinch = false;
  let sonPinchDegisimi = 0;
  let x = 0.5; let y = 0.5;
  let ix = 0.5; let iy = 0.5;

  function kare() {
    if (!calisiyor) return;
    if (video.readyState >= 2 && video.currentTime !== sonZaman) {
      sonZaman = video.currentTime;
      const sonuc = isaretci.detectForVideo(video, performance.now());
      const noktalar = sonuc.landmarks && sonuc.landmarks[0];
      const simdi = performance.now();
      let oran = null;
      if (noktalar) {
        oran = mesafe(noktalar[4], noktalar[8]) / Math.max(0.001, mesafe(noktalar[0], noktalar[9]));
        // İmleç, başparmak ile işaret parmağı uçlarının ortası. Hafif yumuşatma titremeyi azaltır.
        const hx = (noktalar[4].x + noktalar[8].x) / 2;
        const hy = (noktalar[4].y + noktalar[8].y) / 2;
        const ex = ayna ? 1 - hx : hx;
        x = x * 0.5 + ex * 0.5;
        y = y * 0.5 + hy * 0.5;
        // İşaret parmağı ucu (8): hava dilimleyicide kesme izi bu noktadan çizilir.
        const px = ayna ? 1 - noktalar[8].x : noktalar[8].x;
        ix = ix * 0.4 + px * 0.6;
        iy = iy * 0.4 + noktalar[8].y * 0.6;
        if (simdi - sonPinchDegisimi > BEKLEME_MS) {
          if (!pinch && oran < PINCH_KAPAN) { pinch = true; sonPinchDegisimi = simdi; }
          else if (pinch && oran > PINCH_AC) { pinch = false; sonPinchDegisimi = simdi; }
        }
      } else if (pinch) {
        pinch = false;
      }
      const durum = { elVar: !!noktalar, x, y, ix, iy, pinch, oran, noktalar: noktalar || null };
      for (const d of dinleyiciler) d(durum);
    }
    requestAnimationFrame(kare);
  }
  requestAnimationFrame(kare);

  return {
    aynaAyarla(v) { ayna = !!v; },
    dinle(f) { dinleyiciler.push(f); },
    durdur() {
      calisiyor = false;
      akis.getTracks().forEach((t) => t.stop());
      try { isaretci.close(); } catch (e) { /* zaten kapalı */ }
    },
  };
}
