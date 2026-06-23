import { useMemo, useContext, useEffect } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import styles from "./ecgFilter.module.css";
import { Line } from "react-chartjs-2";
import { filterSignalLMS, calculateMSE } from "../../utils/filters";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

export const EcgFilter = () => {
  const {
    filteredECG,
    noisySamples,
    cleanSignal,
    appliedFilterOrderM,
    appliedStepSizeMu,
    setFilteredSamples,
    setDiagnostics,
  } = useContext(SimulationContext);

  const filterResult = useMemo(() => {
    if (
      !filteredECG ||
      appliedFilterOrderM == null ||
      appliedStepSizeMu == null ||
      !noisySamples.length ||
      !cleanSignal.length
    ) {
      return null;
    }

    const noisyECG = noisySamples.map((p) => p.y);
    const cleanGroundTruth = cleanSignal.slice(0, noisyECG.length);
    const noiseReference = noisyECG.map((v, i) => v - (cleanGroundTruth[i] || 0));

    const result = filterSignalLMS(noiseReference, noisyECG, {
      filterOrder: appliedFilterOrderM,
      stepSize: appliedStepSizeMu,
      returnDiagnostics: true,
    });

    const cleanedSignal = result.Yfiltered;
    const mse = calculateMSE(cleanGroundTruth, cleanedSignal);
    console.info(
      `LMS filter applied — M=${appliedFilterOrderM}, μ=${appliedStepSizeMu}, MSE=${mse.toFixed(6)}`
    );

    return {
      filteredData: noisySamples.map((p, i) => ({ x: p.x, y: cleanedSignal[i] ?? 0 })),
      diagnostics: {
        ...result.diagnostics,
        algorithm: "LMS",
      },
    };
  }, [filteredECG, noisySamples, cleanSignal, appliedFilterOrderM, appliedStepSizeMu]);

  useEffect(() => {
    if (!filterResult) {
      setFilteredSamples([]);
      setDiagnostics(null);
      return;
    }
    setFilteredSamples(filterResult.filteredData);
    setDiagnostics(filterResult.diagnostics);
  }, [filterResult, setFilteredSamples, setDiagnostics]);

  const filteredData = filterResult?.filteredData ?? [];

  const chartData = {
    datasets: [
      {
        label: "Filtered ECG",
        data: filteredData,
        borderColor: "#2ecc71",
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    parsing: false,
    plugins: { legend: { display: true } },
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
  };

  if (!filteredECG) return null;

  return (
    <div className={styles.signalContainer}>
      <h3>
        ECG Signal (Filtered){" "}
        <span>(LMS Adaptive Filter — μ={appliedStepSizeMu} — M={appliedFilterOrderM})</span>
      </h3>
      <div className="dashboard-chart-shell">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};
