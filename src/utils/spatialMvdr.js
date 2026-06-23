// Spatial ULA MVDR beamformer (ported from asp-6-demo-completed)

function hashToSeed(parts) {
  let h = 2166136261;
  for (const part of parts) {
    const s = String(part);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
  }
  return h >>> 0;
}

function buildMvdrSeed(cleanECG, noiseParams, numSensors, thetaS, thetaI, diagLoad, sampleRate) {
  const parts = [
    numSensors,
    thetaS,
    thetaI,
    diagLoad,
    sampleRate,
    cleanECG.length,
    noiseParams.enableBW ? 1 : 0,
    noiseParams.enablePL ? 1 : 0,
    noiseParams.enableEMG ? 1 : 0,
    noiseParams.ampBW,
    noiseParams.ampPL,
    noiseParams.varEMG,
  ];
  const stride = Math.max(1, Math.floor(cleanECG.length / 32));
  for (let i = 0; i < cleanECG.length; i += stride) {
    parts.push(Number(cleanECG[i].toFixed(6)));
  }
  return hashToSeed(parts);
}

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Complex {
  constructor(re, im = 0) {
    this.re = re;
    this.im = im;
  }

  add(other) {
    return new Complex(this.re + other.re, this.im + other.im);
  }

  sub(other) {
    return new Complex(this.re - other.re, this.im - other.im);
  }

  mul(other) {
    if (typeof other === "number") {
      return new Complex(this.re * other, this.im * other);
    }
    return new Complex(
      this.re * other.re - this.im * other.im,
      this.re * other.im + this.im * other.re
    );
  }

  div(other) {
    if (typeof other === "number") {
      return new Complex(this.re / other, this.im / other);
    }
    const denom = other.re * other.re + other.im * other.im;
    if (denom === 0) return new Complex(0, 0);
    return new Complex(
      (this.re * other.re + this.im * other.im) / denom,
      (this.im * other.re - this.re * other.im) / denom
    );
  }

  conj() {
    return new Complex(this.re, -this.im);
  }

  abs() {
    return Math.sqrt(this.re * this.re + this.im * this.im);
  }

  static fromAngle(theta) {
    return new Complex(Math.cos(theta), Math.sin(theta));
  }
}

function invertComplexMatrix(R) {
  const n = R.length;
  const M = Array.from({ length: n }, (_, i) => {
    const row = [];
    for (let j = 0; j < n; j++) row.push(new Complex(R[i][j].re, R[i][j].im));
    for (let j = 0; j < n; j++) row.push(new Complex(j === i ? 1 : 0, 0));
    return row;
  });

  for (let i = 0; i < n; i++) {
    let maxRow = i;
    let maxVal = M[i][i].abs();
    for (let k = i + 1; k < n; k++) {
      const val = M[k][i].abs();
      if (val > maxVal) {
        maxVal = val;
        maxRow = k;
      }
    }
    if (maxRow !== i) {
      const temp = M[i];
      M[i] = M[maxRow];
      M[maxRow] = temp;
    }
    const pivot = M[i][i];
    if (pivot.abs() < 1e-10) {
      return Array.from({ length: n }, (_, r) =>
        Array.from({ length: n }, (_, c) => new Complex(r === c ? 1 : 0, 0))
      );
    }
    for (let j = i; j < 2 * n; j++) M[i][j] = M[i][j].div(pivot);
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = M[k][i];
        for (let j = i; j < 2 * n; j++) {
          M[k][j] = M[k][j].sub(M[i][j].mul(factor));
        }
      }
    }
  }

  return M.map((row) => row.slice(n));
}

export function getSNRdB(signal, noisyOrFiltered) {
  const N = Math.min(signal.length, noisyOrFiltered.length);
  if (N === 0) return 0;

  let sigMean = 0;
  for (let i = 0; i < N; i++) sigMean += signal[i];
  sigMean /= N;

  let sigPower = 0;
  let noisePower = 0;
  for (let i = 0; i < N; i++) {
    const s = signal[i] - sigMean;
    const n = noisyOrFiltered[i] - signal[i];
    sigPower += s * s;
    noisePower += n * n;
  }

  if (noisePower === 0) return 99.9;
  if (sigPower === 0) return -99.9;
  return 10 * Math.log10(sigPower / noisePower);
}

export function buildNoiseParams(noise) {
  return {
    enableBW: noise.baseline,
    ampBW: 0.2,
    freqBW: 0.33,
    enablePL: noise.powerline,
    ampPL: 0.05,
    freqPL: 50,
    enableEMG: noise.emg,
    varEMG: 0.04,
  };
}

export function runSpatialMVDR(
  cleanECG,
  noiseParams,
  numSensors = 4,
  thetaS = 0,
  thetaI = 30,
  diagLoad = 0.01,
  sampleRate = 500
) {
  const N = cleanECG.length;
  const radS = (thetaS * Math.PI) / 180;
  const radI = (thetaI * Math.PI) / 180;

  const d_s = [];
  const d_i = [];
  for (let k = 0; k < numSensors; k++) {
    d_s.push(Complex.fromAngle(-k * Math.PI * Math.sin(radS)));
    d_i.push(Complex.fromAngle(-k * Math.PI * Math.sin(radI)));
  }

  const s = cleanECG;
  const ampI = noiseParams.enablePL
    ? noiseParams.ampPL
    : noiseParams.enableBW
      ? noiseParams.ampBW
      : 1.0;
  const freqI = noiseParams.enablePL ? noiseParams.freqPL : 50;
  const interference = Array.from(
    { length: N },
    (_, n) => ampI * Math.sin(2 * Math.PI * freqI * (n / sampleRate))
  );

  const rng = createSeededRandom(
    buildMvdrSeed(cleanECG, noiseParams, numSensors, thetaS, thetaI, diagLoad, sampleRate)
  );

  const x = Array.from({ length: N }, () => Array(numSensors));
  for (let n = 0; n < N; n++) {
    for (let k = 0; k < numSensors; k++) {
      const sigPart = d_s[k].mul(s[n]);
      const intPart = d_i[k].mul(interference[n]);
      const u1 = rng() || 0.0001;
      const u2 = rng() || 0.0001;
      const noiseAmp = noiseParams.enableEMG ? Math.sqrt(noiseParams.varEMG) : 0.1;
      const standardNormalRe = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      const standardNormalIm = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
      const noisePart = new Complex(standardNormalRe * noiseAmp, standardNormalIm * noiseAmp);
      x[n][k] = sigPart.add(intPart).add(noisePart);
    }
  }

  const R = Array.from({ length: numSensors }, () =>
    Array.from({ length: numSensors }, () => new Complex(0, 0))
  );

  for (let i = 0; i < numSensors; i++) {
    for (let j = 0; j < numSensors; j++) {
      let sum = new Complex(0, 0);
      for (let n = 0; n < N; n++) {
        sum = sum.add(x[n][i].mul(x[n][j].conj()));
      }
      R[i][j] = sum.div(N);
    }
  }

  const rawR = R.map((row) => row.map((c) => c.abs()));

  for (let i = 0; i < numSensors; i++) {
    R[i][i] = R[i][i].add(new Complex(diagLoad, 0));
  }

  const R_inv = invertComplexMatrix(R);

  const num = [];
  for (let k = 0; k < numSensors; k++) {
    let sum = new Complex(0, 0);
    for (let j = 0; j < numSensors; j++) {
      sum = sum.add(R_inv[k][j].mul(d_s[j]));
    }
    num.push(sum);
  }

  let denom = new Complex(0, 0);
  for (let k = 0; k < numSensors; k++) {
    denom = denom.add(d_s[k].conj().mul(num[k]));
  }

  const w = num.map((val) => val.div(denom));

  const y = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    let sum = new Complex(0, 0);
    for (let k = 0; k < numSensors; k++) {
      sum = sum.add(w[k].conj().mul(x[n][k]));
    }
    y[n] = sum.re;
  }

  const beamPattern = [];
  const angles = [];
  for (let angle = -90; angle <= 90; angle += 1) {
    const rad = (angle * Math.PI) / 180;
    let sum = new Complex(0, 0);
    for (let k = 0; k < numSensors; k++) {
      const a_k = Complex.fromAngle(-k * Math.PI * Math.sin(rad));
      sum = sum.add(w[k].conj().mul(a_k));
    }
    angles.push(angle);
    beamPattern.push(sum.abs() * sum.abs());
  }

  return {
    filtered: Array.from(y),
    beamPattern,
    angles,
    weights: w.map((c) => ({ re: c.re, im: c.im })),
    covariance: rawR,
    numSensors,
    thetaS,
    thetaI,
    diagLoad,
  };
}
