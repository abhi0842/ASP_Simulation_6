import { useMemo, useContext, useEffect } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import styles from "./ecgNoisy.module.css";
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
import {
  addBaselineWander,
  addPowerlineNoise,
  addMuscleNoise,
} from "../../utils/addNoise";

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

  if (step <= 1) return data; // show all if user wants higher rate

  const out = [];
  for (let i = 0; i < data.length; i += step) {
    out.push(data[Math.floor(i)]);
  }
  return out;
}
function inferFs(dataAll) {
  if (dataAll.length < 2) return 500;
  const dt = dataAll[1].x - dataAll[0].x;
  // console.log(1 / dt);
  if (dt > 0) return 1 / dt;

  return 500;
}

export const EcgNoisy = () => {
  const {
    time,
    originalFs,
    applyNoiseTrigger,
    setApplyNoiseTrigger,
    noise,
    rawSamples,
    selectedChannels,
    setNoisySamples,
    setCleanSignal,
  } = useContext(SimulationContext);

  // toggle when all noise is false
  useEffect(() => {
    if (!noise.baseline && !noise.powerline && !noise.emg) {
      setApplyNoiseTrigger(false);
    }
  }, [noise, setApplyNoiseTrigger]);

  const data = useMemo(() => {
  if (!rawSamples.length || !applyNoiseTrigger) return [];

  const fsOriginal = inferFs(rawSamples);
  const displayData = resampleForDisplay(rawSamples, fsOriginal, originalFs);
  const limited = displayData.filter(p => p.x <= time);
  const channel = selectedChannels[0] || "ECG_I";

  const noisyChannels = {};
  const cleanChannels = {};

  selectedChannels.forEach(ch => {
    const cleanSignal = limited.map(p => p[ch]);
    cleanChannels[ch] = cleanSignal;
    let channelSignal = [...cleanSignal];

    if (noise.baseline) {
      channelSignal = addBaselineWander(channelSignal, originalFs);
    }
    if (noise.powerline) {
      channelSignal = addPowerlineNoise(channelSignal, originalFs);
    }
    if (noise.emg) {
      channelSignal = addMuscleNoise(channelSignal);
    }

    noisyChannels[ch] = channelSignal;
  });

  return limited.map((p, i) => {
    const obj = { x: p.x };
    selectedChannels.forEach(ch => {
      obj[ch] = noisyChannels[ch][i];
    });
    obj._clean = cleanChannels[channel][i];
    return obj;
  });

}, [applyNoiseTrigger, noise, time, originalFs, rawSamples, selectedChannels]);

  useEffect(() => {
    if (!applyNoiseTrigger || !data.length) {
      setNoisySamples([]);
      setCleanSignal([]);
      return;
    }
    const channel = selectedChannels[0] || "ECG_I";
    setNoisySamples(data.map((p) => ({ x: p.x, y: p[channel] })));
    setCleanSignal(data.map((p) => p._clean));
  }, [applyNoiseTrigger, data, selectedChannels, setNoisySamples, setCleanSignal]);

  const datasets = selectedChannels.map((ch) => ({
    label: ch,
    data: data.map((p) => ({ x: p.x, y: p[ch] })),
    borderColor: "red",
    borderWidth: 1,
    pointRadius: 0,
    tension: 0,
  }));

  const chartData = { datasets };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
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
        ECG Signal{" "}
        <span>
          {" "}
          (Contiminated with{" "}
          {noise.baseline
            ? `Baseline Wander ${
                (noise.baseline && noise.powerline) ||
                (noise.baseline && noise.emg)
                  ? ","
                  : ""
              }`
            : ""}{" "}
          {noise.powerline ? `Powerline Noise${noise.emg ? "," : ""}` : ""}{" "}
          {noise.emg ? "Muscle Noise" : ""})
        </span>
      </h3>

      <div className="dashboard-chart-shell">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};
