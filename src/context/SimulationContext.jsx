import { createContext, useState, useRef, useEffect } from "react";
import Papa from "papaparse";
export const SimulationContext = createContext();
export const LOBE_CHANNEL_MAP = {
  Prefrontal: ["Fp1", "Fp2"],
  Frontal: ["F3", "F4", "F7", "F8", "Fz"],
  Central: ["C3", "C4", "Cz"],
  Temporal: ["T3", "T4", "T5", "T6"],
  Parietal: ["P3", "P4", "Pz"],
  Occipital: ["O1", "O2"],
  Reference: ["A1", "A2"],
  All: [
    "Fp1",
    "Fp2",
    "F3",
    "Fz",
    "F4",
    "F7",
    "F8",
    "C3",
    "Cz",
    "C4",
    "T3",
    "T4",
    "T5",
    "T6",
    "P3",
    "Pz",
    "P4",
    "O1",
    "O2",
    "A1",
    "A2",
  ],
};

export const SimulationProvider = ({ children }) => {
  const [showInstruction, setShowInstruction] = useState(false);
  const buttonRef = useRef(null);

  const [csvFilePath, setCsvFilePath] = useState("/ecg100.csv");
  const prevPathRef = useRef(csvFilePath);

  const [time, setTime] = useState(5);
  //const [userFs, setUserFs] = useState(500);

  const [noise, setNoise] = useState({
    baseline: false,
    powerline: false,
    emg: false,
  });

  const [generateECG, setGenerateECG] = useState(false);
  const [applyNoiseTrigger, setApplyNoiseTrigger] = useState(false);
  const [filteredECG, setFilteredECG] = useState(false);
  const [applypsdTrigger, setApplypsdTrigger] = useState(false);

  const [algoResults, setAlgoResults] = useState(null);
  const [algorithmType, setAlgorithmType] = useState("AR Process");

  const [noisyECG, setNoisyECG] = useState([]); // for noisy csv data

  const [config, setConfig] = useState({
    order: 5,
    characteristic: "IIR",
    filterType: "bandpass",
    windowMode: "windowSync",

    preGain: false,
    Fs: 500,
    // IIR-bandpass/bandstop/highpass/lowpass
    // FIR-windowSync-highpass/lowpass
    Fc: 10,
    // fir-windowSync-bandpass/bandstop
    F1: null,
    F2: null,
    // fir-KaiserBessel-bandpass/bandstop
    Fa: null,
    Fb: null,
    Att: 100,
  });

  // raw parsed samples and inferred original Fs
  const [rawSamples, setRawSamples] = useState([]);
  const [originalFs, setOriginalFs] = useState(500);
  const [filteredSamples, setFilteredSamples] = useState([]);

  const [freqResponse, setFreqResponse] = useState(null);
  const [applyFreqTrigger, setApplyFreqTrigger] = useState(false);

  const [colors, setColors] = useState([]);
  const [selectedLobe, setSelectedLobe] = useState("Frontal");
  const [selectedChannels, setSelectedChannels] = useState(["ECG_I"]);
  // Keep legacy "lobe" state for UI compatibility, but ECG uses channel names.
  useEffect(() => {
    // no-op for ECG datasets; selectedChannels determined by CSV headers below
  }, [selectedLobe]);

  // parse CSV once on path change and cache
  useEffect(() => {
    Papa.parse(csvFilePath, {
      download: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data;
        if (!rows.length) return;
        const headers = (rows[0] || []).map((h) =>
          typeof h === "string" ? h.trim() : h
        );

        // ECG datasets use time_sec; older datasets used Time
        const timeIdx =
          headers.indexOf("time_sec") !== -1
            ? headers.indexOf("time_sec")
            : headers.indexOf("Time");
        if (timeIdx === -1) return;

        // EEG channels you want to display

        const colorsName = [
          "#4da6ff",
          "#ff4d4d",
          "#66ff66",
          "#ffcc00",
          "#cc66ff",
          "#00cccc",
          "#ff9966",
          "#9999ff",
          "#ff6666",
          "#66ccff",
          "#99ff99",
          "#ffd966",
          "#d699ff",
          "#00ffcc",
          "#ffb366",
          "#b3b3ff",
          "#ff8080",
          "#80bfff",
          "#80ffbf",
          "#ff80ff",
          "#a6a6ff",
          "#ffcc99",
          "#66ffcc",
          "#cccccc",
        ];
        setColors(colorsName);

        const hasECG = headers.includes("ECG_I");
        const channelNames = hasECG ? ["ECG_I"] : [];
        const channelIndices = channelNames.map((ch) => headers.indexOf(ch));

        // if ECG headers aren't present, fall back to any numeric column except time
        if (!channelNames.length) {
          for (let i = 0; i < headers.length; i++) {
            if (i === timeIdx) continue;
            const h = headers[i];
            if (!h) continue;
            const v = parseFloat(rows?.[1]?.[i]);
            if (!Number.isNaN(v)) {
              channelNames.push(String(h));
              channelIndices.push(i);
              break;
            }
          }
        }

        if (!channelNames.length) return;
        setSelectedChannels(channelNames);

        const t0 = parseFloat(rows?.[1]?.[timeIdx]) || 0;

        const parsed = rows.slice(1).map((row) => {
          const point = { x: (parseFloat(row?.[timeIdx]) || 0) - t0 };
          channelNames.forEach((ch, i) => {
            const idx = channelIndices[i];
            point[ch] = parseFloat(row?.[idx]) || 0;
          });
          return point;
        });
      //  console.log("parsed", parsed);
        setRawSamples(parsed);
        //  console.log("parsed", parsed);
        const dt = parsed.length > 1 ? parsed[1].x - parsed[0].x : 0.002;
        // console.log("dt", dt);
        const fsOriginal = Number(dt > 0 ? 1 / dt : 500).toFixed(2);
        setOriginalFs(fsOriginal);
        //console.log("originalFs", originalFs);
      },
      error: (err) => console.error("CSV parse error", err),
    });
  }, [csvFilePath]);

  const applyNoise = () => {
    // Noise application is now handled in EcgNoisy.jsx locally
  };

  return (
    <SimulationContext.Provider
      value={{
        showInstruction,
        setShowInstruction,
        buttonRef,
        generateECG,
        setGenerateECG,
        noisyECG,
        setNoisyECG,
        filteredECG,
        setFilteredECG,
        config,
        setConfig,
        time,
        setTime,
        // userFs,
        // setUserFs,
        csvFilePath,
        prevPathRef,
        setCsvFilePath,
        rawSamples,
        originalFs,
        noise,
        setNoise,
        applyNoise,
        applyNoiseTrigger,
        setApplyNoiseTrigger,
        freqResponse,
        setFreqResponse,
        applyFreqTrigger,
        setApplyFreqTrigger,
        colors,
        setColors,
        selectedLobe,
        setSelectedLobe,
        selectedChannels,
        setSelectedChannels,
        applypsdTrigger,
        setApplypsdTrigger,
        filteredSamples,
        setFilteredSamples,
        algoResults,
        setAlgoResults,
        algorithmType,
        setAlgorithmType,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
};
