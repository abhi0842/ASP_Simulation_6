import { useState } from "react";
import styles from "./learningPanels.module.css";

const mistakes = [
  { id:1, title:"μ Too Large (LMS-AR)", mistake:"Setting μ > 0.01 for ECG data", effect:"LMS weights diverge — MSE explodes instead of converging", fix:"Use μ < 1/(P × signal_variance). For ECG, try μ ≈ 0.001" },
  { id:2, title:"AR Order Too High", mistake:"Setting P > 10 for short ECG segments", effect:"Overfitting to noise, very slow convergence, high compute cost", fix:"Use P = 4 to 6 for ECG. Higher P needs much more data to converge" },
  { id:3, title:"Too Few Monte Carlo Runs", mistake:"Using MC runs < 20", effect:"MSE learning curve is noisy and unreliable — can't see true convergence", fix:"Use minimum 50 runs for a smooth, statistically reliable MSE average" },
  { id:4, title:"MVDR: Too Few Snapshots", mistake:"Using Snapshots K < 100", effect:"Covariance matrix R is poorly estimated → beampattern becomes inaccurate, null disappears", fix:"Use K ≥ 256 for reliable R estimation and accurate null placement" },
];

const Card = ({ item }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.mistakeCard}>
      <button className={styles.cardHeader} onClick={() => setOpen(o=>!o)}>
        <span>⚠️ {item.title}</span>
        <span className={styles.chevron}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className={styles.cardBody}>
          <div className={styles.mistakeRow}><span className={styles.redBadge}>❌ Mistake</span> {item.mistake}</div>
          <div className={styles.effectRow}><span className={styles.orangeBadge}>💥 Effect</span> {item.effect}</div>
          <div className={styles.fixRow}><span className={styles.greenBadge}>✅ Fix</span> {item.fix}</div>
        </div>
      )}
    </div>
  );
};

export const CommonMistakesPanel = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.panelWrapper}>
      <button className={styles.panelToggle} onClick={() => setOpen(o=>!o)}>
        ⚠️ Common Mistakes &amp; Fixes {open ? "▲" : "▼"}
      </button>
      {open && (
        <div className={styles.panelContent}>
          <p className={styles.panelSubtitle}>Avoid these common parameter mistakes when running LMS-AR and MVDR on ECG data.</p>
          {mistakes.map(m => <Card key={m.id} item={m} />)}
        </div>
      )}
    </div>
  );
};
