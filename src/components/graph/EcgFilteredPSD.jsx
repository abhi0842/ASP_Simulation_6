import { useContext, useMemo } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import { computePSD } from "../../utils/psd";
import { Line } from "react-chartjs-2";
import styles from "./psdCard.module.css";

export const EcgFilteredPSD = () => {
  const { filteredSamples, algoResults, generateECG, originalFs } =
    useContext(SimulationContext);

  const psdData = useMemo(() => {
    if (!generateECG) return null;

    let signal = [];
    if (filteredSamples?.length > 0) {
      signal = filteredSamples.map((p) => p.y);
    } else if (algoResults?.type === "AR Process") {
      signal = algoResults.data.predicted.map((p) => p.y);
    } else if (algoResults?.type === "MVDR Beamformer") {
      signal = algoResults.data.denoised.map((p) => p.y);
    }

    if (signal.length < 2) return null;
    return computePSD(signal, Number(originalFs));
  }, [filteredSamples, algoResults, generateECG, originalFs]);

  if (!psdData) {
    return (
      <div className={styles.card}>
        <h3 className={styles.title}>Power Spectral Density — Processed ECG</h3>
        <p className={styles.hint}>Apply an algorithm first to compare processed signal PSD.</p>
      </div>
    );
  }

  const fs = Number(originalFs);

  const chartData = {
    datasets: [
      {
        label: "Processed ECG PSD",
        data: psdData.psd.map((p, i) => ({ x: psdData.freqs[i], y: p })),
        borderColor: "#2dc653",
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
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        type: "linear",
        min: 0,
        max: fs / 2,
        title: {
          display: true,
          text: "Frequency (Hz)",
          font: {
            size: 13,
            weight: "bold",
          },
        },
        ticks: {
          font: {
            size: 13,
          },
        },
      },
      y: {
        min: 0,
        title: {
          display: true,
          text: "PSD (V²/Hz)",
          font: {
            size: 13,
            weight: "bold",
          },
        },
        ticks: {
          font: {
            size: 12,
          },
        },
      },
    },
  };

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Power Spectral Density — Processed ECG</h3>
      <div className={styles.chartShell}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};
