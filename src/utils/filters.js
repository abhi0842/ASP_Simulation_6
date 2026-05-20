import Fili from "fili";

export function buildIirCoeffs(cfg) {
  const calc = new Fili.CalcCascades();
  // console.log("Available Filters:", calc.available());
  const base = {
    order: cfg.order,
    characteristic: "butterworth",
    Fs: cfg.Fs,
    preGain: !!cfg.preGain,
  };
  if (cfg.filterType === "lowpass") {
    return calc.lowpass({ ...base, Fc: cfg.Fc });
  }
  if (cfg.filterType === "highpass") {
    return calc.highpass({ ...base, Fc: cfg.Fc });
  }
  if (cfg.filterType === "bandpass") {
    //const BW = Math.max(0, (cfg.F2 ?? 0) - (cfg.F1 ?? 0));
    const BW = Math.max(1e-6, (cfg.F2 ?? 0) - (cfg.F1 ?? 0));

    const Fc = cfg.Fc ?? (cfg.F1 + cfg.F2) / 2;
    return calc.bandpass({ ...base, Fc, BW });
  }
  if (cfg.filterType === "bandstop") {
    //const BW = Math.max(0, (cfg.F2 ?? 0) - (cfg.F1 ?? 0));
    const BW = Math.max(1e-6, (cfg.F2 ?? 0) - (cfg.F1 ?? 0));

    const Fc = cfg.Fc ?? (cfg.F1 + cfg.F2) / 2;
    return calc.bandstop({ ...base, Fc, BW });
  }
  return null;
}

export function buildFirCoeffs(cfg) {
  const firCalc = new Fili.FirCoeffs();
  if (cfg.windowMode === "KaiserBessel") {
    if (cfg.characteristic === "FIR" && cfg.order < 3) {
      cfg.order = 3;
    }
    let order = cfg.order;
    if (order % 2 === 0) order += 1;
    return firCalc.kbFilter({
      order: order,
      Fs: cfg.Fs,
      Fa: cfg.Fa,
      Fb: cfg.Fb,
      Att: cfg.Att,
    });
  }
  if (cfg.filterType === "lowpass") {
    return firCalc.lowpass({ order: cfg.order, Fs: cfg.Fs, Fc: cfg.Fc });
  }
  if (cfg.filterType === "highpass") {
    return firCalc.highpass({ order: cfg.order, Fs: cfg.Fs, Fc: cfg.Fc });
  }
  if (cfg.filterType === "bandpass") {
    return firCalc.bandpass({
      order: cfg.order,
      Fs: cfg.Fs,
      F1: cfg.F1,
      F2: cfg.F2,
    });
  }
  if (cfg.filterType === "bandstop") {
    return firCalc.bandstop({
      order: cfg.order,
      Fs: cfg.Fs,
      F1: cfg.F1,
      F2: cfg.F2,
    });
  }
  return null;
}

export function filterSignalFili(signal, cfg) {
  if (!Array.isArray(signal) || !signal.length) return [];
  if (cfg.characteristic === "IIR") {
    const coeffs = buildIirCoeffs(cfg);
    if (!coeffs) return signal;
    //console.log("IIR Coeffs:", coeffs);
    // const b = [];
    // const a = [];

    // coeffs.forEach((stage) => {
    //   b.push(...stage.b);
    //   a.push(...stage.a);
    // });
    // const { freq, mag } = computeFrequencyResponse(b, a, cfg.Fs);
    // setFreqResponse({ freq, mag });

    const filter = new Fili.IirFilter(coeffs);
    return filter.multiStep(signal);
  }
  if (cfg.characteristic === "FIR") {
    const coeffs = buildFirCoeffs(cfg);

    // if (!coeffs) return signal;
    // const b = coeffs;
    // const a = [1];

    // const { freq, mag } = computeFrequencyResponse(b, a, cfg.Fs);
    // setFreqResponse({ freq, mag });
    const filter = new Fili.FirFilter(coeffs);
    return filter.multiStep(signal);
  }
  return signal;
}
