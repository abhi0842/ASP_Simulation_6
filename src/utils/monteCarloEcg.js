import { filterSignalLMS } from "./filters.js";

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

function addMuscleNoiseSeeded(signal, rng, amplitude = 0.02) {
  return signal.map((v) => v + amplitude * (rng() * 2 - 1));
}

function injectNoiseTrial(cleanSignal, fs, noise, rng) {
  let s = Array.from(cleanSignal);
  const phaseBW = rng ? rng() * 2 * Math.PI : 0;
  const phasePL = rng ? rng() * 2 * Math.PI : 0;

  if (noise.baseline) {
    s = s.map((v, i) => v + 0.2 * Math.sin(2 * Math.PI * 0.33 * (i / fs) + phaseBW));
  }
  if (noise.powerline) {
    s = s.map((v, i) => v + 0.05 * Math.sin(2 * Math.PI * 50 * (i / fs) + phasePL));
  }
  if (noise.emg) s = addMuscleNoiseSeeded(s, rng);
  return s;
}

export function aggregatePointwise(curves) {
  const N_MC = curves.length;
  if (!N_MC) return { avg: [], upper95: [], lower95: [] };
  const len = Math.min(...curves.map((c) => c.length));
  const avg = new Array(len).fill(0);
  const upper95 = new Array(len).fill(0);
  const lower95 = new Array(len).fill(0);

  for (let i = 0; i < len; i++) {
    let mean = 0;
    for (let r = 0; r < N_MC; r++) mean += curves[r][i];
    mean /= N_MC;

    let variance = 0;
    for (let r = 0; r < N_MC; r++) {
      const d = curves[r][i] - mean;
      variance += d * d;
    }
    variance = N_MC > 1 ? variance / (N_MC - 1) : 0;
    const se = Math.sqrt(variance) / Math.sqrt(N_MC);

    avg[i] = mean;
    upper95[i] = mean + 1.96 * se;
    lower95[i] = Math.max(0, mean - 1.96 * se);
  }

  return { avg, upper95, lower95 };
}

function yieldToMain() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Minimum time for progress UI so users can read each pipeline step (5–10 s). */
const MIN_PROGRESS_MS = 7500;

function runSingleTrial(cleanSignal, sampleRate, noise, mu, filterOrder, rng) {
  const N = cleanSignal.length;
  const noisy = injectNoiseTrial(cleanSignal, sampleRate, noise, rng);
  const noiseReference = noisy.map((v, i) => v - (cleanSignal[i] ?? 0));
  const lmsFiltered = filterSignalLMS(noiseReference, noisy, {
    filterOrder,
    stepSize: mu,
  });

  const sq = new Array(N);
  for (let n = 0; n < N; n++) {
    const err = (cleanSignal[n] ?? 0) - (lmsFiltered[n] ?? 0);
    sq[n] = err * err;
  }
  return sq;
}

/**
 * Monte Carlo validation for ECG denoising (LMS).
 * Produces ensemble-average per-sample squared error vs time.
 */
export function runMonteCarloEcg({
  cleanSignal,
  noise,
  sampleRate = 500,
  mu = 0.01,
  filterOrder = 32,
  N_MC = 50,
  seedKey = "default",
}) {
  const N = cleanSignal?.length ?? 0;
  if (!Array.isArray(cleanSignal) || N === 0) {
    return {
      avgMSE: [],
      upper95: [],
      lower95: [],
      confidenceUpper: [],
      confidenceLower: [],
      squaredErrorMatrix: [],
      sampleRate,
      N_MC,
    };
  }

  const baseSeed = hashToSeed([
    seedKey,
    sampleRate,
    mu,
    filterOrder,
    N,
    noise?.baseline ? 1 : 0,
    noise?.powerline ? 1 : 0,
    noise?.emg ? 1 : 0,
  ]);

  const squaredErrorCurves = [];
  for (let run = 0; run < N_MC; run++) {
    const rng = createSeededRandom((baseSeed + run * 2654435761) >>> 0);
    squaredErrorCurves.push(
      runSingleTrial(cleanSignal, sampleRate, noise, mu, filterOrder, rng)
    );
  }

  const { avg, upper95, lower95 } = aggregatePointwise(squaredErrorCurves);
  return {
    avgMSE: avg,
    upper95,
    lower95,
    confidenceUpper: upper95,
    confidenceLower: lower95,
    squaredErrorMatrix: squaredErrorCurves,
    sampleRate,
    N_MC,
  };
}

/**
 * Async Monte Carlo with progress callbacks for UI feedback.
 * onProgress({ phase, currentRun, totalRuns, activeStep, message, percent })
 */
export async function runMonteCarloEcgAsync(
  {
    cleanSignal,
    noise,
    sampleRate = 500,
    mu = 0.01,
    filterOrder = 32,
    N_MC = 50,
    seedKey = "default",
  },
  onProgress
) {
  const N = cleanSignal?.length ?? 0;
  if (!Array.isArray(cleanSignal) || N === 0) {
    return {
      avgMSE: [],
      upper95: [],
      lower95: [],
      confidenceUpper: [],
      confidenceLower: [],
      squaredErrorMatrix: [],
      sampleRate,
      N_MC,
    };
  }

  const baseSeed = hashToSeed([
    seedKey,
    sampleRate,
    mu,
    filterOrder,
    N,
    noise?.baseline ? 1 : 0,
    noise?.powerline ? 1 : 0,
    noise?.emg ? 1 : 0,
  ]);

  const squaredErrorCurves = [];
  const trialMessages = [
    "Injecting fresh noise realization onto clean ECG…",
    "Building correlated noise reference channel…",
    "Running LMS adaptive filter on trial signal…",
    "Recording instantaneous squared error e²[n]…",
  ];

  const progressSteps = N_MC * 2 + 4;
  const stepDelayMs = Math.max(50, Math.ceil(MIN_PROGRESS_MS / progressSteps));

  const tickProgress = async (update) => {
    onProgress?.(update);
    await yieldToMain();
    await delay(stepDelayMs);
  };

  await tickProgress({
    phase: "trial",
    currentRun: 0,
    totalRuns: N_MC,
    activeStep: 0,
    message: "Starting Monte Carlo simulation…",
    percent: 0,
  });

  for (let run = 0; run < N_MC; run++) {
    const activeStep = run % trialMessages.length;
    await tickProgress({
      phase: "trial",
      currentRun: run,
      totalRuns: N_MC,
      activeStep,
      message: `Trial ${run + 1} / ${N_MC}: ${trialMessages[activeStep]}`,
      percent: Math.round(((run + 0.25) / N_MC) * 85),
    });

    const rng = createSeededRandom((baseSeed + run * 2654435761) >>> 0);
    squaredErrorCurves.push(
      runSingleTrial(cleanSignal, sampleRate, noise, mu, filterOrder, rng)
    );

    await tickProgress({
      phase: "trial",
      currentRun: run + 1,
      totalRuns: N_MC,
      activeStep: 3,
      message: `Trial ${run + 1} / ${N_MC}: Recording squared error curve…`,
      percent: Math.round(((run + 1) / N_MC) * 85),
    });
  }

  await tickProgress({
    phase: "aggregate",
    currentRun: N_MC,
    totalRuns: N_MC,
    activeStep: 4,
    message: "Computing ensemble mean J_MC[n] across all trials…",
    percent: 90,
  });

  const { avg, upper95, lower95 } = aggregatePointwise(squaredErrorCurves);

  await tickProgress({
    phase: "aggregate",
    currentRun: N_MC,
    totalRuns: N_MC,
    activeStep: 5,
    message: "Building 95% confidence intervals (Law of Large Numbers)…",
    percent: 97,
  });

  await tickProgress({
    phase: "complete",
    currentRun: N_MC,
    totalRuns: N_MC,
    activeStep: 6,
    message: "Monte Carlo analysis complete.",
    percent: 100,
  });

  return {
    avgMSE: avg,
    upper95,
    lower95,
    confidenceUpper: upper95,
    confidenceLower: lower95,
    squaredErrorMatrix: squaredErrorCurves,
    sampleRate,
    N_MC,
  };
}
