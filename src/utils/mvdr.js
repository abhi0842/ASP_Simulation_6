// Theory §5 — MVDR beamformer

function matVec(A, v) {
  return A.map((row) => row.reduce((s, aij, j) => s + aij * v[j], 0));
}

function solveHermitian(R, d) {
  const M = d.length;
  const A = R.map((row) => row.map((v) => v));
  const b = [...d];
  for (let i = 0; i < M; i++) {
    let pivot = i;
    for (let r = i + 1; r < M; r++) {
      if (Math.abs(A[r][i]) > Math.abs(A[pivot][i])) pivot = r;
    }
    [A[i], A[pivot]] = [A[pivot], A[i]];
    [b[i], b[pivot]] = [b[pivot], b[i]];
    const div = A[i][i] || 1e-12;
    for (let j = i; j < M; j++) A[i][j] /= div;
    b[i] /= div;
    for (let r = 0; r < M; r++) {
      if (r === i) continue;
      const factor = A[r][i];
      for (let j = i; j < M; j++) A[r][j] -= factor * A[i][j];
      b[r] -= factor * b[i];
    }
  }
  return b;
}

function dot(a, b) {
  return a.reduce((s, v, i) => s + v * b[i], 0);
}

// Theory §5.2 — temporal snapshot x[n] = [d[n], d[n−1], …, d[n−M+1]]ᵀ
export function buildSnapshots(signal, M) {
  const snapshots = [];
  for (let n = M - 1; n < signal.length; n++) {
    const snap = [];
    for (let k = 0; k < M; k++) snap.push(signal[n - k]);
    snapshots.push(snap);
  }
  return snapshots;
}

// Theory §5.2 — steering vector d (distortionless at reference tap)
export function defaultSteeringVector(M) {
  const d = Array(M).fill(0);
  d[0] = 1;
  return d;
}

// Theory §5.6 — R̂ = (1/N) Σ x[n]xᴴ[n];  require N ≥ 2M
export function estimateCovariance(snapshots) {
  const N = snapshots.length;
  const M = snapshots[0]?.length ?? 0;
  const R = Array.from({ length: M }, () => Array(M).fill(0));
  for (const x of snapshots) {
    for (let i = 0; i < M; i++) {
      for (let j = 0; j < M; j++) R[i][j] += x[i] * x[j];
    }
  }
  for (let i = 0; i < M; i++) {
    for (let j = 0; j < M; j++) R[i][j] /= N;
  }
  const sufficientSnapshots = N >= 2 * M;
  return { R, N, M, sufficientSnapshots };
}

// Theory §5.6 — R̂_DL = R̂ + δI
export function diagonalLoading(R, delta) {
  return R.map((row, i) => row.map((v, j) => (i === j ? v + delta : v)));
}

// Theory §5.4 — w_MVDR = R⁻¹d / (dᴴR⁻¹d)
export function mvdrWeights(R, d) {
  const Rinv_d = solveHermitian(R, d);
  const denom = dot(d, Rinv_d);
  const w = Rinv_d.map((v) => v / (denom + 1e-18));
  return { w, denom };
}

// Theory §5.1 — y[n] = wᴴx[n]
export function applyBeamformer(snapshots, w) {
  return snapshots.map((x) => dot(w, x));
}

// Theory §5.5 — SINR_MVDR = σ²_s · dᴴ R⁻¹_IN d
export function computeSINR(R_IN, d, sigma2_s) {
  const Rinv_d = solveHermitian(R_IN, d);
  const dHRinvD = dot(d, Rinv_d);
  return sigma2_s * dHRinvD;
}

// Estimate R_IN as total covariance minus signal component (use residual after LMS)
export function estimateRIN(snapshots, sigma2_s, d) {
  const { R } = estimateCovariance(snapshots);
  const ddH = d.map((di) => d.map((dj) => sigma2_s * di * dj));
  return R.map((row, i) => row.map((v, j) => Math.max(v - ddH[i][j], 1e-12)));
}

export function runMVDR(signal, M, delta = 1e-3) {
  const snapshots = buildSnapshots(signal, M);
  const d = defaultSteeringVector(M);
  let { R, N, sufficientSnapshots } = estimateCovariance(snapshots);
  if (!sufficientSnapshots) {
    R = diagonalLoading(R, delta);
  } else if (delta > 0) {
    R = diagonalLoading(R, delta);
  }
  const { w } = mvdrWeights(R, d);
  const output = applyBeamformer(snapshots, w);
  const signalPower = signal.reduce((s, v) => s + v * v, 0) / signal.length;
  const R_IN = estimateRIN(snapshots, signalPower * 0.1, d);
  const sinr = computeSINR(R_IN, d, signalPower);
  return {
    w,
    d,
    R,
    output,
    snapshots,
    N,
    M,
    sufficientSnapshots,
    sinr,
    delta,
  };
}

// Covariance from AR model: Toeplitz from ACF of clean signal
export function covarianceFromACF(R_acf, M) {
  const R = Array.from({ length: M }, () => Array(M).fill(0));
  for (let i = 0; i < M; i++) {
    for (let j = 0; j < M; j++) R[i][j] = R_acf[Math.abs(i - j)];
  }
  return R;
}
