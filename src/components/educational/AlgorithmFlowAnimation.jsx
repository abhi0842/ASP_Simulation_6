import { useEffect, useState } from "react";
import styles from "./educational.module.css";

export function AlgorithmFlowAnimation({ steps, intervalMs = 1400 }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % steps.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [steps.length, intervalMs]);

  return (
    <div className={styles.flowAnim}>
      <div className={styles.flowSteps}>
        {steps.map((step, i) => (
          <div key={step.id}>
            <div
              className={`${styles.flowStep} ${i === activeIndex ? styles.flowStepActive : ""}`}
            >
              <span className={styles.flowStepIndex}>{i + 1}</span>
              <div>
                <div className={styles.flowStepLabel}>{step.label}</div>
                <div className={styles.flowStepDetail}>{step.detail}</div>
              </div>
            </div>
            {i < steps.length - 1 && <div className={styles.flowArrow}>↓</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
