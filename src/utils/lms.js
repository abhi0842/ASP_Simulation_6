// Theory §4 — LMS adaptive filter

function outerSum(samples, M) {
  const R = Array.from({ length: M }, () => Array(M).fill(0));
  const p = Array(M).fill(0);
  const N = samples.length;
  for (let n = 0; n < N; n++) {
    const xn = samples[n].x;
    const dn = samples[n].d;
    for (let i = 0; i < M; i++) {
      p[i] += dn * xn[i];
      for (let j = 0; j < M; j++) R[i][j] += xn[i] * xn[j];
    }
  }
  for (let i = 0; i < M; i++) {
    p[i] /= N;
    for (let j = 0; j < M; j++) R[i][j] /= N;
  }
  return { R, p };
}

function matVec(R, v) {
  return R.map((row, i) => row.reduce((s, rij, j) => s + rij * v[j], 0));
}

function solveLinear(R, b) {
  const M = b.length;
  const A = R.map((row) => [...row]);
  const x = [...b];
  for (let i = 0; i < M; i++) {
    let pivot = i;
    for (let r = i + 1; r < M; r++) {
      if (Math.abs(A[r][i]) > Math.abs(A[pivot][i])) pivot = r;
    }
    [A[i], A[pivot]] = [A[pivot], A[i]];
    [x[i], x[pivot]] = [x[pivot], x[i]];
    const div = A[i][i] || 1e-12;
    for (let j = i; j < M; j++) A[i][j] /= div;
    x[i] /= div;
    for (let r = 0; r < M; r++) {
      if (r === i) continue;
      const factor = A[r][i];
      for (let j = i; j < M; j++) A[r][j] -= factor * A[i][j];
      x[r] -= factor * x[i];
    }
  }
  return x;
}

function eigenSymmetric(R) {
  const M = R.length;
  const A = R.map((row) => [...row]);
  const V = Array.from({ length: M }, (_, i) => {
    const row = Array(M).fill(0);
    row[i] = 1;
    return row;
  });
  for (let iter = 0; iter < 50; iter++) {
    let p = 0, q = 1;
    let max = Math.abs(A[0][1]);
    for (let i = 0; i < M; i++) {
      for (let j = i + 1; j < M; j++) {
        if (Math.abs(A[i][j]) > max) { max = Math.abs(A[i][j]); p = i; q = j; }
      }
    }
    if (max < 1e-10) break;
    const phi = 0.5 * Math.atan2(2 * A[p][q], A[q][q] - A[p][p]);
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    const App = A[p][p], Aqq = A[q][q], Apq = A[p][q];
    A[p][p] = c * c * App - 2 * s * c * Apq + s * s * Aqq;
    A[q][q] = s * s * App + 2 * s * c * Apq + c * c * Aqq;
    A[p][q] = A[q][p] = 0;
    for (let k = 0; k < M; k++) {
      if (k !== p && k !== q) {
        const Akp = A[k][p], Akq = A[k][q];
        A[k][p] = A[p][k] = c * Akp - s * Akq;
        A[k][q] = A[q][k] = s * Akp + c * Akq;
      }
    }
    for (let k = 0; k < M; k++) {
      const Vkp = V[k][p], Vkq = V[k][q];
      V[k][p] = c * Vkp - s * Vkq;
      V[k][q] = s * Vkp + c * Vkq;
    }
  }
  const eigenvalues = Array.from({ length: M }, (_, i) => A[i][i]);
  return { eigenvalues, eigenvectors: V };
}

// Theory §4.2 — w_opt = R⁻¹p,  J_min = σ²_d − pᵀw_opt
export function wienerHopf(R, p, sigma2_d) {
  const w_opt = solveLinear(R, p);
  const pTw = p.reduce((s, pi, i) => s + pi * w_opt[i], 0);
  const J_min = Math.max(sigma2_d - pTw, 1e-12);
  return { w_opt, J_min };
}

// Theory §4.4.1 — 0 < μ < 1/λ_max; conservative 1/(M·P_x)
export function checkLMSStability(mu, R, M) {
  const { eigenvalues } = eigenSymmetric(R);
  const lambda_max = Math.max(...eigenvalues);
  const lambda_min = Math.min(...eigenvalues);
  const Px = R[0][0];
  const boundExact = 1 / (lambda_max + 1e-18);
  const boundConservative = 1 / (M * (Px + 1e-18));
  const stable = mu > 0 && mu < boundExact;
  return { eigenvalues, lambda_max, lambda_min, boundExact, boundConservative, stable, Px };
}

// Theory §4.4.2 — τ_k = 1/(4μλ_k);  χ(R) = λ_max/λ_min
export function lmsConvergenceMetrics(mu, eigenvalues) {
  const lambda_max = Math.max(...eigenvalues);
  const lambda_min = Math.min(...eigenvalues);
  const tau_k = eigenvalues.map((lk) => 1 / (4 * mu * (lk + 1e-18)));
  const chi = lambda_max / (lambda_min + 1e-18);
  const n_c = 1 / (4 * mu * (lambda_min + 1e-18));
  return { tau_k, chi, n_c, lambda_max, lambda_min };
}

// Theory §4.4.3 — J(∞) ≈ J_min/(1−μ·tr(R));  M = μ·tr(R)
export function steadyStateMSE(J_min, mu, eigenvalues) {
  const trR = eigenvalues.reduce((s, l) => s + l, 0);
  const muTrR = mu * trR;
  const J_inf = J_min / Math.max(1 - muTrR, 1e-6);
  const misadjustment = muTrR;
  return { J_inf, misadjustment, trR };
}

function buildRegression(d, M) {
  const N = d.length;
  const xReg = [];
  for (let n = M; n < N; n++) {
    const xn = [];
    for (let k = 1; k <= M; k++) xn.push(d[n - k]);
    xReg.push({ x: xn, d: d[n] });
  }
  return xReg;
}

// Theory §4.3 — y[n]=wᵀx[n], e[n]=d[n]−y[n], w[n+1]=w[n]+2μe[n]x[n]
export function runLMS(d, M, mu, maxIter = null) {
  const xReg = buildRegression(d, M);
  if (!xReg.length) {
    return { w: [], errors: [], wHistory: [], y: [], w_opt: [], J_min: 0 };
  }

  const samples = xReg.map((s) => ({ x: s.x, d: s.d }));
  const { R, p } = outerSum(samples, M);
  const sigma2_d = samples.reduce((s, s_) => s + s_.d * s_.d, 0) / samples.length;
  const { w_opt, J_min } = wienerHopf(R, p, sigma2_d);
  const stability = checkLMSStability(mu, R, M);
  const conv = lmsConvergenceMetrics(mu, stability.eigenvalues);
  const ss = steadyStateMSE(J_min, mu, stability.eigenvalues);

  const w = Array(M).fill(0);
  const errors = [];
  const wHistory = [];
  const yOut = [];
  const limit = maxIter ?? samples.length;

  for (let n = 0; n < Math.min(limit, samples.length); n++) {
    const xn = samples[n].x;
    const dn = samples[n].d;
    // Theory §4.3 Step 1 — y[n] = wᵀ[n]x[n]
    const yn = w.reduce((s, wk, k) => s + wk * xn[k], 0);
    // Theory §4.3 Step 2 — e[n] = d[n] − y[n]
    const en = dn - yn;
    errors.push(en * en);
    yOut.push(yn);
    wHistory.push([...w]);
    // Theory §4.3 Step 3 — w[n+1] = w[n] + 2μe[n]x[n]
    for (let k = 0; k < M; k++) w[k] += 2 * mu * en * xn[k];
  }

  return {
    w,
    w_opt,
    w_target: w_opt,
    errors,
    wHistory,
    y: yOut,
    R,
    p,
    J_min,
    stability,
    conv,
    ss,
    sigma2_d,
  };
}

export function estimateLMSStats(d, M) {
  const xReg = buildRegression(d, M);
  const samples = xReg.map((s) => ({ x: s.x, d: s.d }));
  if (!samples.length) return null;
  const { R, p } = outerSum(samples, M);
  const sigma2_d = samples.reduce((s, s_) => s + s_.d * s_.d, 0) / samples.length;
  const { w_opt, J_min } = wienerHopf(R, p, sigma2_d);
  const stability = checkLMSStability(0.001, R, M);
  return { R, p, w_opt, J_min, sigma2_d, stability };
}
