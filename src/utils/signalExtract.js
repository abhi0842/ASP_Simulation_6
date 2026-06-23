import {
  addBaselineWander,
  addPowerlineNoise,
  addMuscleNoise,
} from "./addNoise.js";

function inferFs(dataAll) {
  if (dataAll.length < 2) return 500;
  const dt = dataAll[1].x - dataAll[0].x;
  return dt > 0 ? 1 / dt : 500;
}

function resampleForDisplay(data, fsOriginal, fsUser) {
  const step = fsOriginal / fsUser;
  if (step <= 1) return data;
  const out = [];
  for (let i = 0; i < data.length; i += step) {
    out.push(data[Math.floor(i)]);
  }
  return out;
}

/** Extract clean x[n] and noisy d[n] using the same logic as EcgUnfilter / EcgNoisy. */
export function extractSignals({
  rawSamples,
  time,
  originalFs,
  selectedChannels,
  noise,
  applyNoiseTrigger,
  channel = "ECG_I",
}) {
  if (!rawSamples.length) return { x: [], d: [], fs: originalFs, times: [] };

  const fsOriginal = inferFs(rawSamples);
  const displayData = resampleForDisplay(rawSamples, fsOriginal, originalFs);
  const limited = displayData.filter((p) => p.x <= time);
  const x = limited.map((p) => p[channel] ?? p.ECG_I ?? 0);
  const times = limited.map((p) => p.x);

  if (!applyNoiseTrigger) {
    return { x, d: [...x], fs: Number(originalFs), times };
  }

  let d = [...x];
  if (noise.baseline) d = addBaselineWander(d, originalFs);
  if (noise.powerline) d = addPowerlineNoise(d, originalFs);
  if (noise.emg) d = addMuscleNoise(d);

  return { x, d, fs: Number(originalFs), times };
}

/** Re-apply noise for Monte Carlo trial k (fresh EMG draw). */
export function applyNoiseTrial(x, originalFs, noise) {
  let d = [...x];
  if (noise.baseline) d = addBaselineWander(d, originalFs);
  if (noise.powerline) d = addPowerlineNoise(d, originalFs);
  if (noise.emg) d = addMuscleNoise(d);
  return d;
}
