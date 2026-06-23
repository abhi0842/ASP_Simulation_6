import { useContext, useState, useMemo, useEffect } from "react";
import { SimulationContext } from "../../context/SimulationContext";
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
import zoomPlugin from "chartjs-plugin-zoom";
import styles from "./adaptiveWeightEvolution.module.css";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

export const AdaptiveWeightEvolution = () => {
  const { diagnostics, filterOrderM } = useContext(SimulationContext);
  const maxCoeffs = diagnostics?.weightsHistory?.[0]?.length || filterOrderM || 1;
  const [visibleCoeffs, setVisibleCoeffs] = useState(Math.min(5, maxCoeffs));

  useEffect(() => {
    setVisibleCoeffs(Math.min(5, maxCoeffs));
  }, [maxCoeffs, diagnostics]);

  const chartData = useMemo(() => {
    if (!diagnostics?.weightsHistory) return null;

    const { weightsHistory } = diagnostics;
    const numCoeffs = Math.min(visibleCoeffs, weightsHistory[0]?.length || 0);
    const colors = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22", "#34495e"];

    const datasets = Array.from({ length: numCoeffs }, (_, i) => ({
      label: `w${i}`,
      data: weightsHistory.map((_, iter) => ({ x: iter, y: weightsHistory[iter][i] })),
      borderColor: colors[i % colors.length],
      backgroundColor: `${colors[i % colors.length]}20`,
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0.1,
      fill: false,
    }));

    return { datasets };
  }, [diagnostics, visibleCoeffs]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      parsing: false,
      plugins: {
        legend: { display: true, position: "top" },
        tooltip: { mode: "index", intersect: false },
        zoom: {
          pan: { enabled: true, mode: "x" },
          zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" },
        },
      },
      scales: {
        x: {
          type: "linear",
          title: { display: true, text: "Iteration" },
          ticks: { maxTicksLimit: 10 },
        },
        y: {
          title: { display: true, text: "Coefficient Value" },
        },
      },
    }),
    []
  );

  if (!diagnostics?.weightsHistory) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Adaptive Weight Evolution (LMS)</h3>
        <div className={styles.controls}>
          <label htmlFor="visibleCoeffs">Show Coefficients:</label>
          <input
            id="visibleCoeffs"
            type="number"
            min="1"
            max={maxCoeffs}
            value={visibleCoeffs}
            onChange={(e) => {
              const n = Number(e.target.value);
              setVisibleCoeffs(Math.min(maxCoeffs, Math.max(1, n || 1)));
            }}
          />
        </div>
      </div>
      <div className={styles.chartShell}>
        {chartData && <Line data={chartData} options={options} />}
      </div>
    </div>
  );
};
