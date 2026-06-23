// Theory §2.2 — WSS: constant mean; ACF depends only on lag k

/** Sample mean μ̂ */
export function estimateMean(x) {
  if (!x.length) return 0;
  return x.reduce((s, v) => s + v, 0) / x.length;
}

// Theory §2.2 — R_x[k] = E{ x[n] · x[n−k] }
export function estimateACF(x, maxLag) {
  const N = x.length;
  const mu = estimateMean(x);
  const centered = x.map((v) => v - mu);
  const K = Math.min(maxLag, N - 1);
  const R = new Array(K + 1).fill(0);
  for (let k = 0; k <= K; k++) {
    let sum = 0;
    for (let n = k; n < N; n++) sum += centered[n] * centered[n - k];
    R[k] = sum / N;
  }
  return R;
}

// Theory §2.2 — WSS check: constant mean + ACF lag-invariance across segments
export function checkWSS(x, maxLag = 32) {
  const N = x.length;
  if (N < 64) {
    return { isWSS: false, mean: estimateMean(x), segmentMeanVar: NaN, acfMismatch: NaN, message: "Signal too short for WSS test" };
  }
  const half = Math.floor(N / 2);
  const seg1 = x.slice(0, half);
  const seg2 = x.slice(half);
  const m1 = estimateMean(seg1);
  const m2 = estimateMean(seg2);
  const globalMean = estimateMean(x);
  const segmentMeans = [m1, m2];
  const meanOfMeans = (m1 + m2) / 2;
  const segmentMeanVar = ((m1 - meanOfMeans) ** 2 + (m2 - meanOfMeans) ** 2) / 2;
  const signalVar = x.reduce((s, v) => s + (v - globalMean) ** 2, 0) / N;

  const R1 = estimateACF(seg1, maxLag);
  const R2 = estimateACF(seg2, maxLag);
  let acfMismatch = 0;
  const denom = Math.abs(R1[0]) + 1e-12;
  for (let k = 0; k < R1.length; k++) {
    acfMismatch += Math.abs(R1[k] - R2[k]) / denom;
  }
  acfMismatch /= R1.length;

  const meanStable = segmentMeanVar < 0.01 * (signalVar + 1e-12);
  const acfStable = acfMismatch < 0.25;
  const isWSS = meanStable && acfStable;

  return {
    isWSS,
    mean: globalMean,
    segmentMeanVar,
    acfMismatch,
    meanStable,
    acfStable,
    message: isWSS
      ? "WSS conditions approximately satisfied"
      : `WSS check failed (meanStable=${meanStable}, acfStable=${acfStable})`,
  };
}

// Theory §2.2 — Wiener–Khinchin: S_x(e^jω) = Σ_k R_x[k] e^{−jωk}
export function acfToPSD(R, nfft = 512) {
  const freqs = new Array(nfft / 2 + 1);
  const psd = new Array(nfft / 2 + 1);
  for (let m = 0; m <= nfft / 2; m++) {
    const omega = (2 * Math.PI * m) / nfft;
    let re = 0;
    let im = 0;
    for (let k = 0; k < R.length; k++) {
      re += R[k] * Math.cos(omega * k);
      im -= R[k] * Math.sin(omega * k);
    }
    freqs[m] = m / nfft;
    psd[m] = re * re + im * im;
  }
  return { freqs, psd };
}
