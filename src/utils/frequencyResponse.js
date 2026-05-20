import Fili from "fili";
import { buildIirCoeffs, buildFirCoeffs } from "./filters";

export function computeFrequencyResponse(cfg, points = 1) {
  const Fs = Number(cfg.Fs);

  const coeffs =
    cfg.characteristic === "IIR"
      ? buildIirCoeffs(cfg)
      : buildFirCoeffs(cfg);

  if (!coeffs) return [];

  const filter =
    cfg.characteristic === "IIR"
      ? new Fili.IirFilter(coeffs)
      : new Fili.FirFilter(coeffs);

  // fili response() returns n points covering 0 to Fs (approx)
  // We generally want to view 0 to Fs/2 (Nyquist)
  const response = filter.response(points);
  
  // Calculate resolution
  // If response has length 'points', it covers 0 to Fs with step = Fs / points?
  // Based on user provided docs: "Fs = 1000 n = 100... represents 0Hz, 10Hz..." => step = 10 = 1000/100.
  // So step = Fs / points.
  
  //  const step = Fs / points;   // based on Fili docs

  // // Convert to Nyquist range
  // const half = Math.floor(points / 2);

  // const data = [];
  // for (let i = 0; i <= half; i++) {
  //   data.push({
  //     x: i * step,
  //     y: response[i].dBmagnitude
  //   });
  // }
  const step = Fs / points;
const half = Math.floor(points / 2);

const data = Array.from({ length: half + 1 }, (_, i) => ({
  x: i * step,
  y: response[i].dBmagnitude
}));


  return data;
}
