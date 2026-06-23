import { useState } from "react";
import { VARIABLE_DEFINITIONS } from "../../data/educationalContent.js";
import styles from "./educational.module.css";

const VAR_KEYS_IN_EQUATION = {
  "w[n+1]": "w",
  "w[n]": "w",
  "w": "w_mvdr",
  "μ": "mu",
  "e[n]": "e",
  "x[n]": "x",
  "R⁻¹": "R",
  "R": "R",
  "d": "d_steer",
};

function parseEquation(equation) {
  const parts = [];
  const regex = /(w\[n\+1\]|w\[n\]|e\[n\]|x\[n\]|R⁻¹|μ|w|R|d)/g;
  let last = 0;
  let match;
  while ((match = regex.exec(equation)) !== null) {
    if (match.index > last) {
      parts.push({ type: "text", value: equation.slice(last, match.index) });
    }
    parts.push({ type: "var", value: match[0] });
    last = match.index + match[0].length;
  }
  if (last < equation.length) {
    parts.push({ type: "text", value: equation.slice(last) });
  }
  return parts;
}

export function InteractiveEquation({ equation, partKeys = [] }) {
  const [activeKey, setActiveKey] = useState(null);
  const parts = parseEquation(equation);

  const resolveKey = (token) => {
    if (VAR_KEYS_IN_EQUATION[token]) return VAR_KEYS_IN_EQUATION[token];
    const fromList = partKeys.find((k) => VARIABLE_DEFINITIONS[k]?.symbol === token);
    return fromList || null;
  };

  const activeDef = activeKey ? VARIABLE_DEFINITIONS[activeKey] : null;

  return (
    <div className={styles.equationBox}>
      <div className={styles.equationText}>
        {parts.map((part, i) => {
          if (part.type === "text") return <span key={i}>{part.value}</span>;
          const key = resolveKey(part.value);
          if (!key) return <span key={i}>{part.value}</span>;
          return (
            <button
              key={i}
              type="button"
              className={`${styles.varBtn} ${activeKey === key ? styles.varBtnActive : ""}`}
              onClick={() => setActiveKey(activeKey === key ? null : key)}
              aria-pressed={activeKey === key}
            >
              {part.value}
            </button>
          );
        })}
      </div>
      {activeDef && (
        <dl className={styles.varDetail}>
          <dt>{activeDef.label} ({activeDef.symbol})</dt>
          <dd>{activeDef.meaning}</dd>
          <dt>Effect</dt>
          <dd>{activeDef.effect}</dd>
          <dt>Recommended</dt>
          <dd>{activeDef.recommended}</dd>
          <dt>If increased</dt>
          <dd>{activeDef.increase}</dd>
          <dt>If decreased</dt>
          <dd>{activeDef.decrease}</dd>
        </dl>
      )}
    </div>
  );
}
