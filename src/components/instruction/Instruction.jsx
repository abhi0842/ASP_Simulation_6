import React from "react";
import styles from "./instruction.module.css";

export const Instruction = () => {
  return (
    <div className={styles.box}>
      <div className={styles.container}>
        <div className={styles.card}>
          <h1>INSTRUCTIONS</h1>
          <p style={{ fontSize: "13px", color: "#555" }}>
            Follow these steps to perform the simulation.
          </p>
        </div>
        <div className={styles.card}>
          <p>
            <span>STEP 1: Signal Setup</span><br />
            Select an <b>ECG Dataset</b> from the dropdown menu (e.g., ecg100). This provides the raw signal for the simulation.
          </p>
        </div>
        <div className={styles.card}>
          <p>
            <span>STEP 2: Adjust Parameters</span><br />
            Use the <b>Duration</b> slider to choose how many seconds of data you want to analyze. Then, click the <b>"Generate ECG Signal"</b> button to load and plot the original unfiltered signal.
          </p>
        </div>
        <div className={styles.card}>
          <p>
            <span>STEP 3: Choose Algorithm</span><br />
            In the <b>Algorithm Setup</b> section, choose either the <b>AR Process (LMS)</b> or the <b>MVDR Beamformer</b> from the dropdown menu.
          </p>
        </div>
        <div className={styles.card}>
          <p>
            <span>STEP 4: Configure Algorithm</span><br />
            Adjust the relevant parameters for your chosen algorithm using the sliders (e.g., Number of Samples, Initial values, and Step size for AR; Number of antennas, DOA angles, SNR, and snapshots for MVDR).
          </p>
        </div>
        <div className={styles.card}>
          <p>
            <span>STEP 5: Run and Observe</span><br />
            Click the <b>"Apply Algorithm"</b> button to execute the simulation. Once processing is complete, carefully observe the resulting plots to analyze the algorithm's performance (e.g., MSE and Weight Convergence, or the Spatial Power Spectrum).
          </p>
        </div>
      </div>
    </div>
  );
};
