import React, { useContext } from "react";
import styles from "./instruction.module.css";
import { SimulationContext } from "../../context/SimulationContext.jsx";

export const Instruction = () => {
  const { algorithmType } = useContext(SimulationContext);
  const isAR = algorithmType === "AR Process";
  const algorithmLabel =
    algorithmType === "AR Process" ? "LMS Adaptive Filter" : algorithmType;

  return (
    <div className={styles.box}>
      <div className={styles.container}>
        <div className={styles.card}>
          <h1>INSTRUCTIONS</h1>
          <p style={{ fontSize: "13px", color: "#555" }}>
            Mode: <strong>{algorithmLabel}</strong>
          </p>
        </div>
        <div className={styles.card}>
          <p>
            <span>STEP 1: Signal Setup</span>
            <br />
            Select an <b>ECG Dataset</b> from the dropdown menu or upload your own CSV/TXT file.
            Use the <b>Duration</b> slider to limit the length of the data being analyzed, then click{" "}
            <b>&quot;Generate ECG Signal&quot;</b> to plot the raw signal.
          </p>
        </div>
        <div className={styles.card}>
          <p>
            <span>STEP 2: Add Noise (optional)</span>
            <br />
            In the <b>Add Noise</b> section, select <b>Baseline Wander</b>, <b>Powerline (50 Hz)</b>,
            and/or <b>EMG Noise</b>. You must generate the ECG first. Click{" "}
            <b>&quot;Add Noise to Signal&quot;</b> to plot the contaminated ECG in <b>red</b> below the
            clean trace. Unchecking all noise types removes the noisy plot.
          </p>
        </div>
        <div className={styles.card}>
          <p>
            <span>STEP 3: Select Algorithm</span>
            <br />
            Under <b>Algorithm Setup</b>, choose <b>LMS Adaptive Filter</b> or <b>MVDR Beamformer</b> and
            apply that algorithm. Use the separate <b>LMS vs MVDR Comparison</b> box below to configure
            both algorithms and run a side-by-side comparison.
          </p>
        </div>
        <div className={styles.card}>
          <p>
            <span>STEP 4: Configure Parameters</span>
            <br />
            {isAR ? (
              <>
                Set <b>Filter Order (M)</b> and <b>step size μ</b> (LMS — small values recommended).
              </>
            ) : (
              <>
                Set <b>Number of Sensors (M)</b> (2–16), desired angle <b>θ_s</b> (−90° to +90°),
                interferer angle <b>θ_i</b> (−90° to +90°), and diagonal loading <b>δ</b> (0–0.1)
                for the spatial MVDR beamformer.
              </>
            )}
          </p>
        </div>
        <div className={styles.card}>
          <p>
            <span>STEP 5: Apply Algorithm</span>
            <br />
            {isAR ? (
              <>
                Set <b>Filter Order (M)</b> and <b>step size μ</b>, then click{" "}
                <b>&quot;Apply Filter&quot;</b> after adding noise. The filtered ECG appears in{" "}
                <b>green</b> below the noisy trace.
              </>
            ) : (
              <>
                Click <b>&quot;Run MVDR Beamformer&quot;</b> after adding noise. Results include input/output SNR,
                the MVDR-filtered waveform, spatial beam pattern B(θ), and the covariance matrix heatmap.
              </>
            )}
          </p>
        </div>
        <div className={styles.card}>
          <p>
            <span>STEP 6: LMS vs MVDR Comparison (optional)</span>
            <br />
            In the <b>LMS vs MVDR Comparison</b> box below Algorithm Setup, set LMS parameters
            (<b>M</b>, <b>μ</b>) and MVDR parameters (<b>M</b>, <b>θ_s</b>, <b>θ_i</b>, <b>δ</b>),
            then click <b>&quot;Run LMS vs MVDR Comparison&quot;</b> to view the metrics table and
            combined waveform chart.
          </p>
        </div>
      </div>
    </div>
  );
};
