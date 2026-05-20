import { useMemo, useContext, useEffect } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import styles from "./ecgFilter.module.css";
import { Line } from "react-chartjs-2";
import { filterSignalFili } from "../../utils/filters";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
);

function resampleForDisplay(data, fsOriginal, fsUser) {
  const step = fsOriginal / fsUser;
  if (step <= 1) return data;
  const out = [];
  for (let i = 0; i < data.length; i += step) {
    out.push(data[Math.floor(i)]);
  }
  return out;
}
function inferFs(dataAll) {
  if (dataAll.length < 2) return 500;
  const dt = dataAll[1].x - dataAll[0].x;
  if (dt > 0) return 1 / dt;
  return 500;
}

export const EcgFilter = () => {
  const { time, originalFs, config, filteredECG, rawSamples, colors, selectedChannels, setFilteredSamples } =
    useContext(SimulationContext);

  const data = useMemo(() => {
    if (!rawSamples.length || !filteredECG) return [];

    const fsOriginal = inferFs(rawSamples);
    const displayData = resampleForDisplay(
      rawSamples,
      fsOriginal,
      originalFs
    ).filter((p) => p.x <= time);

    const cfg = { ...config, Fs: Number(originalFs) };

    // Filter each channel
    return selectedChannels.map((ch) => {
      const y = displayData.map((p) => p[ch]);
      const yFiltered = filterSignalFili(y, cfg);

      return displayData.map((p, i) => ({
        x: p.x,
        y: yFiltered[i],
      }));
    });
  }, [time, originalFs, config, filteredECG, rawSamples, selectedChannels]);

  useEffect(() => {
    //console.log("data after filter", data); 
    setFilteredSamples(data);
  }, [time, originalFs, config, filteredECG, rawSamples, data, setFilteredSamples]);

const datasets = selectedChannels.map((ch, i) => ({
  label: ch,
  data: data[i] || [],
  borderColor: colors[i % colors.length],
  borderWidth: 1,
  pointRadius: 0,
  tension: 0,
}));


  const chartData = { datasets };

  //console.log(chartData);
  // const chartData = {
  //   datasets: [
  //     {
  //       label: "Filtered EEG",
  //       data: data,
  //       borderColor: "blue",
  //       borderWidth: 1,
  //       pointRadius: 0,
  //       tension: 0,
  //     },
  //   ],
  // };

  const options = {
    responsive: true,
    animation: true,
    parsing: false,
    plugins: {
      legend: {
        display: true,
      },
    },
    scales: {
      x: {
        type: "linear",
        title: {
          display: true,
          text: "Time (s)",
          font: {
            size: 13, // ← X-axis label font size
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
        title: {
          display: true,
          text: "Amplitude (mV)",
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
      <h3>
        ECG Signal (Filtered) <span> Filter Used : </span>
        <span>
          {config.characteristic === "FIR"
            ? `Window based FIR - ${config.windowMode} - ${config.filterType}`
            : `Butterworth IIR - ${config.filterType}`}
        </span>
      </h3>

      <Line data={chartData} options={options} />
    </div>
  );
};
