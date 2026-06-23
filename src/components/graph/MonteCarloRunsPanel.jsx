import { useContext, useState } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import styles from "./monteCarloRunsPanel.module.css";
import { runMonteCarloEcg } from "../../utils/monteCarloEcg.js";
import MonteCarloExplainer from "../MonteCarloExplainer.jsx";

export function MonteCarloRunsPanel({ filterOrder, mu, seedKey = "mc" }) {
  const { cleanSignal, noise, originalFs } = useContext(SimulationContext);
  const [showMonteCarlo, setShowMonteCarlo] = useState(false);
  const [mcRuns, setMcRuns] = useState(50);
  const [mcStatus, setMcStatus] = useState("idle");
  const [mcResults, setMcResults] = useState(null);

  const runMonteCarlo = () => {
    if (!Array.isArray(cleanSignal) || cleanSignal.length === 0) return;
    if (filterOrder == null || mu == null) return;

    setMcStatus("running");
    setMcResults(null);

    requestAnimationFrame(() => {
      try {
        const res = runMonteCarloEcg({
          cleanSignal,
          noise,
          sampleRate: Number(originalFs) || 500,
          mu,
          filterOrder,
          N_MC: mcRuns,
          seedKey,
        });
        setMcResults(res);
        setMcStatus("completed");
      } catch {
        setMcStatus("idle");
      }
    });
  };

  if (filterOrder == null || mu == null) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Monte Carlo Runs &amp; Statistical Analysis</h3>
        <button
          type="button"
          className={styles.toggleBtn}
          onClick={() => setShowMonteCarlo((v) => !v)}
        >
          {showMonteCarlo ? "Hide" : "Show"}
        </button>
      </div>

      {showMonteCarlo && (
        <div className={styles.body}>
          <div className={styles.definitionBox}>
            <strong>What is Monte Carlo?</strong>
            <p>
              Monte Carlo simulation repeats the LMS denoising experiment <em>N</em><sub>MC</sub> times,
              each with a new random noise realization. Instead of trusting a single run, we average
              the squared-error curves and compute confidence intervals — proving performance is
              statistically robust (Law of Large Numbers).
            </p>

            <div className={styles.theoryBlock}>
              <strong className={styles.theoryTitle}>Key formulas</strong>

              <div className={styles.formulaRow}>
                <span className={styles.formula}>e²[n] = (d[n] − ŷ[n])²</span>
                <span className={styles.formulaNote}>Instantaneous squared error per trial</span>
              </div>

              <div className={styles.formulaRow}>
                <span className={styles.formula}>
                  J<sub>MC</sub>[n] = (1/N<sub>MC</sub>) Σ<sub>r=1</sub>
                  <sup>N<sub>MC</sub></sup> e²<sub>r</sub>[n]
                </span>
                <span className={styles.formulaNote}>Ensemble mean MSE at sample n</span>
              </div>

              <div className={styles.formulaRow}>
                <span className={styles.formula}>
                  σ[n] = √[(1/(N<sub>MC</sub>−1)) Σ (e²<sub>r</sub>[n] − J<sub>MC</sub>[n])²]
                </span>
                <span className={styles.formulaNote}>Sample standard deviation across trials</span>
              </div>

              <div className={styles.formulaRow}>
                <span className={styles.formula}>SE[n] = σ[n] / √N<sub>MC</sub></span>
                <span className={styles.formulaNote}>Standard error of the mean</span>
              </div>

              <div className={styles.formulaRow}>
                <span className={styles.formula}>CI<sub>95%</sub>[n] = J<sub>MC</sub>[n] ± 1.96 · SE[n]</span>
                <span className={styles.formulaNote}>
                  95% confidence interval — narrows as N<sub>MC</sub> increases
                </span>
              </div>
            </div>
          </div>

          <div className={styles.controls}>
            <label className={styles.label}>
              Number of Trials (N_MC): <span className={styles.value}>{mcRuns} runs</span>
            </label>
            <input
              type="range"
              min="10"
              max="150"
              step="10"
              value={mcRuns}
              disabled={mcStatus === "running"}
              onChange={(e) => setMcRuns(Number(e.target.value))}
            />
            <button
              type="button"
              className={styles.runBtn}
              disabled={mcStatus === "running"}
              onClick={runMonteCarlo}
            >
              {mcStatus === "running" ? "Running…" : "Run Monte Carlo"}
            </button>
          </div>

          {mcStatus === "completed" && mcResults?.squaredErrorMatrix?.length > 0 && (
            <MonteCarloExplainer
              trials={mcRuns}
              avgMSE={mcResults.avgMSE}
              confidenceUpper={mcResults.confidenceUpper ?? mcResults.upper95}
              confidenceLower={mcResults.confidenceLower ?? mcResults.lower95}
              squaredErrorMatrix={mcResults.squaredErrorMatrix}
              sampleRate={mcResults.sampleRate || Number(originalFs) || 500}
            />
          )}
        </div>
      )}
    </div>
  );
}
