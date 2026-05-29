/**
 * Compare Runs Mode — shared helpers for pinning and overlaying simulation curves.
 */

export const MAX_PINNED_RUNS = 8;

export const PINNED_COLORS = [
  "#64748b",
  "#8b5cf6",
  "#ea580c",
  "#0284c7",
  "#db2777",
  "#65a30d",
  "#ca8a04",
  "#0891b2",
];

export const ACTIVE_LINE_STYLE = {
  borderWidth: 2,
  pointRadius: 0,
};

export const PINNED_LINE_STYLE = {
  borderDash: [6, 6],
  borderWidth: 1,
  pointRadius: 0,
};

/** @returns {{ activeRun: null, pinnedRuns: [] }} */
export function createEmptyCompareState() {
  return { activeRun: null, pinnedRuns: [] };
}

export function createRunId() {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** @param {number} value */
export function formatMu(value) {
  if (!Number.isFinite(value)) return "?";
  return value < 0.01 ? value.toFixed(5) : value.toFixed(3);
}

/**
 * LMS-AR parameter label, e.g. "μ=0.001, P=4, MC=50"
 */
export function formatLmsArParamsLabel(params = {}) {
  const parts = [`μ=${formatMu(params.mu)}`, `P=${params.P ?? "?"}`];
  if (params.monteCarloRuns != null) parts.push(`MC=${params.monteCarloRuns}`);
  return parts.join(", ");
}

/**
 * MVDR parameter label, e.g. "M=8, K=256, θs=30°, θi=-45°"
 */
export function formatMvdrParamsLabel(params = {}) {
  const parts = [
    `M=${params.M ?? "?"}`,
    `K=${params.snapshots ?? params.K ?? "?"}`,
    `θs=${params.theta_s ?? "?"}°`,
    `θi=${params.theta_i ?? "?"}°`,
  ];
  if (params.snr_dB != null) parts.push(`SNR=${params.snr_dB}dB`);
  if (params.inr_dB != null) parts.push(`INR=${params.inr_dB}dB`);
  return parts.join(", ");
}

/**
 * Build active-run snapshot from LMS-AR algorithm output.
 */
export function buildLmsMseActiveRun(data) {
  if (!data?.mse?.length) return null;
  const parameters = {
    mu: data.mu,
    P: data.P,
    monteCarloRuns: data.monteCarloRuns,
  };
  return {
    id: "active",
    labels: [...data.iterations],
    dataset: [...data.mse],
    parameters,
    label: formatLmsArParamsLabel(parameters),
    timestamp: Date.now(),
  };
}

/**
 * Build active-run snapshot from MVDR algorithm output.
 */
export function buildMvdrBeamActiveRun(data) {
  if (!data?.G_dB_avg?.length) return null;
  const parameters = {
    M: data.M,
    snapshots: data.snapshots,
    theta_s: data.theta_s,
    theta_i: data.theta_i,
    snr_dB: data.snr_dB,
    inr_dB: data.inr_dB,
    monteCarloRuns: data.monteCarloRuns,
  };
  return {
    id: "active",
    labels: [...data.phi],
    dataset: [...data.G_dB_avg],
    parameters,
    label: formatMvdrParamsLabel(parameters),
    timestamp: Date.now(),
  };
}

/**
 * Align a numeric series to a target length (trim or pad with null).
 */
export function alignSeriesToLength(series, targetLength) {
  if (!Array.isArray(series) || targetLength <= 0) return [];
  if (series.length === targetLength) return [...series];
  if (series.length > targetLength) return series.slice(0, targetLength);
  return [...series, ...Array(targetLength - series.length).fill(null)];
}

/**
 * Merge pinned runs + active run into Chart.js chart data.
 */
export function buildComparisonChartData({
  labels,
  activeLabel,
  activeData,
  activeColor = "#e63946",
  activeBackgroundColor,
  activeFill = false,
  pinnedRuns = [],
}) {
  const labelList = labels ?? [];
  const datasets = (pinnedRuns || []).map((run, index) => {
    const color = PINNED_COLORS[index % PINNED_COLORS.length];
    return {
      label: `📌 ${run.label}`,
      data: alignSeriesToLength(run.dataset, labelList.length),
      borderColor: hexWithAlpha(color, 0.55),
      backgroundColor: "transparent",
      ...PINNED_LINE_STYLE,
    };
  });

  datasets.push({
    label: activeLabel,
    data: alignSeriesToLength(activeData, labelList.length),
    borderColor: activeColor,
    backgroundColor: activeBackgroundColor,
    fill: activeFill,
    ...ACTIVE_LINE_STYLE,
  });

  return { labels: labelList, datasets };
}

function hexWithAlpha(hex, alpha) {
  if (!hex || hex[0] !== "#" || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Clone active run into a storable pinned entry.
 */
export function cloneAsPinnedRun(activeRun) {
  if (!activeRun) return null;
  return {
    id: createRunId(),
    labels: [...(activeRun.labels || [])],
    dataset: [...(activeRun.dataset || [])],
    parameters: { ...activeRun.parameters },
    label: activeRun.label,
    timestamp: Date.now(),
  };
}
