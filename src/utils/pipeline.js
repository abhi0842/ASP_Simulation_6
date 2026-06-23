import { checkWSS, estimateACF, acfToPSD } from "./stochastic.js";
import { fitAR, selectAROrder, arPSD } from "./arModel.js";
import { runLMS, checkLMSStability } from "./lms.js";
import { runMVDR, covarianceFromACF, mvdrWeights, defaultSteeringVector } from "./mvdr.js";
import { runMonteCarlo } from "./monteCarlo.js";
import { extractSignals } from "./signalExtract.js";

// Theory §5.7 — LMS vs MVDR comparison with measured numbers
export function compareLmsMvdr({ lmsResult, mvdrResult, mcResult, M, N_MC, mu }) {
  const lmsCostPerIter = M;
  const mvdrCost = M * M * M;
  const wNormDiff = lmsResult.w.reduce(
    (s, wk, i) => s + (wk - lmsResult.w_target[i]) ** 2,
    0
  );

  return {
    approach: { lms: "Stochastic gradient (iterative)", mvdr: "Constrained optimisation (closed-form)" },
    optimality: {
      lms: `Asymptotic MSE J_ss=${mcResult.J_ss.toExponential(3)} (approaches Wiener J_min=${mcResult.J_min.toExponential(3)})`,
      mvdr: `SINR_MVDR=${mvdrResult.sinr.toExponential(3)} (statistically optimal under distortionless constraint)`,
    },
    computationalCost: {
      lms: `O(M)=${lmsCostPerIter} mults/iter × ${lmsResult.errors.length} iters`,
      mvdr: `O(M³)≈${mvdrCost} ops for ${M}×${M} inversion`,
    },
    convergence: {
      lms: `n_c≈${Math.round(lmsResult.conv.n_c)} iters (μ=${mu}, χ(R)=${lmsResult.conv.chi.toFixed(2)})`,
      mvdr: "Direct closed-form (no iteration)",
    },
    robustness: {
      lms: `μ bound: ${lmsResult.stability.stable ? "OK" : "VIOLATED"} (μ<1/λ_max=${lmsResult.stability.boundExact.toExponential(3)})`,
      mvdr: `Snapshots N=${mvdrResult.N}, N≥2M=${mvdrResult.sufficientSnapshots ? "OK" : "loaded δ=" + mvdrResult.delta}`,
    },
    measured: {
      lmsFinalMSE: mcResult.J_ss,
      mvdrSINR: mvdrResult.sinr,
      weightErrorVsYW: Math.sqrt(wNormDiff),
      misadjustment: mcResult.misadjustment,
      N_MC,
    },
  };
}

function logPipelineResults(results) {
  console.group("ASP Simulation — 5-Stage Pipeline Results");
  console.log("Stage 1 — AR(p) fit:", results.stage1);
  console.log("Stage 2 — Noisy signal d[n]=x[n]+noise:", {
    N: results.stage2.N,
    snrInDb: results.stage2.snrIn?.toFixed(2),
  });
  console.log("Stage 3 — LMS filter:", results.stage3);
  console.log("Stage 4 — MVDR beamformer:", results.stage4);
  console.log("Stage 5 — Monte Carlo:", results.stage5);
  console.log("LMS vs MVDR (Theory §5.7):", results.comparison);
  console.groupEnd();
}

// Theory §7.2 — unified 5-stage pipeline
export function runFullPipeline({
  rawSamples,
  time,
  originalFs,
  selectedChannels,
  noise,
  applyNoiseTrigger,
  p,
  pMax,
  mu,
  M,
  N_MC,
  delta,
  useAicOrder = true,
}) {
  const channel = selectedChannels[0] || "ECG_I";
  const { x, d, fs, times } = extractSignals({
    rawSamples,
    time,
    originalFs,
    selectedChannels,
    noise,
    applyNoiseTrigger,
    channel,
  });

  if (x.length < 64) {
    throw new Error("Signal too short. Generate ECG and add noise first.");
  }

  // Theory §2 — WSS check on clean ECG
  const wss = checkWSS(x);

  // Theory §7.2 Stage 1 — AR(p) fit → a, σ²_w
  const orderSearch = selectAROrder(x, 2, pMax);
  const pUse = useAicOrder ? orderSearch.pAic : p;
  const stage1 = fitAR(x, pUse);
  const R_acf = estimateACF(x, M + 2);
  const dataPsd = acfToPSD(R_acf);
  const modelPsd = arPSD(stage1.a, stage1.sigma2_w, fs);

  // Theory §7.2 Stage 2 — d[n] = x[n] + noise[n] (existing noise model)
  const sigma2_signal = x.reduce((s, v) => s + v * v, 0) / x.length;
  const sigma2_noise = d.reduce((s, v, i) => s + (v - x[i]) ** 2, 0) / d.length;
  const snrIn = 10 * Math.log10((sigma2_signal + 1e-18) / (sigma2_noise + 1e-18));

  // Theory §7.2 Stage 3 — LMS; verify w → −a (Theory §7.1)
  const lms = runLMS(d, pUse, mu);
  const w_yw = stage1.a.map((ak) => -ak);
  lms.w_target = w_yw;
  const weightError = Math.sqrt(
    lms.w.reduce((s, wk, i) => s + (wk - w_yw[i]) ** 2, 0)
  );

  // Theory §7.2 Stage 4 — MVDR with R from data or AR ACF
  const mvdrData = runMVDR(d, M, delta);
  const R_ar = covarianceFromACF(R_acf, M);
  const dSteer = defaultSteeringVector(M);
  const mvdrAr = mvdrWeights(
    delta > 0 ? R_ar.map((row, i) => row.map((v, j) => (i === j ? v + delta : v))) : R_ar,
    dSteer
  );

  // Theory §7.2 Stage 5 — Monte Carlo over full pipeline
  const stage5 = runMonteCarlo({
    x,
    originalFs,
    noise,
    p: pUse,
    mu,
    M,
    N_MC,
    delta,
    R_acf,
  });

  const comparison = compareLmsMvdr({
    lmsResult: lms,
    mvdrResult: mvdrData,
    mcResult: stage5,
    M,
    N_MC,
    mu,
  });

  const results = {
    fs,
    times,
    x,
    d,
    wss,
    stage1: {
      p: pUse,
      a: stage1.a,
      sigma2_w: stage1.sigma2_w,
      stable: stage1.stability.stable,
      maxRoot: stage1.stability.maxRootModulus,
      orderSearch,
    },
    stage2: { N: d.length, snrIn, sigma2_noise },
    stage3: {
      w: lms.w,
      w_yw,
      w_opt: lms.w_opt,
      weightError,
      J_min: lms.J_min,
      mu,
      stability: lms.stability,
      conv: lms.conv,
      ss: lms.ss,
      errors: lms.errors,
      wHistory: lms.wHistory,
      y: lms.y,
    },
    stage4: {
      w: mvdrData.w,
      w_ar: mvdrAr.w,
      sinr: mvdrData.sinr,
      output: mvdrData.output,
      N: mvdrData.N,
      M: mvdrData.M,
      sufficientSnapshots: mvdrData.sufficientSnapshots,
      delta: mvdrData.delta,
    },
    stage5,
    psd: { data: dataPsd, ar: modelPsd },
    comparison,
    acf: R_acf,
  };

  logPipelineResults(results);
  return results;
}

export function suggestMu(R, M) {
  const stability = checkLMSStability(0.001, R, M);
  return 0.25 * stability.boundConservative;
}
