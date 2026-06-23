import { matrix, inv, multiply } from "mathjs";
import { estimateACF } from "./stochastic.js";

// Theory §3.1 — AR(p): x[n] = Σ_{k=1}^p a_k x[n−k] + w[n]

function buildToeplitz(R, p) {
  const rows = [];
  for (let i = 0; i < p; i++) {
    const row = [];
    for (let j = 0; j < p; j++) row.push(R[Math.abs(i - j)]);
    rows.push(row);
  }
  return matrix(rows);
}

// Theory §3.3 — Yule-Walker: R·a = −r,  a = −R⁻¹r
export function yuleWalker(R, p) {
  const Rmat = buildToeplitz(R, p);
  const rVec = [];
  for (let k = 1; k <= p; k++) rVec.push(R[k]);
  const rCol = matrix(rVec.map((v) => [v]));
  const aCol = multiply(-1, multiply(inv(Rmat), rCol));
  const a = aCol.toArray().flat();
  // Theory §3.3 — σ²_w = R_x[0] + aᵀr
  const sigma2_w = R[0] + a.reduce((s, ak, i) => s + ak * rVec[i], 0);
  return { a, sigma2_w: Math.max(sigma2_w, 1e-12) };
}

// Theory §3.2.1 — Stability: roots of A(z)=1−Σ a_k z^{−k} strictly inside unit circle
export function checkARStability(a) {
  const p = a.length;
  const coeffs = [1, ...a.map((v) => -v)];
  const companion = Array.from({ length: p }, () => Array(p).fill(0));
  for (let i = 0; i < p - 1; i++) companion[i][i + 1] = 1;
  for (let j = 0; j < p; j++) companion[p - 1][j] = -coeffs[p - j];
  const roots = companionEigenvalues(companion);
  const maxMod = Math.max(...roots.map((z) => Math.hypot(z.re, z.im)));
  return { stable: maxMod < 1, maxRootModulus: maxMod, roots };
}

function companionEigenvalues(C) {
  const n = C.length;
  if (n === 1) return [{ re: C[0][0], im: 0 }];
  if (n === 2) {
    const a = C[0][0], b = C[0][1], c = C[1][0], d = C[1][1];
    const tr = a + d;
    const det = a * d - b * c;
    const disc = tr * tr - 4 * det;
    if (disc >= 0) {
      const s = Math.sqrt(disc);
      return [{ re: (tr + s) / 2, im: 0 }, { re: (tr - s) / 2, im: 0 }];
    }
    return [{ re: tr / 2, im: Math.sqrt(-disc) / 2 }, { re: tr / 2, im: -Math.sqrt(-disc) / 2 }];
  }
  const maxIter = 80;
  let A = C.map((row) => [...row]);
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    for (let i = 0; i < n - 1; i++) {
      if (Math.abs(A[i + 1][i]) < 1e-12) continue;
      const ratios = [];
      for (let k = i; k < n; k++) ratios.push(A[k][i] / A[i + 1][i]);
      for (let k = i; k < n; k++) {
        for (let j = 0; j < n; j++) A[k][j] -= ratios[k - i] * A[i + 1][j];
      }
      changed = true;
    }
    if (!changed) break;
  }
  const roots = [];
  for (let i = 0; i < n; i++) roots.push({ re: A[i][i], im: 0 });
  return roots;
}

// Theory §3.2.2 — S_x(e^jω) = σ²_w / |A(e^jω)|²
export function arPSD(a, sigma2_w, fs, nfft = 512) {
  const freqs = [];
  const psd = [];
  for (let m = 0; m <= nfft / 2; m++) {
    const omega = (2 * Math.PI * m) / nfft;
    let re = 1;
    let im = 0;
    for (let k = 1; k <= a.length; k++) {
      re -= a[k - 1] * Math.cos(omega * k);
      im += a[k - 1] * Math.sin(omega * k);
    }
    const denom = re * re + im * im + 1e-18;
    freqs.push((m * fs) / nfft);
    psd.push(sigma2_w / denom);
  }
  return { freqs, psd };
}

// Theory §3.4 — AIC(p) = N·ln(σ²_w(p)) + 2p;  BIC(p) = N·ln(σ²_w(p)) + p·ln(N)
export function selectAROrder(x, pMin = 2, pMax = 12) {
  const N = x.length;
  const maxLag = pMax + 2;
  const R = estimateACF(x, maxLag);
  const orders = [];
  for (let p = pMin; p <= pMax; p++) {
    const { a, sigma2_w } = yuleWalker(R, p);
    const stability = checkARStability(a);
    const aic = N * Math.log(sigma2_w) + 2 * p;
    const bic = N * Math.log(sigma2_w) + p * Math.log(N);
    orders.push({ p, a, sigma2_w, aic, bic, stable: stability.stable });
  }
  const stableOrders = orders.filter((o) => o.stable);
  const pool = stableOrders.length ? stableOrders : orders;
  const bestAic = pool.reduce((b, o) => (o.aic < b.aic ? o : b), pool[0]);
  const bestBic = pool.reduce((b, o) => (o.bic < b.bic ? o : b), pool[0]);
  return { orders, pAic: bestAic.p, pBic: bestBic.p, bestAic, bestBic };
}

// Theory §3 — Stage 1 AR(p) fit on clean x[n]
export function fitAR(x, p) {
  const R = estimateACF(x, p + 2);
  const { a, sigma2_w } = yuleWalker(R, p);
  const stability = checkARStability(a);
  return { a, sigma2_w, R, stability, p };
}
