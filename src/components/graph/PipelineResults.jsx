import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  LogarithmicScale,
  Tooltip,
  Legend,
} from "chart.js";
import styles from "./pipelineResults.module.css";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  LogarithmicScale,
  Tooltip,
  Legend
);

const baseChartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  parsing: false,
  animation: false,
  plugins: { legend: { display: true, labels: { font: { size: 11 } } } },
};

function MetricsTable({ comparison }) {
  if (!comparison) return null;
  const rows = [
    ["Approach", comparison.approach.lms, comparison.approach.mvdr],
    ["Optimality", comparison.optimality.lms, comparison.optimality.mvdr],
    ["Computational cost", comparison.computationalCost.lms, comparison.computationalCost.mvdr],
    ["Convergence", comparison.convergence.lms, comparison.convergence.mvdr],
    ["Robustness", comparison.robustness.lms, comparison.robustness.mvdr],
  ];
  return (
    <div className={styles.tableWrap}>
      <h4>Theory §5.7 — LMS vs MVDR (measured)</h4>
      <table className={styles.table}>
        <thead>
          <tr><th>Criterion</th><th>LMS</th><th>MVDR</th></tr>
        </thead>
        <tbody>
          {rows.map(([k, l, m]) => (
            <tr key={k}><td>{k}</td><td>{l}</td><td>{m}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const PipelineResults = ({ results }) => {
  if (!results) return null;

  const { stage1, stage3, stage4, stage5, psd, wss, comparison } = results;
  const p = stage1.p;

  const learningData = {
    labels: stage5.J_MC.map((_, i) => i),
    datasets: [
      {
        label: "J_MC[n] (Theory §6.2)",
        data: stage5.J_MC.map((v, i) => ({ x: i, y: v })),
        borderColor: "#1D7480",
        borderWidth: 1.5,
        pointRadius: 0,
      },
      {
        label: "95% CI upper",
        data: stage5.upper95.map((v, i) => ({ x: i, y: v })),
        borderColor: "rgba(29,116,128,0.3)",
        borderWidth: 1,
        pointRadius: 0,
        borderDash: [4, 4],
      },
      {
        label: "95% CI lower",
        data: stage5.lower95.map((v, i) => ({ x: i, y: v })),
        borderColor: "rgba(29,116,128,0.3)",
        borderWidth: 1,
        pointRadius: 0,
        borderDash: [4, 4],
      },
      {
        label: `J_min (Theory §4.2)`,
        data: stage5.J_MC.map((_, i) => ({ x: i, y: stage5.J_min })),
        borderColor: "#e67e22",
        borderWidth: 1,
        pointRadius: 0,
        borderDash: [6, 3],
      },
    ],
  };

  const coeffLabels = Array.from({ length: p }, (_, i) => `a${i + 1}`);
  const lastW = stage3.wHistory[stage3.wHistory.length - 1] || stage3.w;
  const coeffData = {
    labels: coeffLabels,
    datasets: [
      {
        label: "LMS w (final)",
        data: lastW,
        borderColor: "#4da6ff",
        backgroundColor: "rgba(77,166,255,0.2)",
      },
      {
        label: "−a Yule-Walker (Theory §7.1)",
        data: stage3.w_yw,
        borderColor: "#e74c3c",
        borderDash: [6, 3],
        backgroundColor: "rgba(231,76,60,0.1)",
      },
    ],
  };

  const psdData = {
    labels: psd.data.freqs.map((f) => f * results.fs),
    datasets: [
      {
        label: "PSD from ACF (Theory §2.2)",
        data: psd.data.psd,
        borderColor: "#3498db",
        pointRadius: 0,
        borderWidth: 1,
      },
      {
        label: "AR PSD (Theory §3.2.2)",
        data: psd.ar.psd,
        borderColor: "#9b59b6",
        pointRadius: 0,
        borderWidth: 1,
        borderDash: [4, 2],
      },
    ],
  };

  const mvdrLen = stage4.output.length;
  const offset = results.d.length - mvdrLen;
  const filteredData = {
    datasets: [
      {
        label: "Clean x[n]",
        data: results.x.slice(offset).map((y, i) => ({ x: results.times[offset + i], y })),
        borderColor: "#4da6ff",
        borderWidth: 1,
        pointRadius: 0,
      },
      {
        label: "MVDR output (Theory §5.4)",
        data: stage4.output.map((y, i) => ({ x: results.times[offset + i], y })),
        borderColor: "#27ae60",
        borderWidth: 1,
        pointRadius: 0,
      },
    ],
  };

  return (
    <div className={styles.container}>
      <h3>Pipeline Results (Theory §7.2)</h3>

      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <span>Stage 1 — AR({stage1.p})</span>
          <strong>σ²_w = {stage1.sigma2_w.toExponential(3)}</strong>
          <small>Stable: {stage1.stable ? "yes" : "no"} | AIC p*={stage1.orderSearch.pAic}</small>
        </div>
        <div className={styles.metricCard}>
          <span>Stage 2 — SNR_in</span>
          <strong>{results.stage2.snrIn.toFixed(2)} dB</strong>
          <small>WSS: {wss.isWSS ? "pass" : "fail"}</small>
        </div>
        <div className={styles.metricCard}>
          <span>Stage 3 — LMS</span>
          <strong>‖w−(−a)‖ = {stage3.weightError.toExponential(3)}</strong>
          <small>μ stable: {stage3.stability.stable ? "yes" : "no"}</small>
        </div>
        <div className={styles.metricCard}>
          <span>Stage 4 — MVDR SINR</span>
          <strong>{stage4.sinr.toExponential(3)}</strong>
          <small>N≥2M: {stage4.sufficientSnapshots ? "yes" : "no (δ loaded)"}</small>
        </div>
        <div className={styles.metricCard}>
          <span>Stage 5 — MC (N_MC={stage5.N_MC})</span>
          <strong>J_ss = {stage5.J_ss.toExponential(3)}</strong>
          <small>M = {stage5.misadjustment.toExponential(3)} | ΔSNR = {stage5.snr.snrImprovementDb.toFixed(2)} dB</small>
        </div>
      </div>

      <div className={styles.chartBlock}>
        <h4>Stage 5 — Learning curve J_MC[n] ± 95% CI (Theory §6)</h4>
        <div className="dashboard-chart-shell">
          <Line
            data={learningData}
            options={{
              ...baseChartOpts,
              scales: {
                x: { type: "linear", title: { display: true, text: "Iteration n" } },
                y: { title: { display: true, text: "MSE" } },
              },
            }}
          />
        </div>
      </div>

      <div className={styles.chartBlock}>
        <h4>Stage 3 — LMS weights vs −a (Theory §7.1)</h4>
        <div className="dashboard-chart-shell dashboard-chart-shell--short">
          <Line
            data={coeffData}
            options={{
              ...baseChartOpts,
              scales: {
                x: { title: { display: true, text: "Coefficient index" } },
                y: { title: { display: true, text: "Value" } },
              },
            }}
          />
        </div>
      </div>

      <div className={styles.chartBlock}>
        <h4>Stage 4 — MVDR filtered output (Theory §5.4)</h4>
        <div className="dashboard-chart-shell">
          <Line
            data={filteredData}
            options={{
              ...baseChartOpts,
              scales: {
                x: { type: "linear", title: { display: true, text: "Time (s)" } },
                y: { title: { display: true, text: "Amplitude (mV)" } },
              },
            }}
          />
        </div>
      </div>

      <div className={styles.chartBlock} id="psdPanel">
        <h4>PSD — Wiener–Khinchin vs AR model (Theory §2.2, §3.2.2)</h4>
        <div className="dashboard-chart-shell dashboard-chart-shell--short">
          <Line
            data={psdData}
            options={{
              ...baseChartOpts,
              scales: {
                x: { title: { display: true, text: "Frequency (Hz)" } },
                y: { type: "logarithmic", title: { display: true, text: "PSD" } },
              },
            }}
          />
        </div>
      </div>

      <MetricsTable comparison={comparison} />
    </div>
  );
};
