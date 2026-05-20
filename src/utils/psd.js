import Fili from "fili";

export function computePSD(signal, fs) {
  const N = 1 << Math.ceil(Math.log2(signal.length));
  const fft = new Fili.Fft(N);

  const buffer = new Array(N).fill(0);
  for (let i = 0; i < signal.length; i++) buffer[i] = signal[i];

  
  // Forward FFT → magnitude is AMPLITUDE SPECTRUM
  const result = fft.forward(buffer, "hanning");
  const mag = fft.magnitude(result);
  // convert in db 
  const db = fft.magToDb(mag);

  //Standard linear PSD formula
  const psd = db.map((v) => ((v * v ) / (N * fs))* 1000);

  const freqs = psd.map((_, i) => (i * fs) / N);

  const half = Math.floor(N / 2);
  return {
    freqs: freqs.slice(0, half),
    psd: psd.slice(0, half),
  };
}


export function computePSDforFiltered(signal, fs) {
  const N = 1 << Math.ceil(Math.log2(signal.length));
  const fft = new Fili.Fft(N);

  const buffer = new Array(N).fill(0);
  for (let i = 0; i < signal.length; i++) {
    buffer[i] = signal[i];
  }

  // FFT
  const spectrum = fft.forward(buffer, "hanning");
  const mag = fft.magnitude(spectrum);

  // ✅ Linear PSD
  const psdLinear = mag.map(v => (v * v) / (N * fs));

  // Optional: convert to dB/Hz
  const psdDb = psdLinear.map(v => 10 * Math.log10(v + 1e-12));

  const freqs = psdLinear.map((_, i) => (i * fs) / N);

  const half = Math.floor(N / 2);

  return {
    freqs: freqs.slice(0, half),
    psd: psdDb.slice(0, half), // use psdLinear if you want linear scale
  };
}


