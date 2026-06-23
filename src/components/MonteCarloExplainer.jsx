import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { aggregatePointwise } from "../utils/monteCarloEcg.js";
import { withMonteCarloTooltipOptions } from "../utils/monteCarloChartTooltip.js";
import styles from "./monteCarloExplainer.module.css";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler
);

const TABS = [
  { id: "individual", label: "Individual trials" },
  { id: "running", label: "Running average" },
  { id: "confidence", label: "Confidence bands" },
];

const TRIAL_COLORS = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#06b6d4",
  "#ec4899",
  "#f97316",
];

const ENSEMBLE_COLOR = "#0f766e";
const RUNNING_COLOR = "#2563eb";
const FINAL_MEAN_COLOR = "#dc2626";
const CI_UPPER_COLOR = "#3b82f6";
const CI_LOWER_COLOR = "#ef4444";
const CI_FILL = "rgba(59, 130, 246, 0.12)";

const TRIAL_LINE_WIDTH = 0.75;
const MAIN_LINE_WIDTH = 1.25;
const CI_LINE_WIDTH = 0.7;
const MAX_PLOT_POINTS = 400;
const MAX_INDIVIDUAL_CURVES = 5;
const ANIM_MS_PER_TRIAL = 140;

function round3(v) {
  return Math.round(v * 1000) / 1000;
}

function downsampleIndices(len, maxPoints = MAX_PLOT_POINTS) {
  if (len <= maxPoints) {
    return Array.from({ length: len }, (_, i) => i);
  }
  const step = Math.ceil(len / maxPoints);
  const indices = [];
  for (let i = 0; i < len; i += step) indices.push(i);
  return indices;
}

function computeMetrics(squaredErrorMatrix, nTrials) {
  const n = Math.max(1, Math.min(nTrials, squaredErrorMatrix.length));
  const subset = squaredErrorMatrix.slice(0, n);
  const { avg, upper95, lower95 } = aggregatePointwise(subset);
  const len = avg.length;

  if (!len) {
    return { noiseSpread: 0, ciWidth: 0, convergence: 0, avg, upper95, lower95 };
  }

  let sigmaSum = 0;
  let ciWidthSum = 0;

  for (let i = 0; i < len; i++) {
    let mean = 0;
    for (let r = 0; r < subset.length; r++) mean += subset[r][i];
    mean /= subset.length;

    let variance = 0;
    for (let r = 0; r < subset.length; r++) {
      const d = subset[r][i] - mean;
      variance += d * d;
    }
    variance = subset.length > 1 ? variance / (subset.length - 1) : 0;
    const sigma = Math.sqrt(variance);
    sigmaSum += sigma;
    ciWidthSum += upper95[i] - lower95[i];
  }

  const noiseSpread = sigmaSum / len;
  const ciWidth = ciWidthSum / len;
  const baselineWidth = 2 * 1.96 * noiseSpread;
  const convergence =
    n <= 1
      ? 0
      : baselineWidth > 0
        ? Math.max(0, (1 - ciWidth / baselineWidth) * 100)
        : (1 - 1 / Math.sqrt(n)) * 100;

  return {
    noiseSpread,
    ciWidth,
    convergence,
    avg,
    upper95,
    lower95,
  };
}

function toChartPoints(values, sampleRate, indices) {
  return indices.map((i) => ({ x: i / sampleRate, y: values[i] ?? 0 }));
}

function buildChartOptions(yLabel) {
  return withMonteCarloTooltipOptions({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    parsing: false,
    plugins: {
      legend: {
        display: true,
        position: "top",
        labels: {
          color: "#334155",
          boxWidth: 14,
          font: { size: 11, weight: "500" },
          usePointStyle: true,
          pointStyle: "line",
        },
      },
    },
    scales: {
      x: {
        type: "linear",
        title: { display: true, text: "Time (s)", color: "#334155", font: { size: 12, weight: "bold" } },
        ticks: { color: "#64748b", maxTicksLimit: 8 },
        grid: { color: "rgba(226, 232, 240, 0.9)" },
        border: { color: "#e2e8f0" },
      },
      y: {
        title: { display: true, text: yLabel, color: "#334155", font: { size: 12, weight: "bold" } },
        ticks: { color: "#64748b" },
        grid: { color: "rgba(226, 232, 240, 0.9)" },
        border: { color: "#e2e8f0" },
      },
    },
  });
}

export function MonteCarloExplainer({
  trials,
  avgMSE,
  confidenceUpper,
  confidenceLower,
  squaredErrorMatrix,
  sampleRate,
}) {
  const [activeTab, setActiveTab] = useState("individual");
  const [animCount, setAnimCount] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [nDisplay, setNDisplay] = useState(trials);
  const playingRef = useRef(false);
  const rafRef = useRef(null);
  const lastFrameRef = useRef(0);

  useEffect(() => {
    setAnimCount(1);
    setNDisplay(trials);
    setPlaying(false);
    playingRef.current = false;
  }, [trials, squaredErrorMatrix]);

  const effectiveNTrials = useMemo(() => {
    if (activeTab === "running") return animCount;
    if (activeTab === "confidence") return nDisplay;
    return trials;
  }, [activeTab, animCount, nDisplay, trials]);

  const metrics = useMemo(
    () => computeMetrics(squaredErrorMatrix, effectiveNTrials),
    [squaredErrorMatrix, effectiveNTrials]
  );

  const indices = useMemo(() => {
    const len = avgMSE?.length ?? 0;
    return downsampleIndices(len);
  }, [avgMSE]);

  const stopAnimation = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const startAnimation = useCallback(() => {
    if (playingRef.current) {
      stopAnimation();
      return;
    }
    setAnimCount(1);
    playingRef.current = true;
    setPlaying(true);
    lastFrameRef.current = 0;

    const tick = (timestamp) => {
      if (!playingRef.current) return;
      if (!lastFrameRef.current) lastFrameRef.current = timestamp;
      if (timestamp - lastFrameRef.current >= ANIM_MS_PER_TRIAL) {
        lastFrameRef.current = timestamp;
        setAnimCount((prev) => {
          const next = prev >= trials ? prev : prev + 1;
          if (next >= trials) {
            playingRef.current = false;
            setPlaying(false);
          }
          return next;
        });
      }
      if (playingRef.current) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stopAnimation, trials]);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const individualChartData = useMemo(() => {
    const showCount = Math.min(MAX_INDIVIDUAL_CURVES, squaredErrorMatrix.length);
    const datasets = [];

    for (let r = 0; r < showCount; r++) {
      const color = TRIAL_COLORS[r % TRIAL_COLORS.length];
      datasets.push({
        label: `Trial ${r + 1}`,
        data: toChartPoints(squaredErrorMatrix[r], sampleRate, indices),
        borderColor: color,
        borderWidth: TRIAL_LINE_WIDTH,
        pointRadius: 0,
        tension: 0.1,
      });
    }

    datasets.push({
      label: "Ensemble average",
      data: toChartPoints(avgMSE, sampleRate, indices),
      borderColor: ENSEMBLE_COLOR,
      borderWidth: MAIN_LINE_WIDTH,
      pointRadius: 0,
      tension: 0.1,
    });

    return { datasets };
  }, [squaredErrorMatrix, avgMSE, sampleRate, indices]);

  const runningChartData = useMemo(() => {
    const { avg } = computeMetrics(squaredErrorMatrix, animCount);
    return {
      datasets: [
        {
          label: `Running average (${animCount} trial${animCount === 1 ? "" : "s"})`,
          data: toChartPoints(avg, sampleRate, indices),
          borderColor: RUNNING_COLOR,
          borderWidth: MAIN_LINE_WIDTH,
          pointRadius: 0,
          tension: 0.1,
          fill: false,
        },
        {
          label: "Final ensemble mean",
          data: toChartPoints(avgMSE, sampleRate, indices),
          borderColor: FINAL_MEAN_COLOR,
          borderWidth: TRIAL_LINE_WIDTH,
          borderDash: [6, 4],
          pointRadius: 0,
          tension: 0.1,
        },
      ],
    };
  }, [squaredErrorMatrix, animCount, avgMSE, sampleRate, indices]);

  const confidenceChartData = useMemo(() => {
    const { avg, upper95, lower95 } = computeMetrics(squaredErrorMatrix, nDisplay);
    const upperPts = toChartPoints(upper95, sampleRate, indices);
    const lowerPts = toChartPoints(lower95, sampleRate, indices);

    return {
      datasets: [
        {
          label: "95% upper bound",
          data: upperPts,
          borderColor: CI_UPPER_COLOR,
          borderWidth: CI_LINE_WIDTH,
          borderDash: [4, 3],
          backgroundColor: CI_FILL,
          pointRadius: 0,
          fill: "+1",
          tension: 0.1,
        },
        {
          label: "95% lower bound",
          data: lowerPts,
          borderColor: CI_LOWER_COLOR,
          borderWidth: CI_LINE_WIDTH,
          borderDash: [4, 3],
          pointRadius: 0,
          fill: false,
          tension: 0.1,
        },
        {
          label: "Ensemble mean",
          data: toChartPoints(avg, sampleRate, indices),
          borderColor: ENSEMBLE_COLOR,
          borderWidth: MAIN_LINE_WIDTH,
          pointRadius: 0,
          tension: 0.1,
        },
      ],
    };
  }, [squaredErrorMatrix, nDisplay, sampleRate, indices]);

  const chartOptions = useMemo(() => buildChartOptions("MSE (mV²)"), []);

  const annotation = useMemo(() => {
    if (activeTab === "individual") {
      return "Each trial has fresh random noise — they all look different.";
    }
    if (activeTab === "running") {
      return "Random noise cancels itself. More trials → smoother average.";
    }
    return "Wider band = less certainty. Drag slider to see Law of Large Numbers.";
  }, [activeTab]);

  if (!squaredErrorMatrix?.length || !avgMSE?.length) return null;

  return (
    <div className={styles.wrapper}>
      <h4 className={styles.title}>What Monte Carlo actually does</h4>
      <p className={styles.intro}>
        Each trial injects fresh random noise into your ECG and runs the LMS filter. The trick:
        random noise cancels itself out when you average enough trials.
      </p>

      <div className={styles.metrics}>
        <div className={styles.metricCard}>
          <span className={styles.metricValue}>{round3(metrics.noiseSpread)}</span>
          <span className={styles.metricLabel}>noise spread (σ)</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricValue}>{round3(metrics.ciWidth)}</span>
          <span className={styles.metricLabel}>95% CI width</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricValue}>{Math.round(metrics.convergence)}%</span>
          <span className={styles.metricLabel}>convergence vs 1 run</span>
        </div>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Monte Carlo visualization phases">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
            onClick={() => {
              setActiveTab(tab.id);
              stopAnimation();
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "running" && (
        <div className={styles.controlsRow}>
          <button type="button" className={styles.playBtn} onClick={startAnimation}>
            {playing ? "⏸ Pause" : "▶ Play"}
          </button>
          <span className={styles.trialBadge}>
            Trials averaged: {animCount} / {trials}
          </span>
        </div>
      )}

      {activeTab === "confidence" && (
        <div className={styles.sliderBlock}>
          <label className={styles.sliderLabel} htmlFor="mc-explainer-n-display">
            <span>Trials in CI calculation</span>
            <strong>{nDisplay} / {trials}</strong>
          </label>
          <input
            id="mc-explainer-n-display"
            type="range"
            className={styles.slider}
            min={1}
            max={trials}
            step={1}
            value={nDisplay}
            onChange={(e) => setNDisplay(Number(e.target.value))}
          />
        </div>
      )}

      <div className={styles.chartShell}>
        {activeTab === "individual" && (
          <Line data={individualChartData} options={chartOptions} />
        )}
        {activeTab === "running" && (
          <Line data={runningChartData} options={chartOptions} />
        )}
        {activeTab === "confidence" && (
          <Line data={confidenceChartData} options={chartOptions} />
        )}
      </div>

      <p className={styles.annotation}>{annotation}</p>
      {activeTab === "confidence" && (
        <p className={styles.annotation}>
          Shaded band = 95% confidence interval. More trials → narrower band → higher certainty
          (Law of Large Numbers).
        </p>
      )}
    </div>
  );
}

MonteCarloExplainer.propTypes = {
  trials: PropTypes.number.isRequired,
  avgMSE: PropTypes.arrayOf(PropTypes.number).isRequired,
  confidenceUpper: PropTypes.arrayOf(PropTypes.number).isRequired,
  confidenceLower: PropTypes.arrayOf(PropTypes.number).isRequired,
  squaredErrorMatrix: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
  sampleRate: PropTypes.number.isRequired,
};

export default MonteCarloExplainer;
