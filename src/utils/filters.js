function clampNumber(n, min, max) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function calculateMSE(reference, filtered) {
  if (!Array.isArray(reference) || !Array.isArray(filtered)) return 0;
  const n = Math.min(reference.length, filtered.length);
  if (n === 0) return 0;
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const e = reference[i] - filtered[i];
    acc += e * e;
  }
  return acc / n;
}

export function filterSignalLMS(noisy, reference, options = {}) {
  const { filterOrder, stepSize, returnDiagnostics = false } = options;
  if (!Array.isArray(noisy) || noisy.length === 0) {
    return returnDiagnostics ? { Yfiltered: [], diagnostics: {} } : [];
  }
  if (!Array.isArray(reference) || reference.length === 0) {
    return returnDiagnostics ? { Yfiltered: [], diagnostics: {} } : [];
  }

  const N = Math.min(noisy.length, reference.length);
  const M = Math.max(1, Math.min(256, Math.floor(filterOrder ?? 1)));

  const p_u = noisy.reduce((acc, v) => acc + v * v, 0) / noisy.length;
  const requestedMu = Number(stepSize);
  const mu = Number.isFinite(requestedMu) && requestedMu > 0 ? requestedMu : 0.01;

  const w = new Array(M).fill(0);
  const yFiltered = new Array(N).fill(0);
  const yNoise = returnDiagnostics ? new Array(N).fill(0) : null;
  const weightsHistory = returnDiagnostics ? [] : null;

  for (let n = 0; n < N; n++) {
    const xVec = new Array(M);
    for (let k = 0; k < M; k++) {
      const idx = n - k;
      xVec[k] = idx >= 0 ? noisy[idx] : 0;
    }

    let y = 0;
    for (let k = 0; k < M; k++) y += w[k] * xVec[k];

    const d = reference[n];
    const e = d - y;
    yFiltered[n] = e;

    if (returnDiagnostics) {
      yNoise[n] = y;
      weightsHistory.push(w.slice());
    }

    const gain = mu * e;
    for (let k = 0; k < M; k++) w[k] += gain * xVec[k];
  }

  if (returnDiagnostics) {
    return {
      Yfiltered: yFiltered,
      yNoise,
      diagnostics: { weightsHistory, signalPower: p_u, muUsed: mu },
    };
  }

  return yFiltered;
}
