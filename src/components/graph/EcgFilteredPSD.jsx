import { useContext, useMemo } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import { computePSD } from "../../utils/psd.js";
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
import styles from "./ecgFilteredPSD.module.css";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

export const EcgFilteredPSD = () => {
  const { filteredSamples, generateECG, originalFs } = useContext(SimulationContext);

  const psdData = useMemo(() => {
    if (!generateECG || filteredSamples.length === 0) return null;
    const signal = filteredSamples.map((p) => p.y);
    return computePSD(signal, originalFs);
  }, [filteredSamples, generateECG, originalFs]);

  if (!psdData) return null;

  const chartData = {
    datasets: [
      {
        label: "Filtered ECG PSD",
        data: psdData.psd.map((p, i) => ({ x: psdData.freqs[i], y: p })),
        borderColor: "green",
        borderWidth: 1,
        pointRadius: 0,
        tension: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: true,
    parsing: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        type: "linear",
        min: 0,
        max: originalFs / 2,
        title: { display: true, text: "Frequency (Hz)", font: { size: 13, weight: "bold" } },
        ticks: { font: { size: 13 } },
      },
      y: {
        min: 0,
        title: { display: true, text: "PSD (V²/Hz)", font: { size: 13, weight: "bold" } },
        ticks: { font: { size: 12 } },
      },
    },
  };

  return (
    <div className={styles.signalContainer}>
      <h3>Power Spectral Density — Filtered ECG</h3>
      <div className={styles.chartShell}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};
