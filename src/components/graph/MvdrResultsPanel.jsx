import { useContext, useMemo } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import styles from "./mvdrResults.module.css";
import ecgStyles from "./ecgFilter.module.css";
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
import { CovarianceHeatmap } from "./CovarianceHeatmap.jsx";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

const chartOptions = (xLabel, yLabel, useSignalTooltip = false) => {
  const base = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    parsing: false,
    plugins: { legend: { display: true, position: "top" } },
    scales: {
      x: {
        type: "linear",
        title: { display: true, text: xLabel, font: { size: 13, weight: "bold" } },
        ticks: { font: { size: 12 } },
      },
      y: {
        title: { display: true, text: yLabel, font: { size: 13, weight: "bold" } },
        ticks: { font: { size: 12 } },
      },
    },
  };
  return useSignalTooltip ? withSignalTooltipOptions(base) : base;
};

export function MvdrResultsPanel() {
  const { mvdrResults, noisySamples, time } = useContext(SimulationContext);

  const limitedLen = useMemo(() => {
    if (!noisySamples.length) return 0;
    return noisySamples.filter((p) => p.x <= time).length;
  }, [noisySamples, time]);

  const waveformData = useMemo(() => {
    if (!mvdrResults || !limitedLen) return null;
    const times = noisySamples.slice(0, limitedLen).map((p) => p.x);
    return {
      datasets: [
        {
          label: "Noisy",
          data: times.map((x, i) => ({ x, y: noisySamples[i]?.y ?? 0 })),
          borderColor: "#e74c3c",
          borderWidth: 1.5,
          pointRadius: 0,
        },
        {
          label: "MVDR Filtered output",
          data: times.map((x, i) => ({ x, y: mvdrResults.filtered[i] ?? 0 })),
          borderColor: "#2ecc71",
          borderWidth: 1.5,
          pointRadius: 0,
        },
      ],
    };
  }, [mvdrResults, noisySamples, limitedLen]);

  const beamData = useMemo(() => {
    if (!mvdrResults) return null;
    return {
      datasets: [
        {
          label: "Beam Power Response",
          data: mvdrResults.angles.map((a, i) => ({
            x: a,
            y: mvdrResults.beamPattern[i],
          })),
          borderColor: "#9b59b6",
          backgroundColor: "rgba(155, 89, 182, 0.15)",
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.2,
        },
      ],
    };
  }, [mvdrResults]);

  if (!mvdrResults) return null;

  const { snrIn, snrOut, numSensors, thetaS, thetaI, diagLoad } = mvdrResults;
  const snrGain = snrOut - snrIn;

  return (
    <div className={styles.stack}>
      <div className={styles.snrRow}>
        <div className={styles.snrCard}>
          <span className={styles.snrLabel}>Input SNR</span>
          <strong>{snrIn.toFixed(2)} dB</strong>
        </div>
        <div className={styles.snrCard}>
          <span className={styles.snrLabel}>MVDR Output SNR</span>
          <strong>{snrOut.toFixed(2)} dB</strong>
        </div>
        <div className={styles.snrCard}>
          <span className={styles.snrLabel}>SNR Improvement</span>
          <strong>{snrGain >= 0 ? "+" : ""}{snrGain.toFixed(2)} dB</strong>
        </div>
      </div>

      <div className={ecgStyles.signalContainer}>
        <h3>
          ECG Signal (MVDR Beamformer){" "}
          <span>
            (M={numSensors}, θ_s={thetaS}°, θ_i={thetaI}°, δ={diagLoad})
          </span>
        </h3>
        <div className="dashboard-chart-shell">
          {waveformData && (
            <Line
              data={waveformData}
              options={chartOptions("Time (s)", "Amplitude (mV)", true)}
            />
          )}
        </div>
      </div>

      <div className={ecgStyles.signalContainer}>
        <h3>Spatial Beam Pattern B(θ)</h3>
        <div className={styles.beamChartShell}>
          {beamData && (
            <Line
              data={beamData}
              options={chartOptions("Angle (degrees)", "Gain Power")}
            />
          )}
        </div>
      </div>

      <div className={ecgStyles.signalContainer}>
        <h3>Covariance Matrix</h3>
        <CovarianceHeatmap matrix={mvdrResults.covariance} />
      </div>
    </div>
  );
}
