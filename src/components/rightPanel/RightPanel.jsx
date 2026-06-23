import { useContext, useEffect, useState } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import styles from "./rightPanel.module.css";
import Swal from "sweetalert2";
import { ECG_DATASET_OPTIONS, pathForDatasetId, publicAssetPath } from "../../utils/ecgDatasets.js";
import { runFullPipeline } from "../../utils/pipeline.js";
import { buildNoiseParams, getSNRdB, runSpatialMVDR } from "../../utils/spatialMvdr.js";
import { filterSignalLMS } from "../../utils/filters.js";
import { NOISE_TYPES } from "../../data/noiseInfo.js";
import { NoiseInfoCard } from "../noise/NoiseInfoCard.jsx";

export const RightPanel = () => {
  const {
    time, setTime, setGenerateECG, originalFs,
    csvFilePath, prevPathRef, setCsvFilePath,
    generateECG, algorithmType, setAlgorithmType,
    filteredECG,
    noise, setNoise, setApplyNoiseTrigger,
    signalType, setSignalType,
    uploadedSignalName, setUploadedSignalName,
    setUploadedSignalData,
    parseUploadedText, commitParsedSignal,
    markAction,
    rawSamples, selectedChannels, applyNoiseTrigger,
    cleanSignal, noisySamples,
    arOrder, setArOrder, arOrderMax, setArOrderMax,
    stepSizeMu, setStepSizeMu, filterOrderM, setFilterOrderM,
    mvdrNumSensors, setMvdrNumSensors,
    mvdrThetaS, setMvdrThetaS,
    mvdrThetaI, setMvdrThetaI,
    mvdrDiagLoad, setMvdrDiagLoad,
    setMvdrResults, setMvdrApplied, mvdrApplied,
    setCompareResults, setCompareApplied,
    nMc, setNMc, diagLoading, setDiagLoading,
    useAicOrder, setUseAicOrder,
    setPipelineResults, pipelineRunning, setPipelineRunning,
    setFilteredECG,
    setDiagnostics,
    setAppliedStepSizeMu,
    setAppliedFilterOrderM,
    setFilteredSamples,
    setApplypsdTrigger,
  } = useContext(SimulationContext);

  const [compareFilterOrderM, setCompareFilterOrderM] = useState(32);
  const [compareStepSizeMu, setCompareStepSizeMu] = useState(0.01);
  const [compareMvdrNumSensors, setCompareMvdrNumSensors] = useState(4);
  const [compareMvdrThetaS, setCompareMvdrThetaS] = useState(0);
  const [compareMvdrThetaI, setCompareMvdrThetaI] = useState(30);
  const [compareMvdrDiagLoad, setCompareMvdrDiagLoad] = useState(0.01);

  const signalOptions = [
    ...ECG_DATASET_OPTIONS.map((o) => ({
      id: o.id,
      label: o.label,
      path: publicAssetPath(o.file),
    })),
    { id: "upload", label: "Upload your own (CSV/TXT)", path: "" },
  ];

  const onSignalTypeChange = (type) => {
    setSignalType(type);
    if (type !== "upload") {
      setCsvFilePath(pathForDatasetId(type));
    }
    setGenerateECG(false);
    setApplyNoiseTrigger(false);
    setFilteredECG(false);
    setAppliedStepSizeMu(null);
    setAppliedFilterOrderM(null);
    setMvdrApplied(false);
    setMvdrResults(null);
    setCompareApplied(false);
    setCompareResults(null);
    setApplypsdTrigger(false);
    setFilteredSamples([]);
    setDiagnostics(null);
  };

  const clearMvdr = () => {
    setMvdrApplied(false);
    setMvdrResults(null);
  };

  const clearCompare = () => {
    setCompareApplied(false);
    setCompareResults(null);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseUploadedText(text);
    if (!parsed) {
      Swal.fire({ icon: "error", title: "Invalid file", text: "Upload CSV/TXT with time and signal columns." });
      return;
    }
    setUploadedSignalName(file.name);
    setUploadedSignalData(parsed);
    setSignalType("upload");
    commitParsedSignal(parsed);
  };

  const isLmsAr = algorithmType === "AR Process";
  const isMvdrOnly = algorithmType === "MVDR Beamformer";
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const sanitizeLmsMu = (raw) => {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return 0.01;
    return clamp(n, 1e-8, 0.1);
  };

  const selectedNoiseCount = [noise.baseline, noise.powerline, noise.emg].filter(Boolean).length;

  const noiseTrigger = () => {
    if (!generateECG) { Swal.fire({ icon: "info", title: "Oops...", text: "Please generate ECG signal first!" }); return; }
    if (!noise.baseline && !noise.powerline && !noise.emg) { Swal.fire({ icon: "info", title: "Oops...", text: "Please select at least one noise type!" }); return; }
    setApplyNoiseTrigger(true);
    setFilteredECG(false);
    setAppliedStepSizeMu(null);
    setAppliedFilterOrderM(null);
    setApplypsdTrigger(false);
    clearMvdr();
    clearCompare();
    setFilteredSamples([]);
    setDiagnostics(null);
    setPipelineResults(null);
    markAction("ADD_NOISE");
  };

  const runPsd = () => {
    if (!generateECG) {
      Swal.fire({ icon: "info", title: "Oops...", text: "Please generate ECG signal first!" });
      return;
    }
    const filterApplied = isLmsAr ? filteredECG : mvdrApplied;
    if (!filterApplied) {
      Swal.fire({
        icon: "info",
        title: "Oops...",
        text: "Please apply the adaptive filter before computing PSD.",
      });
      return;
    }
    setApplypsdTrigger(true);
    markAction("COMPUTE_PSD");
  };

  const runMvdrBeamformer = () => {
    if (!generateECG) {
      Swal.fire({ icon: "info", title: "Oops...", text: "Please generate ECG signal first!" });
      return;
    }
    if (!applyNoiseTrigger) {
      Swal.fire({ icon: "info", title: "Oops...", text: "Please add noise to the signal first!" });
      return;
    }
    if (!cleanSignal.length || !noisySamples.length) {
      Swal.fire({ icon: "info", title: "Oops...", text: "ECG signal data is not ready yet." });
      return;
    }
    const fs = Number(originalFs) || 500;
    const noiseParams = buildNoiseParams(noise);
    const res = runSpatialMVDR(
      cleanSignal,
      noiseParams,
      mvdrNumSensors,
      mvdrThetaS,
      mvdrThetaI,
      mvdrDiagLoad,
      fs
    );
    const noisyY = noisySamples.map((p) => p.y);
    const snrIn = getSNRdB(cleanSignal, noisyY);
    const snrOut = getSNRdB(cleanSignal, res.filtered);
    setMvdrResults({ ...res, snrIn, snrOut });
    setMvdrApplied(true);
    setFilteredSamples(noisySamples.map((p, i) => ({ x: p.x, y: res.filtered[i] ?? 0 })));
    setApplypsdTrigger(false);
    clearCompare();
    setPipelineResults(null);
    markAction("RUN_MVDR");
  };

  const applyCompare = () => {
    if (!generateECG) {
      Swal.fire({ icon: "info", title: "Oops...", text: "Please generate ECG signal first!" });
      return;
    }
    if (!applyNoiseTrigger) {
      Swal.fire({ icon: "info", title: "Oops...", text: "Please add noise to the signal first!" });
      return;
    }
    if (!cleanSignal.length || !noisySamples.length) {
      Swal.fire({ icon: "info", title: "Oops...", text: "ECG signal data is not ready yet." });
      return;
    }

    const M = clamp(Math.floor(Number(compareFilterOrderM) || 1), 1, 256);
    const mu = sanitizeLmsMu(compareStepSizeMu);
    setCompareFilterOrderM(M);
    setCompareStepSizeMu(mu);

    const fs = Number(originalFs) || 500;
    const noiseParams = buildNoiseParams(noise);
    const noisyECG = noisySamples.map((p) => p.y);
    const cleanGroundTruth = cleanSignal.slice(0, noisyECG.length);
    const noiseReference = noisyECG.map((v, i) => v - (cleanGroundTruth[i] || 0));

    const lmsResult = filterSignalLMS(noiseReference, noisyECG, {
      filterOrder: M,
      stepSize: mu,
    });
    const lmsFiltered = Array.isArray(lmsResult) ? lmsResult : lmsResult.Yfiltered;

    const mvdrRes = runSpatialMVDR(
      cleanSignal,
      noiseParams,
      compareMvdrNumSensors,
      compareMvdrThetaS,
      compareMvdrThetaI,
      compareMvdrDiagLoad,
      fs
    );

    const snrIn = getSNRdB(cleanSignal, noisyECG);
    const lmsSnr = getSNRdB(cleanSignal, lmsFiltered);
    const mvdrSnr = getSNRdB(cleanSignal, mvdrRes.filtered);

    setCompareResults({
      snrIn,
      lmsSnr,
      mvdrSnr,
      lmsImprovement: lmsSnr - snrIn,
      mvdrImprovement: mvdrSnr - snrIn,
      noisy: noisySamples.map((p) => ({ x: p.x, y: p.y })),
      lmsFiltered: noisySamples.map((p, i) => ({ x: p.x, y: lmsFiltered[i] ?? 0 })),
      mvdrFiltered: noisySamples.map((p, i) => ({ x: p.x, y: mvdrRes.filtered[i] ?? 0 })),
      lmsParams: { M, mu },
      mvdrParams: {
        numSensors: compareMvdrNumSensors,
        thetaS: compareMvdrThetaS,
        thetaI: compareMvdrThetaI,
        diagLoad: compareMvdrDiagLoad,
      },
    });
    setCompareApplied(true);
    setFilteredECG(false);
    setMvdrApplied(false);
    setMvdrResults(null);
    setPipelineResults(null);
    markAction("APPLY_COMPARE");
  };

  const applyFilter = () => {
    if (!generateECG) {
      Swal.fire({ icon: "info", title: "Oops...", text: "Please generate ECG signal first!" });
      return;
    }
    if (!applyNoiseTrigger) {
      Swal.fire({ icon: "info", title: "Oops...", text: "Please add noise to the signal first!" });
      return;
    }
    const M = clamp(Math.floor(Number(filterOrderM) || 1), 1, 256);
    const mu = sanitizeLmsMu(stepSizeMu);
    setFilterOrderM(M);
    setStepSizeMu(mu);
    setAppliedFilterOrderM(M);
    setAppliedStepSizeMu(mu);
    setFilteredECG(true);
    clearCompare();
    setPipelineResults(null);
    setApplypsdTrigger(false);
    markAction("APPLY_FILTER");
  };

  const runPipeline = () => {
    if (!generateECG) {
      Swal.fire({ icon: "info", title: "Oops...", text: "Please generate ECG signal first!" });
      return;
    }
    if (!applyNoiseTrigger) {
      Swal.fire({ icon: "info", title: "Oops...", text: "Please add noise to the signal first!" });
      return;
    }
    setPipelineRunning(true);
    try {
      const results = runFullPipeline({
        rawSamples,
        time,
        originalFs,
        selectedChannels,
        noise,
        applyNoiseTrigger,
        p: arOrder,
        pMax: arOrderMax,
        mu: stepSizeMu,
        M: filterOrderM,
        N_MC: nMc,
        delta: diagLoading,
        useAicOrder,
      });
      setPipelineResults(results);
      markAction("RUN_PIPELINE");
      Swal.fire({ icon: "success", title: "Pipeline complete", text: "See results below and browser console for Stage 1–5 metrics.", timer: 2500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Pipeline error", text: err.message });
    } finally {
      setPipelineRunning(false);
    }
  };

  useEffect(() => {
    if (prevPathRef.current !== csvFilePath) {
      setApplyNoiseTrigger(false);
      setFilteredECG(false);
      setAppliedStepSizeMu(null);
      setAppliedFilterOrderM(null);
      setMvdrApplied(false);
      setMvdrResults(null);
      setCompareApplied(false);
      setCompareResults(null);
      setFilteredSamples([]);
      setDiagnostics(null);
      setApplypsdTrigger(false);
      prevPathRef.current = csvFilePath;
    }
  }, [csvFilePath, prevPathRef, setApplyNoiseTrigger, setFilteredECG, setDiagnostics]);

  return (
    <div className={styles.rightPanelContainer}>
      <div className={styles.right}>
        <h2>ECG Signal &amp; Algorithm Controls</h2>

        <div id="signalSetup" className={styles.box}>
          <h3>Signal Setup</h3>
          <label>Select ECG Dataset</label>
          <select value={signalType} onChange={e => onSignalTypeChange(e.target.value)}>
            {signalOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>

          {signalType === "upload" && (
            <div id="uploadOption" style={{ marginTop: "8px" }}>
              <input type="file" accept=".csv,.txt" onChange={handleUpload} style={{ fontSize: "12px" }} />
              {uploadedSignalName && <p style={{ fontSize: "11px", color: "#1D7480", marginTop: "4px" }}>📄 {uploadedSignalName}</p>}
            </div>
          )}
          {signalType !== "upload" && <div id="uploadOption" style={{ display: "none" }} />}

          <label>Duration: <span>{time} seconds</span></label>
          <input type="range" min="1" max="70" value={time} onChange={(e) => setTime(Number(e.target.value))} />
          <label>Sampling Rate: <span>{originalFs} Hz</span></label>
          <button id="generateButton" onClick={() => { setGenerateECG(true); markAction("GENERATE_SIGNAL"); }}>
            Generate ECG Signal
          </button>
        </div>

        <div id="noisePanel" className={styles.box}>
          <h3>Add Noise</h3>
          {NOISE_TYPES.map((item) => (
            <div key={item.id} className={styles.noiseItem}>
              <label className={styles.noiseLabel}>
                <input
                  type="checkbox"
                  checked={noise[item.id]}
                  onChange={(e) => setNoise({ ...noise, [item.id]: e.target.checked })}
                />
                <span className={styles.noiseLabelText}>{item.label}</span>
                <span className={styles.infoIcon} title={`About ${item.label}`}>i</span>
              </label>
              {noise[item.id] && <NoiseInfoCard info={item} />}
            </div>
          ))}
          {selectedNoiseCount > 0 && (
            <p className={styles.noiseStatus}>
              {selectedNoiseCount} noise type{selectedNoiseCount > 1 ? "s" : ""} selected — click below to apply to the ECG.
            </p>
          )}
          <button type="button" className={styles.noiseApplyBtn} onClick={noiseTrigger}>
            Add Noise to Signal
          </button>
        </div>

        <div id="algoSetup" className={styles.box}>
          <h3>Algorithm Setup</h3>
          <label>Algorithm</label>
          <select id="algorithmSelector" value={algorithmType} onChange={e => {
            setAlgorithmType(e.target.value);
            setFilteredECG(false);
            setAppliedStepSizeMu(null);
            setAppliedFilterOrderM(null);
            clearMvdr();
            clearCompare();
            setFilteredSamples([]);
            setDiagnostics(null);
            setPipelineResults(null);
            setApplypsdTrigger(false);
            markAction("SELECT_ALGO");
          }}>
            <option value="AR Process">LMS Adaptive Filter</option>
            <option value="MVDR Beamformer">MVDR Beamformer</option>
          </select>

          {isLmsAr && (
            <>
              <span className={styles.paramSection}>LMS Parameters</span>
              <div className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Filter Order (M)</span>
                <input
                  className={styles.algoInput}
                  type="number"
                  min="1"
                  max="256"
                  step="1"
                  value={filterOrderM}
                  onChange={(e) => setFilterOrderM(Number(e.target.value))}
                />
              </div>

              <div className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Step size μ (LMS — small values recommended)</span>
                <input
                  className={styles.algoInput}
                  type="number"
                  min="0.00000001"
                  max="0.1"
                  step="0.0001"
                  value={stepSizeMu}
                  onChange={(e) => {
                    const v = e.target.valueAsNumber;
                    if (Number.isFinite(v)) setStepSizeMu(v);
                  }}
                />
                <span className={styles.fieldHint}>Typical range: 0.000001 – 0.1</span>
              </div>
            </>
          )}

          {isMvdrOnly && (
            <>
              <span className={styles.paramSection}>MVDR Parameters</span>
              <label>Number of Sensors (M): <span>{mvdrNumSensors}</span></label>
              <input
                type="range"
                min="2"
                max="16"
                step="1"
                value={mvdrNumSensors}
                onChange={(e) => setMvdrNumSensors(Number(e.target.value))}
              />

              <label>Desired Angle θ_s (°): <span>{mvdrThetaS}</span></label>
              <input
                type="range"
                min="-90"
                max="90"
                step="1"
                value={mvdrThetaS}
                onChange={(e) => setMvdrThetaS(Number(e.target.value))}
              />

              <label>Interferer Angle θ_i (°): <span>{mvdrThetaI}</span></label>
              <input
                type="range"
                min="-90"
                max="90"
                step="1"
                value={mvdrThetaI}
                onChange={(e) => setMvdrThetaI(Number(e.target.value))}
              />

              <label>Diagonal Loading δ: <span>{mvdrDiagLoad.toFixed(4)}</span></label>
              <input
                type="range"
                min="0"
                max="0.1"
                step="0.001"
                value={mvdrDiagLoad}
                onChange={(e) => setMvdrDiagLoad(Number(e.target.value))}
              />
            </>
          )}

          {isLmsAr && (
            <div id="algoRunActions" className={styles.psdContainer}>
              <button
                id="applyFilterBtn"
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={applyFilter}
              >
                Apply Filter
              </button>
              <button
                id="computePsdBtn"
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={runPsd}
              >
                Compute PSD
              </button>
            </div>
          )}

          {isMvdrOnly && (
            <div id="algoRunActions" className={styles.psdContainer}>
              <button
                id="runMvdrButton"
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={runMvdrBeamformer}
              >
                Apply Filter
              </button>
              <button
                id="computePsdBtn"
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={runPsd}
              >
                Compute PSD
              </button>
            </div>
          )}
        </div>

        <div id="comparePanel" className={styles.box}>
          <h3>LMS vs MVDR Comparison</h3>
          <p className={styles.hint}>
            Configure both algorithms independently and run a side-by-side comparison on the same noisy ECG.
          </p>

          <span className={styles.paramSection}>LMS Parameters</span>
          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>Filter Order (M)</span>
            <input
              className={styles.algoInput}
              type="number"
              min="1"
              max="256"
              step="1"
              value={compareFilterOrderM}
              onChange={(e) => setCompareFilterOrderM(Number(e.target.value))}
            />
          </div>

          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>Step size μ (LMS — small values recommended)</span>
            <input
              className={styles.algoInput}
              type="number"
              min="0.00000001"
              max="0.1"
              step="0.0001"
              value={compareStepSizeMu}
              onChange={(e) => {
                const v = e.target.valueAsNumber;
                if (Number.isFinite(v)) setCompareStepSizeMu(v);
              }}
            />
            <span className={styles.fieldHint}>Typical range: 0.000001 – 0.1</span>
          </div>

          <span className={styles.paramSection}>MVDR Parameters</span>
          <label>Number of Sensors (M): <span>{compareMvdrNumSensors}</span></label>
          <input
            type="range"
            min="2"
            max="16"
            step="1"
            value={compareMvdrNumSensors}
            onChange={(e) => setCompareMvdrNumSensors(Number(e.target.value))}
          />

          <label>Desired Angle θ_s (°): <span>{compareMvdrThetaS}</span></label>
          <input
            type="range"
            min="-90"
            max="90"
            step="1"
            value={compareMvdrThetaS}
            onChange={(e) => setCompareMvdrThetaS(Number(e.target.value))}
          />

          <label>Interferer Angle θ_i (°): <span>{compareMvdrThetaI}</span></label>
          <input
            type="range"
            min="-90"
            max="90"
            step="1"
            value={compareMvdrThetaI}
            onChange={(e) => setCompareMvdrThetaI(Number(e.target.value))}
          />

          <label>Diagonal Loading δ: <span>{compareMvdrDiagLoad.toFixed(4)}</span></label>
          <input
            type="range"
            min="0"
            max="0.1"
            step="0.001"
            value={compareMvdrDiagLoad}
            onChange={(e) => setCompareMvdrDiagLoad(Number(e.target.value))}
          />

          <button
            id="applyCompareBtn"
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={applyCompare}
          >
            Run LMS vs MVDR Comparison
          </button>
        </div>
      </div>
    </div>
  );
};
