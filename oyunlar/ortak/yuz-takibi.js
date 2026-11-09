// Yüz takibi: kamerayı açar, MediaPipe Face Landmarker ile yüzdeki noktaları bulur ve yalnızca iki şey
// çıkarır: ağız açık mı, baş ekranın neresinde. Bu bir yüz TANIMA değildir; kimin yüzü olduğu bilinmez,
// hiçbir görüntü ya da yüz bilgisi kaydedilmez, gönderilmez. Her kare tarayıcıda işlenip atılır.
//
// Kullanım:
//   const yuz = await yuzTakibiBaslat({ video, ayna: false });
//   yuz.dinle((d) => { d.yuzVar, d.x (0-1, burun ucunun yatay konumu), d.agizAcik (true/false), d.acilma (0-1) });
//   yuz.aynaAyarla(true/false);
//   yuz.durdur();

import { FilesetResolver, FaceLandmarker } from "../../lib/mediapipe/vision_bundle.mjs";

const KOK = new URL("../../lib/mediapipe/", import.meta.url).href;

// "jawOpen" değeri 0 (ağız kapalı) ile 1 (ağız tam açık) arasındadır. İki eşik titremeyi önler.
export const AGIZ_AC = 0.38;
export const AGIZ_KAPAN = 0.22;

export async function yuzTakibiBaslat({ video, ayna = false }) {
  const akis = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, audio: false,
  });
  video.srcObject = akis;
  video.muted = true;
  video.playsInline = true;
  await video.play();

  const dosyalar = await FilesetResolver.forVisionTasks(KOK + "wasm");
  const secenek = (delegate) => ({
    baseOptions: { modelAssetPath: KOK + "face_landmarker.task", delegate },
    runningMode: "VIDEO", numFaces: 1, outputFaceBlendshapes: true,
  });
  let isaretci;
  try {
    isaretci = await FaceLandmarker.createFromOptions(dosyalar, secenek("GPU"));
  } catch (e) {
    isaretci = await FaceLandmarker.createFromOptions(dosyalar, secenek("CPU"));
  }

  const dinleyiciler = [];
  let calisiyor = true;
  let sonZaman = -1;
  let agizAcik = false;
  let x = 0.5;
  let acilma = 0;

  function kare() {
    if (!calisiyor) return;
    if (video.readyState >= 2 && video.currentTime !== sonZaman) {
      sonZaman = video.currentTime;
      const sonuc = isaretci.detectForVideo(video, performance.now());
      const noktalar = sonuc.faceLandmarks && sonuc.faceLandmarks[0];
      if (noktalar) {
        const bs = sonuc.faceBlendshapes && sonuc.faceBlendshapes[0];
        const cene = bs && bs.categories.find((c) => c.categoryName === "jawOpen");
        if (cene) {
          acilma = cene.score;
        } else {
          // Yedek yol: dudak arası mesafe ÷ yüz yüksekliği (13 üst dudak, 14 alt dudak, 10 alın, 152 çene).
          const yuzBoyu = Math.max(0.001, Math.abs(noktalar[152].y - noktalar[10].y));
          acilma = Math.min(1, (Math.abs(noktalar[14].y - noktalar[13].y) / yuzBoyu) * 6);
        }
        if (!agizAcik && acilma > AGIZ_AC) agizAcik = true;
        else if (agizAcik && acilma < AGIZ_KAPAN) agizAcik = false;
        const bx = ayna ? 1 - noktalar[1].x : noktalar[1].x;
        // Baş hareketi küçük olduğu için orta bölge ekranın tamamına yayılır.
        const yayilmis = Math.min(1, Math.max(0, (bx - 0.5) * 2.2 + 0.5));
        x = x * 0.6 + yayilmis * 0.4;
      } else {
        agizAcik = false;
      }
      const durum = { yuzVar: !!noktalar, x, agizAcik, acilma };
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
