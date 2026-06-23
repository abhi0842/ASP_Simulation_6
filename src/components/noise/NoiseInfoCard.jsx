import { NoiseWaveformPreview } from "./NoiseWaveformPreview.jsx";
import styles from "./noiseInfoCard.module.css";

export function NoiseInfoCard({ info }) {
  return (
    <div className={styles.card} style={{ borderLeftColor: info.accentColor }}>
      <NoiseWaveformPreview type={info.preview} color={info.accentColor} />
    </div>
  );
}
