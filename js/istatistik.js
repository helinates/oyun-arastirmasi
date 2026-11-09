// Küçük örneklem için betimsel istatistik ve Wilcoxon işaretli sıralar testi.

export function ortalama(x) {
  return x.length ? x.reduce((a, b) => a + b, 0) / x.length : null;
}

export function medyan(x) {
  if (!x.length) return null;
  const s = x.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Standart normal dağılımın birikimli olasılığı (Abramowitz-Stegun yaklaşımı).
function normalBirikimli(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

// a ve b eşleştirilmiş ölçümler. Farkı 0 olan çiftler atılır, eşit farklara ortalama sıra verilir.
// n <= 25 ve eşit sıra yoksa kesin p, değilse normal yaklaşım (süreklilik düzeltmeli) kullanılır.
export function wilcoxon(a, b) {
  const farklar = a.map((x, i) => x - b[i]).filter((d) => d !== 0);
  const n = farklar.length;
  if (n < 5) return null;
  const sirali = farklar.map((d) => ({ d, m: Math.abs(d) })).sort((x, y) => x.m - y.m);
  let esitVar = false;
  let esitDuzeltme = 0;
  for (let i = 0; i < n; ) {
    let j = i;
    while (j + 1 < n && sirali[j + 1].m === sirali[i].m) j++;
    const sira = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) sirali[k].sira = sira;
    const t = j - i + 1;
    if (t > 1) { esitVar = true; esitDuzeltme += (t * t * t - t) / 48; }
    i = j + 1;
  }
  const Warti = sirali.filter((x) => x.d > 0).reduce((t, x) => t + x.sira, 0);
  const Weksi = sirali.filter((x) => x.d < 0).reduce((t, x) => t + x.sira, 0);
  const W = Math.min(Warti, Weksi);
  const beklenen = (n * (n + 1)) / 4;
  const sd = Math.sqrt((n * (n + 1) * (2 * n + 1)) / 24 - esitDuzeltme);
  const z = (Warti - beklenen) / sd;
  let p;
  let kesin = false;
  if (n <= 25 && !esitVar) {
    // Sıra toplamının kesin dağılımı: her sıra ya + ya - işaretli.
    const enBuyuk = (n * (n + 1)) / 2;
    let say = new Array(enBuyuk + 1).fill(0);
    say[0] = 1;
    for (let r = 1; r <= n; r++) {
      const yeni = say.slice();
      for (let s = r; s <= enBuyuk; s++) yeni[s] += say[s - r];
      say = yeni;
    }
    const toplam = 2 ** n;
    let kuyruk = 0;
    for (let s = 0; s <= W; s++) kuyruk += say[s];
    p = Math.min(1, (2 * kuyruk) / toplam);
    kesin = true;
  } else {
    const zd = (Math.abs(Warti - beklenen) - 0.5) / sd;
    p = Math.min(1, 2 * (1 - normalBirikimli(zd)));
  }
  return { n, W, Warti, Weksi, z, p, kesin, r: Math.abs(z) / Math.sqrt(n) };
}

// Mann-Whitney U testi (bağımsız iki grup), normal yaklaşım ve eşit sıra düzeltmesiyle.
export function mannWhitney(a, b) {
  const n1 = a.length; const n2 = b.length;
  if (n1 < 3 || n2 < 3) return null;
  const hepsi = [...a.map((d) => ({ d, g: 1 })), ...b.map((d) => ({ d, g: 2 }))].sort((x, y) => x.d - y.d);
  const N = hepsi.length;
  let esitDuzeltme = 0;
  for (let i = 0; i < N; ) {
    let j = i;
    while (j + 1 < N && hepsi[j + 1].d === hepsi[i].d) j++;
    for (let k = i; k <= j; k++) hepsi[k].sira = (i + j) / 2 + 1;
    const t = j - i + 1;
    if (t > 1) esitDuzeltme += t * t * t - t;
    i = j + 1;
  }
  const R1 = hepsi.filter((x) => x.g === 1).reduce((t, x) => t + x.sira, 0);
  const U1 = R1 - (n1 * (n1 + 1)) / 2;
  const U = Math.min(U1, n1 * n2 - U1);
  const beklenen = (n1 * n2) / 2;
  const sd = Math.sqrt(((n1 * n2) / 12) * (N + 1 - esitDuzeltme / (N * (N - 1))));
  if (!sd) return null;
  const z = (U1 - beklenen) / sd;
  const zd = (Math.abs(U1 - beklenen) - 0.5) / sd;
  const p = Math.min(1, 2 * (1 - normalBirikimli(Math.max(0, zd))));
  return { U, z, p, r: Math.abs(z) / Math.sqrt(N) };
}
