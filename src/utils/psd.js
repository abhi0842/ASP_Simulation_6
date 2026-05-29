import Fili from "fili";

export function computePSD(signal, fs) {
  const N = 1 << Math.ceil(Math.log2(signal.length));
  const fft = new Fili.Fft(N);

  const buffer = new Array(N).fill(0);
  for (let i = 0; i < signal.length; i++) buffer[i] = signal[i];

  const fftResult = fft.forward(buffer, "hanning");
  const magnitude = fft.magnitude(fftResult);
  const windowCorrect = (3 * N) / 8;

  const half = Math.floor(N / 2);
  const freq = [];
  const psd = [];

  for (let i = 0; i < half; i++) {
    freq.push((i * fs) / N);
    const onesidedFactor = i === 0 || i === half - 1 ? 1 : 2;
    psd.push((onesidedFactor * (magnitude[i] * magnitude[i])) / (windowCorrect * fs));
  }

  return { freqs: freq, psd };
}
