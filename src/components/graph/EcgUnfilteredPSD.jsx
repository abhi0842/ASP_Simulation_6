import { useContext, useMemo } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import { computePSD } from "../../utils/psd";
import { Line } from "react-chartjs-2";
import styles from "./ecgUnfilteredPSD.module.css";

export const EcgUnfilteredPSD = () => {
  const { rawSamples, generateECG, originalFs, colors, selectedChannels } =
    useContext(SimulationContext);

  const psdData = useMemo(() => {
    if (!generateECG || rawSamples.length === 0) return null;

    const channel = selectedChannels[0];
    if (!channel) return null;
    //console.log("rawSamples", rawSamples);
   //console.log("channel", channel);
    const signal = rawSamples.map((p) => p[channel]);
    const data = computePSD(signal, originalFs);
   // console.log("unfiltered psdData", data);
    return { channel, ...data };
  }, [rawSamples, generateECG, originalFs, selectedChannels]);

  if (!psdData) return null;

  const chartData = {
    datasets: [
      {
        label: `Unfiltered EEG PSD (${psdData.channel})`,
        data: psdData.psd.map((p, i) => ({
          x: psdData.freqs[i],
          y: p,
        })),
        borderColor: colors[0] || "#005FA7",
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
      <h3>Power Spectral Density — Unfiltered EEG</h3>
      <Line data={chartData} options={options} />
    </div>
  );
};

