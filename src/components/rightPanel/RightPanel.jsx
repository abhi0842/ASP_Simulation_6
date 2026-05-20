import { useContext, useState, useEffect, useRef } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import styles from "./rightPanel.module.css";
import Swal from "sweetalert2";
import { LOBE_CHANNEL_MAP } from "../../context/SimulationContext";
import { runLMS_AR, runMVDR, buildDeterministicSeed } from "../../utils/algorithms";

export const RightPanel = () => {
  const {
    time,
    setTime,
    setGenerateECG,
    originalFs,
    csvFilePath,
    prevPathRef,
    setCsvFilePath,
    generateECG,
    algorithmType,
    setAlgorithmType,
    setAlgoResults
  } = useContext(SimulationContext);

  // AR Process inputs
  const [arN, setArN] = useState(500);
  const [arU1, setArU1] = useState(0.5);
  const [arU2, setArU2] = useState(1);
  const [arMu, setArMu] = useState(0.1);

  // MVDR inputs
  const [mvdrN, setMvdrN] = useState(10);
  const [mvdrThetaS, setMvdrThetaS] = useState(45);
  const [mvdrThetaI, setMvdrThetaI] = useState(-45);
  const [mvdrSs, setMvdrSs] = useState(4096);
  const [mvdrSnrS, setMvdrSnrS] = useState(20);
  const [mvdrSnrI, setMvdrSnrI] = useState(25);
  const [mvdrNumRuns, setMvdrNumRuns] = useState(50);
  const lastRunRef = useRef({ key: "", payload: null });

  const runFilter = () => {
    if (!generateECG) {
      Swal.fire({
        icon: "info",
        title: "Oops...",
        text: "Please generate EEG signal first!",
      });
      return;
    }

    const runConfig =
      algorithmType === "AR Process"
        ? {
            algorithmType,
            arN: Number(arN),
            arU1: Number(arU1),
            arU2: Number(arU2),
            arMu: Number(arMu),
          }
        : {
            algorithmType,
            mvdrN: Number(mvdrN),
            mvdrThetaS: Number(mvdrThetaS),
            mvdrThetaI: Number(mvdrThetaI),
            mvdrSs: Number(mvdrSs),
            mvdrSnrS: Number(mvdrSnrS),
            mvdrSnrI: Number(mvdrSnrI),
            mvdrNumRuns: Number(mvdrNumRuns),
          };
    const runKey = JSON.stringify(runConfig);
    if (lastRunRef.current.key === runKey && lastRunRef.current.payload) {
      setAlgoResults(lastRunRef.current.payload);
      return;
    }

    if (algorithmType === "AR Process") {
      const runSeed = buildDeterministicSeed(runConfig);
      const results = runLMS_AR(
        Number(arN),
        [Number(arU1), Number(arU2)],
        Number(arMu),
        runSeed
      );
      const payload = { type: "AR Process", data: results };
      lastRunRef.current = { key: runKey, payload };
      setAlgoResults(payload);
    } else {
      const results = runMVDR(
        Number(mvdrN),
        Number(mvdrThetaS),
        Number(mvdrThetaI),
        Number(mvdrSs),
        [Number(mvdrSnrS), Number(mvdrSnrI)],
        Number(mvdrNumRuns)
      );
      const payload = { type: "MVDR Beamformer", data: results };
      lastRunRef.current = { key: runKey, payload };
      setAlgoResults(payload);
    }
  };

  useEffect(() => {
    if (prevPathRef.current !== csvFilePath) {
      setAlgoResults(null);
      prevPathRef.current = csvFilePath;
    }
  }, [csvFilePath, prevPathRef, setAlgoResults]);

  return (
    <div className={styles.rightPanelContainer}>
      <div className={styles.right}>
        <h2>ECG Signal & Filter Controls</h2>

        <div className={styles.box}>
          <h3>Signal Setup</h3>
          <label>Select ECG Dataset</label>
          <select
            value={csvFilePath}
            onChange={(e) => setCsvFilePath(e.target.value)}
          >
            <option value={"/ecg100.csv"}>ECG Dataset 1 (ecg100)</option>
            <option value={"/ecg200.csv"}>ECG Dataset 2 (ecg200)</option>
            <option value={"/ecg300.csv"}>ECG Dataset 3 (ecg300)</option>
          </select>

          <label>Duration : <span id="demo">{time} seconds</span> </label>
          <input
            type="range"
            min="1"
            max="70"
            value={time}
            onChange={(e) => setTime(Number(e.target.value))}
          />

          <label>Sampling Rate: <span id="demo">{originalFs} Hz</span> </label>

          <button onClick={() => setGenerateECG(true)}>
            Generate ECG Signal
          </button>
        </div>

        <div className={styles.box}>
          <h3>Algorithm Setup</h3>

          <label>Algorithm</label>
          <select
            value={algorithmType}
            onChange={(e) => setAlgorithmType(e.target.value)}
          >
            <option value="AR Process">AR Process (LMS)</option>
            <option value="MVDR Beamformer">MVDR Beamformer</option>
          </select>

          {algorithmType === "AR Process" && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              <label>Number of samples (N): {arN}</label>
              <input type="range" min="10" max="1000" step="1" value={arN} onChange={e => setArN(e.target.value)} />
              
              <label>Initial value u1: {arU1}</label>
              <input type="range" min="0" max="1" step="0.01" value={arU1} onChange={e => setArU1(e.target.value)} />

              <label>Initial value u2: {arU2}</label>
              <input type="range" min="0" max="1" step="0.01" value={arU2} onChange={e => setArU2(e.target.value)} />

              <label>Step size (mu): {arMu}</label>
              <input type="range" min="0.001" max="0.1" step="0.001" value={arMu} onChange={e => setArMu(e.target.value)} />
            </div>
          )}

          {algorithmType === "MVDR Beamformer" && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              <label>Number of antennas (N): {mvdrN}</label>
              <input type="range" min="8" max="12" step="1" value={mvdrN} onChange={e => setMvdrN(e.target.value)} />

              <label>DOA of signal (θ_s): {mvdrThetaS}</label>
              <input type="range" min="0" max="90" step="1" value={mvdrThetaS} onChange={e => setMvdrThetaS(e.target.value)} />

              <label>DOA of interference (θ_i): {mvdrThetaI}</label>
              <input type="range" min="-90" max="0" step="1" value={mvdrThetaI} onChange={e => setMvdrThetaI(e.target.value)} />

              <label>Number of snapshots: {mvdrSs}</label>
              <input type="range" min="1024" max="8192" step="1" value={mvdrSs} onChange={e => setMvdrSs(e.target.value)} />

              <label>SNR (dB): {mvdrSnrS}</label>
              <input type="range" min="0" max="40" step="1" value={mvdrSnrS} onChange={e => setMvdrSnrS(e.target.value)} />

              <label>INR (dB): {mvdrSnrI}</label>
              <input type="range" min="10" max="40" step="1" value={mvdrSnrI} onChange={e => setMvdrSnrI(e.target.value)} />

              <label>Number of Monte Carlo runs: {mvdrNumRuns}</label>
              <input type="range" min="10" max="100" step="1" value={mvdrNumRuns} onChange={e => setMvdrNumRuns(e.target.value)} />
            </div>
          )}

          <div className={styles.psdContainer} style={{ marginTop: '15px' }}>
            <button onClick={runFilter}>Apply Algorithm</button>
          </div>
        </div>
      </div>
    </div>
  );
};
