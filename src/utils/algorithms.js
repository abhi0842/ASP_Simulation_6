function createRng(seed) {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildDeterministicSeed(input) {
  const str = typeof input === "string" ? input : JSON.stringify(input);
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function solveLinear(A, b) {
  const n = b.length;
  const aug = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-12) continue;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const f = aug[row][col] / pivot;
      for (let k = col; k <= n; k++) aug[row][k] -= f * aug[col][k];
    }
  }
  return aug.map((row, i) => (Math.abs(row[i]) > 1e-12 ? row[n] / row[i] : 0));
}

function smoothArray(arr, w) {
  return arr.map((_, i) => {
    let s = 0, c = 0;
    for (let k = Math.max(0, i - w + 1); k <= i; k++) { s += arr[k]; c++; }
    return s / c;
  });
}

// ── LMS-AR on real ECG ──────────────────────────────────────────────────────
export function runLMS_AR(ecgSignal, P = 4, mu = 0.001, monteCarloRuns = 50, seed = 12345) {
  const N = ecgSignal.length;
  if (N < P + 1) return null;

  const R = new Array(P + 1).fill(0);
  for (let lag = 0; lag <= P; lag++) {
    let acc = 0;
    for (let i = lag; i < N; i++) acc += ecgSignal[i] * ecgSignal[i - lag];
    R[lag] = acc / (N - lag);
  }
  const Rmat = Array.from({ length: P }, (_, i) =>
    Array.from({ length: P }, (_, j) => R[Math.abs(i - j)])
  );
  const p_vec = Array.from({ length: P }, (_, i) => R[i + 1]);
  const w_opt = solveLinear(Rmat, p_vec);

  const rng = createRng(seed);
  const mseAccum = new Array(N - P).fill(0);
  let allW = null;

  for (let run = 0; run < monteCarloRuns; run++) {
    const noiseAmp = 0.002 * (rng() - 0.5);
    const w = new Array(P).fill(0);
    const w_hist = Array.from({ length: P }, () => []);
    const mse_run = [];
    for (let i = P; i < N; i++) {
      const x = Array.from({ length: P }, (_, k) => ecgSignal[i - k - 1] + noiseAmp * rng());
      let y_pred = 0;
      for (let k = 0; k < P; k++) y_pred += w[k] * x[k];
      const e = ecgSignal[i] - y_pred;
      mse_run.push(e * e);
      for (let k = 0; k < P; k++) w[k] += mu * e * x[k];
      if (run === monteCarloRuns - 1) w_hist.forEach((wh, k) => wh.push(w[k]));
    }
    mse_run.forEach((v, i) => { mseAccum[i] += v; });
    if (run === monteCarloRuns - 1) allW = w_hist;
  }

  const mse_avg = mseAccum.map(v => v / monteCarloRuns);
  const mse_smooth = smoothArray(mse_avg, 20);
  const w_final = allW ? allW.map(wArr => wArr[wArr.length - 1]) : new Array(P).fill(0);

  const displayLen = Math.min(N - P, 1500);
  const predicted = Array.from({ length: displayLen }, (_, idx) => {
    const i = idx + P;
    let y = 0;
    for (let k = 0; k < P; k++) y += w_final[k] * ecgSignal[i - k - 1];
    return { x: idx, y };
  });
  const original = ecgSignal.slice(P, P + displayLen).map((v, i) => ({ x: i, y: v }));

  return {
    type: "AR Process", mse: mse_smooth, w_hist: allW, w_opt,
    predicted, original, iterations: mse_smooth.map((_, i) => i + 1),
    N: mse_smooth.length, P, mu, monteCarloRuns,
  };
}

// ── MVDR on real ECG ─────────────────────────────────────────────────────────
export function runMVDR(ecgSignal, M = 8, snapshots = 256, theta_s = 30, theta_i = -45, snr_dB = 20, inr_dB = 25, monteCarloRuns = 50) {
  const N = ecgSignal.length;
  const rng = createRng(42);
  const ecgMax = Math.max(...ecgSignal.map(Math.abs)) || 1;
  const ecgNorm = ecgSignal.map(v => v / ecgMax);

  const steer = (deg) => {
    const th = deg * Math.PI / 180;
    return {
      re: Array.from({ length: M }, (_, m) => Math.cos(Math.PI * m * Math.sin(th))),
      im: Array.from({ length: M }, (_, m) => Math.sin(Math.PI * m * Math.sin(th))),
    };
  };

  const a_s = steer(theta_s), a_i = steer(theta_i);
  const snr = Math.pow(10, snr_dB / 10), inr = Math.pow(10, inr_dB / 10);
  const blockSize = Math.min(snapshots, Math.floor(N / M));

  const R_re = Array.from({ length: M }, () => new Array(M).fill(0));
  for (let snap = 0; snap < blockSize; snap++) {
    const idx = (snap * M) % (N - M);
    const x_re = new Array(M), x_im = new Array(M);
    for (let m = 0; m < M; m++) {
      const s = ecgNorm[idx + m];
      const inter = Math.sqrt(inr / snr) * (rng() - 0.5) * 2;
      const noise = (rng() - 0.5) * 2 / Math.sqrt(snr);
      x_re[m] = s * a_s.re[m] + inter * a_i.re[m] + noise;
      x_im[m] = s * a_s.im[m] + inter * a_i.im[m] + noise;
    }
    for (let i = 0; i < M; i++)
      for (let j = 0; j < M; j++)
        R_re[i][j] += (x_re[i] * x_re[j] + x_im[i] * x_im[j]) / blockSize;
  }
  for (let m = 0; m < M; m++) R_re[m][m] += 0.01;

  const Rinv_a = solveLinear(R_re, a_s.re);
  let denom = 0;
  for (let m = 0; m < M; m++) denom += a_s.re[m] * Rinv_a[m];
  denom = Math.abs(denom) || 1e-10;
  const w_mvdr = Rinv_a.map(v => v / denom);

  const displayLen = Math.min(N - M, 1500);
  const denoised = Array.from({ length: displayLen }, (_, i) => {
    let out = 0;
    for (let m = 0; m < M; m++) out += w_mvdr[m] * ecgNorm[i + m];
    return { x: i, y: out * ecgMax };
  });
  const original = Array.from({ length: displayLen }, (_, i) => ({
    x: i, y: ecgSignal[i + Math.floor(M / 2)],
  }));

  const phi = Array.from({ length: 181 }, (_, i) => i - 90);
  const G_dB_avg = phi.map(angle => {
    let gainAcc = 0;
    for (let run = 0; run < monteCarloRuns; run++) {
      const at = steer(angle + (rng() - 0.5) * 0.5);
      let num = 0;
      for (let m = 0; m < M; m++) num += w_mvdr[m] * at.re[m];
      gainAcc += num * num;
    }
    return 10 * Math.log10(Math.max(gainAcc / monteCarloRuns, 1e-10));
  });
  const maxG = Math.max(...G_dB_avg);

  return {
    type: "MVDR Beamformer",
    phi, G_dB_avg: G_dB_avg.map(v => v - maxG),
    denoised, original,
    M, snapshots: blockSize, theta_s, theta_i, snr_dB, inr_dB, monteCarloRuns,
  };
}

// ── Legacy exports (3b) ──────────────────────────────────────────────────────
export function runLMS_Equalization(N, M, mu, seed = Date.now()) {
  const random = createRng(seed);
  const s = Array.from({ length: N }, () => (random() > 0.5 ? 1 : -1));
  const h = [1, 0.5];
  const r = s.map((_, i) => h[0] * s[i] + (i > 0 ? h[1] * s[i - 1] : 0) + 0.1 * (random() - 0.5));
  let w = new Array(M).fill(0);
  const mse = [], w_history = Array.from({ length: M }, () => []);
  for (let i = M; i < N; i++) {
    const x = r.slice(i - M, i).reverse();
    const y = w.reduce((sum, wi, j) => sum + wi * x[j], 0);
    const e = s[i - Math.floor(M / 2)] - y;
    mse.push(e * e);
    w = w.map((wi, j) => wi + mu * e * x[j]);
    w.forEach((wi, j) => w_history[j].push(wi));
  }
  return { mse, weights: w_history, iterations: Array.from({ length: mse.length }, (_, i) => i + 1), finalWeights: w };
}

export function runLMS_Prediction(N, P, mu, seed = Date.now()) {
  const random = createRng(seed);
  const v = Array.from({ length: N }, () => (random() - 0.5) * 0.5);
  const u = new Array(N).fill(0); u[0] = 0.5; u[1] = 1.0;
  for (let i = 2; i < N; i++) u[i] = 0.75 * u[i - 1] - 0.5 * u[i - 2] + v[i];
  let w = new Array(P).fill(0);
  const mse = [], w_history = Array.from({ length: P }, () => []);
  for (let i = P; i < N; i++) {
    const x = u.slice(i - P, i).reverse();
    const y_pred = w.reduce((s, wi, j) => s + wi * x[j], 0);
    const e = u[i] - y_pred; mse.push(e * e);
    w = w.map((wi, j) => wi + mu * e * x[j]);
    w.forEach((wi, j) => w_history[j].push(wi));
  }
  return { mse, weights: w_history, iterations: Array.from({ length: mse.length }, (_, i) => i + 1), signal: u.slice(0, 300), finalWeights: w };
}

export function runRLS_Equalization(N, M, lambda, delta, seed = Date.now()) {
  const random = createRng(seed);
  const s = Array.from({ length: N }, () => (random() > 0.5 ? 1 : -1));
  const h = [1, 0.5];
  const r = s.map((_, i) => h[0] * s[i] + (i > 0 ? h[1] * s[i - 1] : 0) + 0.1 * (random() - 0.5));
  let w = new Array(M).fill(0);
  let Pmat = Array.from({ length: M }, (_, i) => Array.from({ length: M }, (_, j) => i === j ? 1 / Math.max(delta, 1e-9) : 0));
  const mse = [], w_history = Array.from({ length: M }, () => []);
  for (let i = M; i < N; i++) {
    const x = r.slice(i - M, i).reverse(); const d = s[i - Math.floor(M / 2)];
    const Px = new Array(M).fill(0);
    for (let row = 0; row < M; row++) { let sum = 0; for (let col = 0; col < M; col++) sum += Pmat[row][col] * x[col]; Px[row] = sum; }
    let xTPx = 0; for (let k = 0; k < M; k++) xTPx += x[k] * Px[k];
    const dn = Math.max(lambda + xTPx, 1e-12); const K = Px.map(v => v / dn);
    let y = 0; for (let k = 0; k < M; k++) y += w[k] * x[k];
    const e = d - y; mse.push(e * e);
    for (let k = 0; k < M; k++) w[k] += K[k] * e;
    const xTP = new Array(M).fill(0);
    for (let col = 0; col < M; col++) { let sum = 0; for (let row = 0; row < M; row++) sum += x[row] * Pmat[row][col]; xTP[col] = sum; }
    const newP = Array.from({ length: M }, () => new Array(M).fill(0));
    for (let row = 0; row < M; row++) for (let col = 0; col < M; col++) newP[row][col] = (Pmat[row][col] - K[row] * xTP[col]) / Math.max(lambda, 1e-12);
    Pmat = newP; w.forEach((wi, j) => w_history[j].push(wi));
  }
  return { mse, weights: w_history, iterations: Array.from({ length: mse.length }, (_, i) => i + 1), finalWeights: w };
}

export function runRLS_Prediction(N, Porder, lambda, delta, seed = Date.now()) {
  const random = createRng(seed);
  const v = Array.from({ length: N }, () => (random() - 0.5) * 0.5);
  const u = new Array(N).fill(0); u[0] = 0.5; u[1] = 1.0;
  for (let i = 2; i < N; i++) u[i] = 0.75 * u[i - 1] - 0.5 * u[i - 2] + v[i];
  let w = new Array(Porder).fill(0);
  let Pmat = Array.from({ length: Porder }, (_, i) => Array.from({ length: Porder }, (_, j) => i === j ? 1 / Math.max(delta, 1e-9) : 0));
  const mse = [], w_history = Array.from({ length: Porder }, () => []);
  for (let i = Porder; i < N; i++) {
    const x = u.slice(i - Porder, i).reverse(); const d = u[i];
    const Px = new Array(Porder).fill(0);
    for (let row = 0; row < Porder; row++) { let sum = 0; for (let col = 0; col < Porder; col++) sum += Pmat[row][col] * x[col]; Px[row] = sum; }
    let xTPx = 0; for (let k = 0; k < Porder; k++) xTPx += x[k] * Px[k];
    const dn = Math.max(lambda + xTPx, 1e-12); const K = Px.map(v => v / dn);
    let y = 0; for (let k = 0; k < Porder; k++) y += w[k] * x[k];
    const e = d - y; mse.push(e * e);
    for (let k = 0; k < Porder; k++) w[k] += K[k] * e;
    const xTP = new Array(Porder).fill(0);
    for (let col = 0; col < Porder; col++) { let sum = 0; for (let row = 0; row < Porder; row++) sum += x[row] * Pmat[row][col]; xTP[col] = sum; }
    const newP = Array.from({ length: Porder }, () => new Array(Porder).fill(0));
    for (let row = 0; row < Porder; row++) for (let col = 0; col < Porder; col++) newP[row][col] = (Pmat[row][col] - K[row] * xTP[col]) / Math.max(lambda, 1e-12);
    Pmat = newP; w.forEach((wi, j) => w_history[j].push(wi));
  }
  return { mse, weights: w_history, iterations: Array.from({ length: mse.length }, (_, i) => i + 1), signal: u.slice(0, 300), finalWeights: w };
}
