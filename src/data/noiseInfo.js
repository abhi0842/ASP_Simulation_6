export const NOISE_TYPES = [
  {
    id: "baseline",
    label: "Baseline Wander",
    accentColor: "#E8913A",
    whatIsIt:
      "A slow drift that moves the entire ECG wave up or down over time, like the trace is floating on a gentle wave.",
    whyItHappens:
      "It comes from breathing, body movement, sweating, or loose electrodes that do not stay firmly on the skin.",
    effectOnEcg:
      "It hides the flat ST segment and can make a normal heartbeat look shifted or harder to read on the monitor.",
    preview: "baseline",
  },
  {
    id: "powerline",
    label: "Powerline (50 Hz)",
    accentColor: "#7B5EA7",
    whatIsIt:
      "A steady humming pattern added to the ECG, usually at 50 Hz from nearby electrical power lines.",
    whyItHappens:
      "Power cables, lights, and unshielded wires pick up electrical fields and leak into the recording leads.",
    effectOnEcg:
      "It adds fast ripples on top of the heartbeat, making peaks harder to measure and analyze accurately.",
    preview: "powerline",
  },
  {
    id: "emg",
    label: "EMG Noise",
    accentColor: "#1D7480",
    whatIsIt:
      "Rough, fuzzy, random static that sits on top of the ECG, like snow on a TV screen.",
    whyItHappens:
      "It comes from the patient tensing nearby muscles, shivering, or jaw clenching during recording.",
    effectOnEcg:
      "It obscures fine details like the QRS shape and can mask small amplitude changes that clinicians rely on.",
    preview: "emg",
  },
];
