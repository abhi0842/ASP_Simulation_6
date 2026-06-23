import styles from "./covarianceHeatmap.module.css";

export function CovarianceHeatmap({ matrix }) {
  if (!matrix?.length) return null;

  const M = matrix.length;
  let maxVal = 0;
  for (let i = 0; i < M; i++) {
    for (let j = 0; j < M; j++) {
      if (matrix[i][j] > maxVal) maxVal = matrix[i][j];
    }
  }

  const getCellColor = (val) => {
    const ratio = maxVal > 0 ? val / maxVal : 0;
    const h = 180 + ratio * 100;
    const s = 35 + ratio * 45;
    const l = 88 - ratio * 42;
    return `hsl(${h}, ${s}%, ${l}%)`;
  };

  return (
    <div className={styles.wrapper}>
      <p className={styles.caption}>Estimated Spatial Covariance Matrix R (absolute magnitudes)</p>
      <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${M}, 1fr)` }}>
        {matrix.map((row, i) =>
          row.map((val, j) => (
            <div
              key={`${i}-${j}`}
              className={styles.cell}
              style={{
                backgroundColor: getCellColor(val),
                border: i === j ? "1px solid #1D7480" : "1px solid #e2e8f0",
              }}
              title={`R[${i}][${j}] = ${val.toFixed(4)}`}
            >
              {val.toFixed(2)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
