import { applyNoiseTrial } from "./signalExtract.js";
import { runLMS } from "./lms.js";
import { runMVDR } from "./mvdr.js";

// Theory §6 — Monte Carlo validation

// Theory §6.2 — J_MC[n] = (1/N_MC) Σ_k e_k²[n]
export function aggregateLearningCurves(curves) {
  const N_MC = curves.length;
  if (!N_MC) return { J_MC: [], SE: [], lower95: [], upper95: [] };
  const len = Math.min(...curves.map((c) => c.length));
  const J_MC = [];
  const SE = [];
  const lower95 = [];
  const upper95 = [];
  for (let n = 0; n < len; n++) {
    const vals = curves.map((c) => c[n]);
    const mean = vals.reduce((s, v) => s + v, 0) / N_MC;
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(N_MC - 1, 1);
    const sigma_xi = Math.sqrt(variance);
  // Theory §6.4 — SE[n] = σ_ξ[n]/√N_MC
    const se = sigma_xi / Math.sqrt(N_MC);
    J_MC.push(mean);
    SE.push(se);
    // Theory §6.4 — 95% CI: J_MC[n] ± 1.96·SE[n]
    lower95.push(mean - 1.96 * se);
    upper95.push(mean + 1.96 * se);
  }
  return { J_MC, SE, lower95, upper95 };
}

// Theory §6.3(d) — SNR_improvement (dB) = 10 log10(σ²_signal/J_ss) − SNR_in
export function snrImprovement(x, J_ss) {
  const sigma2_signal = x.reduce((s, v) => s + v * v, 0) / x.length;
  const sigma2_noise = x.reduce((s, v, i) => s + (v - x[i]) ** 2, 0) / x.length;
  const snrIn = 10 * Math.log10((sigma2_signal + 1e-18) / (sigma2_noise + 1e-18));
  const snrOut = 10 * Math.log10((sigma2_signal + 1e-18) / (J_ss + 1e-18));
  return { snrIn, snrOut, snrImprovementDb: snrOut - snrIn, sigma2_signal };
}

export function snrImprovementFromNoisy(x, d, J_ss) {
  const sigma2_signal = x.reduce((s, v) => s + v * v, 0) / x.length;
  const sigma2_noise = d.reduce((s, v, i) => s + (v - x[i]) ** 2, 0) / d.length;
  const snrIn = 10 * Math.log10((sigma2_signal + 1e-18) / (sigma2_noise + 1e-18));
  const snrOut = 10 * Math.log10((sigma2_signal + 1e-18) / (J_ss + 1e-18));
  return { snrIn, snrOut, snrImprovementDb: snrOut - snrIn, sigma2_signal };
}

// Theory §6.3(b)(c) — J_ss, misadjustment M = (J_ss−J_min)/J_min
export function mcSteadyStateMetrics(J_MC, J_min, tailFrac = 0.1) {
  const tailStart = Math.floor(J_MC.length * (1 - tailFrac));
  const tail = J_MC.slice(tailStart);
  const J_ss = tail.reduce((s, v) => s + v, 0) / tail.length;
  const misadjustment = (J_ss - J_min) / (J_min + 1e-18);
  return { J_ss, misadjustment };
}

// Theory §6.1 — N_MC independent trials with fresh noise
export function runMonteCarlo({
  x,
  originalFs,
  noise,
  p,
  mu,
  M,
  N_MC,
  delta,
  useArCovariance = false,
  R_acf = null,
}) {
  const curves = [];
  const J_ss_trials = [];
  const sinr_trials = [];

  for (let k = 0; k < N_MC; k++) {
    const d = applyNoiseTrial(x, originalFs, noise);
    const lms = runLMS(d, p, mu);
    curves.push(lms.errors);
    const tail = lms.errors.slice(-Math.floor(lms.errors.length * 0.1));
    const J_ss_k = tail.reduce((s, v) => s + v, 0) / tail.length;
    J_ss_trials.push(J_ss_k);

    const mvdr = runMVDR(d, M, delta);
    sinr_trials.push(mvdr.sinr);
  }

  const { J_MC, SE, lower95, upper95 } = aggregateLearningCurves(curves);
  const J_min = runLMS(x, p, mu).J_min;
  const { J_ss, misadjustment } = mcSteadyStateMetrics(J_MC, J_min);
  const snr = snrImprovementFromNoisy(x, applyNoiseTrial(x, originalFs, noise), J_ss);

  return {
    J_MC,
    SE,
    lower95,
    upper95,
    J_ss,
    misadjustment,
    J_min,
    snr,
    N_MC,
    sinrMean: sinr_trials.reduce((s, v) => s + v, 0) / N_MC,
  };
}
