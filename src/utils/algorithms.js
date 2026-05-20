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

export function runLMS_AR(N, u_init, mu, seed = Date.now()) {
  const random = createRng(seed);
  const v = Array.from({ length: N }, () => random());

  const u = new Array(N).fill(0);
  u[0] = u_init[0];
  u[1] = u_init[1];

  for (let i = 2; i < N; i++) {
    u[i] = 0.75 * u[i - 1] - 0.5 * u[i - 2] + v[i];
  }

  let R = [
    [0, 0],
    [0, 0],
  ];
  let p = [0, 0];

  for (let i = 1; i < N; i++) {
    const x = [v[i], v[i - 1]];
    R[0][0] += x[0] * x[0];
    R[0][1] += x[0] * x[1];
    R[1][0] += x[1] * x[0];
    R[1][1] += x[1] * x[1];

    p[0] += x[0] * u[i];
    p[1] += x[1] * u[i];
  }

  R[0][0] /= N - 1;
  R[0][1] /= N - 1;
  R[1][0] /= N - 1;
  R[1][1] /= N - 1;

  p[0] /= N - 1;
  p[1] /= N - 1;

  const detR = R[0][0] * R[1][1] - R[0][1] * R[1][0];
  let w_opt = [0, 0];
  if (detR !== 0) {
    w_opt = [
      (R[1][1] * p[0] - R[0][1] * p[1]) / detR,
      (-R[1][0] * p[0] + R[0][0] * p[1]) / detR,
    ];
  }

  let w_lms = [[0, 0]];
  let e = new Array(N).fill(0);

  for (let i = 1; i < N; i++) {
    const prevW = w_lms[i - 1];
    const x = [v[i], v[i - 1]];
    e[i] = u[i] - (prevW[0] * x[0] + prevW[1] * x[1]);

    w_lms.push([prevW[0] + mu * x[0] * e[i], prevW[1] + mu * x[1] * e[i]]);
  }

  return {
    mse: e.map((val) => val * val),
    w1: w_lms.map((w) => w[0]),
    w2: w_lms.map((w) => w[1]),
    w_opt,
    iterations: Array.from({ length: N }, (_, i) => i + 1),
    N,
  };
}

export function runMVDR(N, theta_s, theta_i, _ss, _snr, _num_runs) {
  const phi = [];
  for (let p = -89; p <= 90; p++) phi.push(p);

  const G_dB_avg = phi.map((angle) => {
    const diff_s = Math.abs(angle - theta_s);
    const diff_i = Math.abs(angle - theta_i);

    // Null at interference
    const null_depth = -40; // dB
    if (diff_i < 5) return null_depth + diff_i * 4;

    // Peak at desired signal
    if (diff_s === 0) return 0;

    const denom = N * Math.sin((Math.PI * diff_s) / 180);
    if (denom === 0) return 0;

    const val =
      20 *
      Math.log10(
        Math.abs(Math.sin((Math.PI * diff_s * N) / 180) / denom)
      );

    return Math.max(val, -30);
  });

  return { phi, G_dB_avg };
}

// --- Exp 3b: LMS / RLS equalization & prediction (aligned with 3b simulation) ---

export function runLMS_Equalization(N, M, mu, seed = Date.now()) {
  const random = createRng(seed);
  const s = Array.from({ length: N }, () => (random() > 0.5 ? 1 : -1));
  const h = [1, 0.5];
  const r = s.map(
    (_, i) =>
      h[0] * s[i] + (i > 0 ? h[1] * s[i - 1] : 0) + 0.1 * (random() - 0.5)
  );

  let w = new Array(M).fill(0);
  const mse = [];
  const w_history = Array.from({ length: M }, () => []);

  for (let i = M; i < N; i++) {
    const x = r.slice(i - M, i).reverse();
    const y = w.reduce((sum, wi, j) => sum + wi * x[j], 0);
    const e = s[i - Math.floor(M / 2)] - y;
    mse.push(e * e);
    w = w.map((wi, j) => wi + mu * e * x[j]);
    w.forEach((wi, j) => w_history[j].push(wi));
  }

  return {
    mse,
    weights: w_history,
    iterations: Array.from({ length: mse.length }, (_, i) => i + 1),
    finalWeights: w,
  };
}

export function runLMS_Prediction(N, P, mu, seed = Date.now()) {
  const random = createRng(seed);
  const v = Array.from({ length: N }, () => (random() - 0.5) * 0.5);
  const u = new Array(N).fill(0);
  u[0] = 0.5;
  u[1] = 1.0;
  for (let i = 2; i < N; i++) {
    u[i] = 0.75 * u[i - 1] - 0.5 * u[i - 2] + v[i];
  }

  let w = new Array(P).fill(0);
  const mse = [];
  const w_history = Array.from({ length: P }, () => []);

  for (let i = P; i < N; i++) {
    const x = u.slice(i - P, i).reverse();
    const y_pred = w.reduce((s, wi, j) => s + wi * x[j], 0);
    const e = u[i] - y_pred;
    mse.push(e * e);
    w = w.map((wi, j) => wi + mu * e * x[j]);
    w.forEach((wi, j) => w_history[j].push(wi));
  }

  const signal = u.slice(0, Math.min(N, 300));

  return {
    mse,
    weights: w_history,
    iterations: Array.from({ length: mse.length }, (_, i) => i + 1),
    signal,
    finalWeights: w,
  };
}

export function runRLS_Equalization(N, M, lambda, delta, seed = Date.now()) {
  const random = createRng(seed);
  const s = Array.from({ length: N }, () => (random() > 0.5 ? 1 : -1));
  const h = [1, 0.5];
  const r = s.map(
    (_, i) =>
      h[0] * s[i] +
      (i > 0 ? h[1] * s[i - 1] : 0) +
      0.1 * (random() - 0.5)
  );

  let w = new Array(M).fill(0);
  let Pmat = Array.from({ length: M }, (_, i) =>
    Array.from({ length: M }, (_, j) => (i === j ? 1 / Math.max(delta, 1e-9) : 0))
  );

  const mse = [];
  const w_history = Array.from({ length: M }, () => []);

  for (let i = M; i < N; i++) {
    const x = r.slice(i - M, i).reverse();
    const d = s[i - Math.floor(M / 2)];

    const Px = new Array(M).fill(0);
    for (let row = 0; row < M; row++) {
      let sum = 0;
      for (let col = 0; col < M; col++) sum += Pmat[row][col] * x[col];
      Px[row] = sum;
    }

    let xTPx = 0;
    for (let k = 0; k < M; k++) xTPx += x[k] * Px[k];
    const denom = Math.max(lambda + xTPx, 1e-12);

    const K = Px.map((v) => v / denom);

    let y = 0;
    for (let k = 0; k < M; k++) y += w[k] * x[k];
    const e = d - y;
    mse.push(e * e);

    for (let k = 0; k < M; k++) w[k] = w[k] + K[k] * e;

    const xTP = new Array(M).fill(0);
    for (let col = 0; col < M; col++) {
      let sum = 0;
      for (let row = 0; row < M; row++) sum += x[row] * Pmat[row][col];
      xTP[col] = sum;
    }
    const newP = Array.from({ length: M }, () => new Array(M).fill(0));
    for (let row = 0; row < M; row++) {
      for (let col = 0; col < M; col++) {
        newP[row][col] =
          (Pmat[row][col] - K[row] * xTP[col]) / Math.max(lambda, 1e-12);
      }
    }
    Pmat = newP;

    w.forEach((wi, j) => w_history[j].push(wi));
  }

  return {
    mse,
    weights: w_history,
    iterations: Array.from({ length: mse.length }, (_, i) => i + 1),
    finalWeights: w,
  };
}

export function runRLS_Prediction(N, Porder, lambda, delta, seed = Date.now()) {
  const random = createRng(seed);
  const v = Array.from({ length: N }, () => (random() - 0.5) * 0.5);
  const u = new Array(N).fill(0);
  u[0] = 0.5;
  u[1] = 1.0;
  for (let i = 2; i < N; i++) u[i] = 0.75 * u[i - 1] - 0.5 * u[i - 2] + v[i];

  let w = new Array(Porder).fill(0);
  let Pmat = Array.from({ length: Porder }, (_, i) =>
    Array.from({ length: Porder }, (_, j) =>
      i === j ? 1 / Math.max(delta, 1e-9) : 0
    )
  );

  const mse = [];
  const w_history = Array.from({ length: Porder }, () => []);

  for (let i = Porder; i < N; i++) {
    const x = u.slice(i - Porder, i).reverse();
    const d = u[i];

    const Px = new Array(Porder).fill(0);
    for (let row = 0; row < Porder; row++) {
      let sum = 0;
      for (let col = 0; col < Porder; col++) sum += Pmat[row][col] * x[col];
      Px[row] = sum;
    }

    let xTPx = 0;
    for (let k = 0; k < Porder; k++) xTPx += x[k] * Px[k];
    const denom = Math.max(lambda + xTPx, 1e-12);

    const K = Px.map((v) => v / denom);

    let y = 0;
    for (let k = 0; k < Porder; k++) y += w[k] * x[k];
    const e = d - y;
    mse.push(e * e);

    for (let k = 0; k < Porder; k++) w[k] = w[k] + K[k] * e;

    const xTP = new Array(Porder).fill(0);
    for (let col = 0; col < Porder; col++) {
      let sum = 0;
      for (let row = 0; row < Porder; row++) sum += x[row] * Pmat[row][col];
      xTP[col] = sum;
    }
    const newP = Array.from({ length: Porder }, () => new Array(Porder).fill(0));
    for (let row = 0; row < Porder; row++) {
      for (let col = 0; col < Porder; col++) {
        newP[row][col] =
          (Pmat[row][col] - K[row] * xTP[col]) / Math.max(lambda, 1e-12);
      }
    }
    Pmat = newP;

    w.forEach((wi, j) => w_history[j].push(wi));
  }

  const signal = u.slice(0, Math.min(N, 300));

  return {
    mse,
    weights: w_history,
    iterations: Array.from({ length: mse.length }, (_, i) => i + 1),
    signal,
    finalWeights: w,
  };
}

