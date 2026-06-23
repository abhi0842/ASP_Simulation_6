import { useContext, useMemo } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import styles from "./lmsVsMvdrPanel.module.css";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from "chart.js";
import { withSignalTooltipOptions } from "../../utils/signalChartTooltip.js";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

export function LmsVsMvdrPanel() {
  const { compareResults } = useContext(SimulationContext);

  const chartData = useMemo(() => {
    if (!compareResults) return null;
    const { noisy, lmsFiltered, mvdrFiltered } = compareResults;
    return {
      datasets: [
        {
          label: "Noisy ECG Input",
          data: noisy,
          borderColor: "#e74c3c",
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0,
        },
        {
          label: "LMS Output",
          data: lmsFiltered,
          borderColor: "#6366f1",
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0,
        },
        {
          label: "MVDR Output",
          data: mvdrFiltered,
          borderColor: "#2ecc71",
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0,
        },
      ],
    };
  }, [compareResults]);

  const chartOptions = useMemo(
    () =>
      withSignalTooltipOptions({
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        parsing: false,
        plugins: { legend: { display: true, position: "top" } },
        scales: {
          x: {
            type: "linear",
            title: { display: true, text: "Time (s)", font: { size: 13, weight: "bold" } },
            ticks: { font: { size: 12 } },
          },
          y: {
            title: { display: true, text: "Amplitude (mV)", font: { size: 13, weight: "bold" } },
            ticks: { font: { size: 12 } },
          },
        },
      }),
    []
  );

  if (!compareResults) return null;

  const { snrIn, lmsSnr, mvdrSnr, lmsImprovement, mvdrImprovement } = compareResults;

  return (
    <div className={styles.stack}>
      <div className={styles.card}>
        <h3 className={styles.title}>LMS vs. MVDR Comparative Analysis</h3>
        <p className={styles.subtitle}>
          Compare the performance metrics obtained during the experiment stages. Compare the
          convergence rates, hardware constraints, and signal quality improvements.
        </p>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Metric</th>
                <th className={styles.colNoisy}>Noisy Signal</th>
                <th className={styles.colLms}>LMS Algorithm</th>
                <th className={styles.colMvdr}>MVDR Beamformer</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Algorithm Type</td>
                <td className={styles.muted}>Raw Contaminated</td>
                <td>Temporal Gradient Update</td>
                <td>Spatial Linear Constraint</td>
              </tr>
              <tr>
                <td>Output SNR (dB)</td>
                <td className={styles.mono}>{snrIn.toFixed(2)} dB</td>
                <td className={`${styles.mono} ${styles.colLms}`}>{lmsSnr.toFixed(2)} dB</td>
                <td className={`${styles.mono} ${styles.colMvdr}`}>{mvdrSnr.toFixed(2)} dB</td>
              </tr>
              <tr>
                <td>SNR Improvement (dB)</td>
                <td>0.00 dB (Baseline)</td>
                <td className={styles.colLms}>
                  {lmsImprovement >= 0 ? "+" : ""}
                  {lmsImprovement.toFixed(2)} dB
                </td>
                <td className={styles.colMvdr}>
                  {mvdrImprovement >= 0 ? "+" : ""}
                  {mvdrImprovement.toFixed(2)} dB
                </td>
              </tr>
              <tr>
                <td>Required Reference</td>
                <td className={styles.muted}>N/A</td>
                <td>Correlated Noise Channel</td>
                <td>ECG Source Direction Vector</td>
              </tr>
              <tr>
                <td>Computational Cost</td>
                <td className={styles.muted}>None</td>
                <td className={styles.mono}>O(M) — Very Low</td>
                <td className={styles.mono}>O(M³) — Higher Matrix Solve</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className={styles.synthesis}>
          <span className={styles.synthesisIcon}>✓</span>
          <div>
            <strong>Denoising Synthesis</strong>
            <p>
              LMS is a continuous learner that tracks dynamic changes. MVDR provides the optimal
              SINR response in one mathematical step, completely preserving the shape of the QRS
              complex without needing the noise reference.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.chartCard}>
        <h3>Waveform Denoising Output Comparison</h3>
        <div className="dashboard-chart-shell">
          {chartData && <Line data={chartData} options={chartOptions} />}
        </div>
      </div>
    </div>
  );
}
