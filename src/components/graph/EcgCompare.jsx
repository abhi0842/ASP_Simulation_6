import { useContext, useMemo } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import styles from "./ecgCompare.module.css";
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

function noiseSummary(noise) {
  const parts = [];
  if (noise.baseline) parts.push("Baseline Wander");
  if (noise.powerline) parts.push("Powerline Noise");
  if (noise.emg) parts.push("Muscle Noise");
  return parts.join(", ");
}

export const EcgCompare = () => {
  const {
    filteredECG,
    noisySamples,
    filteredSamples,
    noise,
    appliedFilterOrderM,
    appliedStepSizeMu,
  } = useContext(SimulationContext);

  const chartData = useMemo(() => {
    if (!noisySamples.length || !filteredSamples.length) return null;

    return {
      datasets: [
        {
          label: "Noisy",
          data: noisySamples.map((p) => ({ x: p.x, y: p.y })),
          borderColor: "#e74c3c",
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0,
        },
        {
          label: "LMS Filtered output",
          data: filteredSamples.map((p) => ({ x: p.x, y: p.y })),
          borderColor: "#2ecc71",
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0,
        },
      ],
    };
  }, [noisySamples, filteredSamples]);

  const options = withSignalTooltipOptions({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    parsing: false,
    plugins: { legend: { display: true, position: "top" } },
    scales: {
      x: {
        type: "linear",
        title: { display: true, text: "Time (s)", font: { size: 13, weight: "bold" } },
        ticks: { font: { size: 13 } },
      },
      y: {
        title: { display: true, text: "Amplitude (mV)", font: { size: 13, weight: "bold" } },
        ticks: { font: { size: 12 } },
      },
    },
  });

  if (!filteredECG || !chartData) return null;

  const noiseLabel = noiseSummary(noise);

  return (
    <div className={styles.signalContainer}>
      <h3>
        ECG Signal Comparison{" "}
        <span>
          (Noisy vs Filtered — LMS Adaptive Filter — μ={appliedStepSizeMu} — M={appliedFilterOrderM})
        </span>
      </h3>
      {noiseLabel && (
        <p className={styles.subtitle}>Contaminated with {noiseLabel}</p>
      )}
      <div className="dashboard-chart-shell">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};
