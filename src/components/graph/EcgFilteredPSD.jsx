import { useContext, useMemo } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import { computePSD } from "../../utils/psd";
import { Line } from "react-chartjs-2";
import styles from "./ecgFilteredPSD.module.css";

export const EcgFilteredPSD = () => {
  const { filteredSamples, generateECG, originalFs, colors, selectedChannels } =
    useContext(SimulationContext);

  const psdData = useMemo(() => {
    if (!generateECG || filteredSamples.length === 0) return null;
   // console.log("filteredSamples", filteredSamples);
    const channel = selectedChannels[0];
    if (!channel) return null;

    //  pick one channel first
    const channelSamples = filteredSamples[0];

    //  extract y-values (time series)
    const signal = channelSamples.map((p) => p.y);

   // console.log("Filtered PSD signal length:", signal.length);

    const data = computePSD(signal, originalFs);
   // console.log("Filtered PSD data", data);

    return { channel, ...data };
  }, [filteredSamples, generateECG, originalFs, selectedChannels]);

  if (!psdData) return null;

  const chartData = {
    datasets: [
      {
        label: `Filtered EEG PSD (${psdData.channel})`,
        data: psdData.psd.map((p, i) => ({
          x: psdData.freqs[i],
          y: p,
        })),
        borderColor: colors[0] || "blue",
        borderWidth: 1,
        pointRadius: 0,
        tension: 0,
      },
    ],
  };

  const options = {
    responsive: true,
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
        max: originalFs / 2,
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
          text: "PSD (dB/Hz) x 10^3",
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
    <div className={styles.signalContainer}>
      <h3>Power Spectral Density — Filtered EEG</h3>
      <Line data={chartData} options={options} />
    </div>
  );
};
