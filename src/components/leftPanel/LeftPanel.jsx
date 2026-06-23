import { useContext, useState } from "react";
import styles from "./leftPanel.module.css";
import { EcgUnfilter } from "../graph/EcgUnfilter.jsx";
import { EcgNoisy } from "../graph/EcgNoisy.jsx";
import { EcgFilter } from "../graph/EcgFilter.jsx";
import { EcgCompare } from "../graph/EcgCompare.jsx";
import { LmsVsMvdrPanel } from "../graph/LmsVsMvdrPanel.jsx";
import { MvdrResultsPanel } from "../graph/MvdrResultsPanel.jsx";
import { AdaptiveWeightEvolution } from "../educational/AdaptiveWeightEvolution.jsx";
import { EcgUnfilteredPSD } from "../graph/EcgUnfilteredPSD.jsx";
import { EcgFilteredPSD } from "../graph/EcgFilteredPSD.jsx";
import { MonteCarloRunsPanel } from "../graph/MonteCarloRunsPanel.jsx";
import { SimulationContext } from "../../context/SimulationContext.jsx";

export const LeftPanel = () => {
  const {
    generateECG,
    applyNoiseTrigger,
    filteredECG,
    mvdrApplied,
    compareApplied,
    compareResults,
    algorithmType,
    applypsdTrigger,
    appliedFilterOrderM,
    appliedStepSizeMu,
    filterOrderM,
    stepSizeMu,
    mvdrNumSensors,
    mvdrThetaS,
    mvdrThetaI,
    mvdrDiagLoad,
  } = useContext(SimulationContext);
  const isLms = algorithmType === "AR Process";
  const isMvdr = algorithmType === "MVDR Beamformer";
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  return (
    <div className={styles.leftPanelContainer}>
      <div className={styles.mainStack}>
        {applypsdTrigger && ((isLms && filteredECG) || (isMvdr && mvdrApplied)) && (
          <div className={styles.psdContainer}>
            <EcgUnfilteredPSD />
            <EcgFilteredPSD />
          </div>
        )}
        {generateECG && (
          <div className={styles.chartSection}>
            <EcgUnfilter />
          </div>
        )}
        {applyNoiseTrigger && (
          <div className={styles.chartSection}>
            <EcgNoisy />
          </div>
        )}
        {isLms && filteredECG && (
          <div className={styles.chartSection}>
            <EcgFilter />
          </div>
        )}
        {isLms && filteredECG && (
          <div className={styles.chartSection}>
            <EcgCompare />
          </div>
        )}
        {isLms && filteredECG && (
          <div className={styles.chartSection}>
            <div className={styles.moreDetails}>
              <div className={styles.moreDetailsHeader}>
                <h3>More Details</h3>
                <button
                  type="button"
                  className={styles.moreDetailsToggle}
                  onClick={() => setShowMoreDetails((v) => !v)}
                >
                  {showMoreDetails ? "Hide" : "Show"}
                </button>
              </div>
              {showMoreDetails && <AdaptiveWeightEvolution />}
            </div>
          </div>
        )}
        {isLms && filteredECG && (
          <div className={styles.chartSection}>
            <MonteCarloRunsPanel
              filterOrder={appliedFilterOrderM}
              mu={appliedStepSizeMu}
              seedKey={`lms-${appliedFilterOrderM}-${appliedStepSizeMu}`}
            />
          </div>
        )}
        {isMvdr && mvdrApplied && (
          <div className={styles.chartSection}>
            <MvdrResultsPanel />
          </div>
        )}
        {isMvdr && mvdrApplied && (
          <div className={styles.chartSection}>
            <MonteCarloRunsPanel
              filterOrder={filterOrderM}
              mu={stepSizeMu}
              seedKey={`mvdr-${mvdrNumSensors}-${mvdrThetaS}-${mvdrThetaI}-${mvdrDiagLoad}`}
            />
          </div>
        )}
        {compareApplied && (
          <div className={styles.chartSection}>
            <LmsVsMvdrPanel />
          </div>
        )}
        {compareApplied && compareResults && (
          <div className={styles.chartSection}>
            <MonteCarloRunsPanel
              filterOrder={compareResults.lmsParams?.M}
              mu={compareResults.lmsParams?.mu}
              seedKey={`compare-${compareResults.lmsParams?.M}-${compareResults.lmsParams?.mu}`}
            />
          </div>
        )}
      </div>
    </div>
  );
};
