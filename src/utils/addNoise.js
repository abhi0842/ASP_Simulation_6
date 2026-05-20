export function addBaselineWander(signal, fs, amplitude = 0.05, freq = 0.2) {
   const phase = Math.random() * 2 * Math.PI;
  return signal.map((v, i) =>
    
    v + amplitude * Math.sin(2 * Math.PI * freq * (i / fs) + phase)
  );
}

export function addPowerlineNoise(signal, fs, amplitude = 15e-6, freq = 50) {
  console.log("addPowerlineNoise", amplitude, freq);
  const noise = signal.map((v, i) =>
    v + amplitude * Math.sin(2 * Math.PI * freq * i / fs)
  );
  //console.log("addPowerlineNoise",signal, noise);
  return noise;
}


export function addMuscleNoise(signal, amplitude = 0.03) {
  return signal.map(v => v + amplitude * (Math.random() * 2 - 1));
}
