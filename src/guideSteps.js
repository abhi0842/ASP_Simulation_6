export const guideSteps = [
  {
    title: "Welcome to ASP Simulation",
    content:
      "Would you like a guided tour of the Autoregressive Stochastic Process & MVDR Beamformer Lab?",
    type: "choice",
    targetId: "guideButton",
  },
  {
    title: "Instructions",
    content: "Review the lab objectives and theoretical background here before starting.",
    highlight: "instructionPanel",
    preferredPlacement: "right",
  },
  {
    title: "1. Signal Setup",
    content: "Select one of the 3 ECG datasets or upload your own CSV/TXT file.",
    highlight: "signalSetup",
    preferredPlacement: "left",
  },
  {
    title: "2. Upload Your Own CSV",
    content:
      "You can upload your own signal CSV/TXT file. Auto-detects time and ECG columns.",
    highlight: "uploadOption",
    preferredPlacement: "left",
  },
  {
    title: "3. Generate ECG Signal",
    content: "Click 'Generate ECG Signal' to load the selected dataset into the simulation.",
    highlight: "generateButton",
    requiredAction: "GENERATE_SIGNAL",
    preferredPlacement: "left",
  },
  {
    title: "4. Add Noise",
    content:
      "Select noise types (Baseline Wander, Powerline 50 Hz, EMG) and click 'Add Noise to Signal'.",
    highlight: "noisePanel",
    requiredAction: "ADD_NOISE",
    preferredPlacement: "left",
  },
  {
    title: "5. Select Algorithm",
    content:
      "Choose LMS Adaptive Filter and set Filter Order (M) and step size μ.",
    highlight: "algorithmSelector",
    requiredAction: "SELECT_ALGO",
    preferredPlacement: "left",
    isDropdown: true,
  },
  {
    title: "6. Apply Filter",
    content:
      "Click Apply Filter after adding noise. The filtered ECG appears in green below the noisy signal.",
    highlight: "applyFilterBtn",
    requiredAction: "APPLY_FILTER",
    preferredPlacement: "left",
  },
  {
    title: "7. Compute PSD",
    content:
      "Click Compute PSD to view unfiltered (noisy) and filtered power spectral density plots side by side.",
    highlight: "computePsdBtn",
    requiredAction: "COMPUTE_PSD",
    preferredPlacement: "left",
  },
  {
    title: "Lab Completed",
    content:
      "Excellent! You've set up an ECG signal, added noise, and applied the LMS adaptive filter. Experiment with different datasets, noise types, and parameters.",
    preferredPlacement: "center",
  },
];
