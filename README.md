# Virtual Laboratory: Adaptive Signal Processing for ECG Analysis

**Experiment 3(a) — Clean and Process Heart Signals using Adaptive Filters**

---

Welcome to the **Adaptive Signal Processing (ASP) Virtual Lab**! This interactive simulator runs entirely in your web browser. It is designed to teach you how smart, self-tuning digital filters can clean real-world medical signals—specifically **electrocardiograms (ECGs)** that record the heart's electrical rhythms.

Through this dashboard, you can inject various kinds of real-world noise (like muscle movement or powerline hum) into real heart recordings, and see how two powerful algorithms—**LMS-AR Prediction** and **MVDR Beamforming**—clean the signals in real-time.

---

## 🌟 Table of Contents
1. [What This Simulation Does (The Big Picture)](#1-what-this-simulation-does-the-big-picture)
2. [ECG Signals & Real-World Noise (The Challenge)](#2-ecg-signals--real-world-noise-the-challenge)
3. [The Theory Made Easy: How the Filters Work](#3-the-theory-made-easy-how-the-filters-work)
4. [Step-by-Step Simulation Guide (All Use Cases)](#4-step-by-step-simulation-guide-all-use-cases)
5. [Interactive Experiments to Try](#5-interactive-experiments-to-try)
6. [The Science & Mathematics (For Advanced Learners)](#6-the-science--mathematics-for-advanced-learners)
7. [Project Directory & File Structure](#7-project-directory--file-structure)
8. [Installation and Local Usage](#8-installation-and-local-usage)

---

## 1. What This Simulation Does (The Big Picture)

In a hospital or a smart wearable device (like a smartwatch), reading heartbeats is crucial. However, the human body and the surrounding environment are full of electrical noise. 

This simulator lets you run a complete digital signal processing pipeline on your computer:

| Stage | What it does in simple terms |
| :--- | :--- |
| 📊 **Signal Setup** | Choose a real-world recorded heartbeat file or upload your own. |
| 🔊 **Add Noise** | Inject realistic noise like breathing drift, muscle twitches, or electrical hum. |
| 🧠 **Apply Filters** | Run smart adaptive algorithms that self-tune and learn how to extract the clean heartbeat. |
| 📈 **Visualize** | Watch real-time charts show you the original clean heartbeat, the noisy version, the cleaned version, and the internal learning process. |
| 🚀 **Compare Runs** | Pin your settings, change a dial, and run it again to see which filter setting worked best! |

---

## 2. ECG Signals & Real-World Noise (The Challenge)

### 2.1 What is an ECG?
An **electrocardiogram (ECG)** measures the tiny electrical impulses that make your heart beat. A normal heartbeat waveform has three main landmarks:
*   **P Wave:** The electrical signal that squeezes the top chambers (atria) of the heart.
*   **QRS Complex:** The big spike that squeezes the main pumping chambers (ventricles). This is the strongest part of the signal.
*   **T Wave:** The recovery signal as the heart prepares for the next beat.

For doctors or smart health algorithms to detect problems like irregular heartbeats (arrhythmias), these waves must be sharp and clear.

### 2.2 Why do heart signals get noisy?
In the real world, electrodes stuck to the skin capture more than just the heart. This simulator models three common noise sources:

```
  Clean Heartbeat         Noisy Environment              Corrupted ECG Signal
 [Sharp, clear wave] + [Breathing + Outlet Hum + Twitch] = [Messy, wavy waveform]
```

1.  **Baseline Wander (Breathing & Movement):**
    *   *What it is:* A slow, wavy drift that makes the entire ECG line float up and down.
    *   *Cause:* The patient breathing or moving their torso.
2.  **Powerline Interference (50 Hz / 60 Hz Hum):**
    *   *What it is:* A very fast, sharp, continuous hum vibrating through the signal.
    *   *Cause:* Electromagnetic fields from wall outlets, medical equipment, and lighting.
3.  **EMG (Muscle) Noise:**
    *   *What it is:* Rough, fuzzy, completely random static covering the signal.
    *   *Cause:* The patient tensing their muscles or shivering near the electrodes.

---

## 3. The Theory Made Easy: How the Filters Work

Instead of using traditional "static" filters that block fixed frequencies, this simulator uses **Adaptive Filters**. These filters act like small AI models: they start with no knowledge of the noise and continuously adapt their dials (coefficients) sample-by-sample as the signal plays!

The simulator lets you play with two major classes of adaptive processing: **Temporal (Time-based)** and **Spatial (Direction-based)**.

---

### 🧠 3.1 LMS-AR Prediction (Temporal Filter)
> **The Real-World Analogy:** Imagine an AI assistant trying to guess the next note in a song by listening to the last few notes. If it guesses too high or too low, it hears the correct note, calculates its mistake (error), and slightly adjusts its dials so its next guess is closer.

```
                  ┌───────────────────────┐
  Past ECG  ────> │  LMS-AR Predictor     │ ───> Predicted Clean ECG
  Samples         │ (Adapts weights on   │
                  │  every single sample) │ <─── Adjusts based on Error
                  └───────────────────────┘
```

*   **How it cleans ECGs:** Healthy heartbeats follow repeating, structured patterns. Random noise (like a muscle twitch or powerline static) does not follow a predictable pattern. The LMS-AR filter learns the predictable, structured part of the ECG and ignores the chaotic noise, separating the two!
*   **What the dials do:**
    *   **AR Order (P):** *Memory Length.* How many past samples (e.g. 5, 8, or 10) the filter looks at to predict the current sample. A higher order can model complex shapes but requires more computation and might pick up unwanted details.
    *   **Step Size ($\mu$):** *Learning Rate.* How fast the filter adjusts its dials. 
        *   *Too small:* The filter learns too slowly, taking forever to clean the signal.
        *   *Too large:* The filter makes wild, aggressive adjustments, becomes unstable, and goes completely out of control (divergence).
    *   **Monte Carlo Runs (R):** *Averaging the luck.* We run the simulation multiple times with tiny random shifts and average them. This smooths out random spikes, giving you a clean, clear look at how fast the algorithm is learning (the MSE Curve).

---

### 📡 3.2 MVDR Beamforming (Spatial Filter)
> **The Real-World Analogy:** Imagine you are at a noisy press conference. You have a row of microphones (a sensor array). You want to hear the main speaker clearly. The MVDR algorithm acts as a smart controller: it keeps a "spotlight" on the main speaker (Desired Direction) completely unchanged, while steering a digital "blind spot" (a null) directly toward the loud heckler in the audience (Interference Direction).

```
   [Interference Noise] (e.g. -45°)              [ECG Signal] (e.g. 30°)
           \                                           /
            \                                         /
             ▼                                       ▼
       ┌───┬───┬───┬───┬───┬───┬───┬───┐ (Electrode Array, M sensors)
       └───┴───┴───┴───┴───┴───┴───┴───┘
                       │
                       ▼
             [Smart MVDR Weights] ───> Keeps 30° at 100% volume
                                       Puts -45° in absolute silence (0%)
```

*   **How it cleans ECGs:** In multi-lead setups (where we have multiple electrodes placed across the chest), heart signals and external electrical noises arrive from different physical directions. MVDR filters the signals across these sensors to keep the heartbeat pristine while actively canceling the directional interference.
*   **What the dials do:**
    *   **Array Size (M):** *Number of Sensors.* How many electrodes are in your line. More sensors mean sharper spotlights and much deeper, more precise blind spots!
    *   **Desired Angle ($\theta_s$):** The physical direction of the heart signal relative to the electrodes.
    *   **Interference Angle ($\theta_i$):** The physical direction where the main noise source (like an electrical machine) is located.
    *   **Snapshots (K):** *Data Collection.* How many samples of data the algorithm gathers to calculate the noise profile before drawing the spotlight. More snapshots = a more accurate filter, but it requires more memory.
    *   **SNR & INR (dB):** How loud the heart signal (Signal-to-Noise Ratio) and the noise source (Interference-to-Noise Ratio) are compared to background room static.

---

## 4. Step-by-Step Simulation Guide (All Use Cases)

Follow these clear instructions to run the simulation experiments like a scientist!

---

### 📂 Use Case 1: Select and Load an ECG Signal
Before you clean any signal, you must load it into the system's memory.

1.  Locate the **Signal Setup** panel on the top-right of your screen.
2.  Click the dropdown menu next to **Select ECG Dataset**. You have three built-in choices:
    *   `ECG Dataset 1 (ecg100)`: A long, detailed, standard clinical recording. Great for seeing the filter learn over time.
    *   `ECG Dataset 2 (ecg200)`: A shorter, clean recording in millivolts. Excellent for quick demonstrations.
    *   `ECG Dataset 3 (ecg300)`: Recorded at a slower frequency, demonstrating how the system handles different time steps.
    *   *Optional:* You can select **Upload Custom File** to load a `.csv` or `.txt` file containing your own recorded heart data!
3.  Adjust the **Duration (seconds)** slider to choose how much of the signal to load (e.g. 5 seconds to view close-up details, or 30 seconds to see long-term trends).
4.  **Crucial Step:** Click the **Generate ECG Signal** button. The original, clean heartbeat will immediately render on the **ECG Signal (Unfiltered)** chart on the left.

---

### 🔊 Use Case 2: Inject Noise into the Signal
Real-world signals are messy. Let's mess up our clean heartbeat to test the filters.

1.  Locate the **Noise Configuration** panel.
2.  Select the type of noise you want to inject by checking the boxes:
    *   **Baseline Wander:** Adds a slow, wavy rise and fall.
    *   **Powerline Hum (50Hz):** Adds a fast, vibrating electrical hum.
    *   **EMG Noise:** Adds fuzzy, random static.
3.  Click the **Add Noise to Signal** button.
4.  Look at the new **ECG Signal (Noisy)** chart on the left. Your neat, clean heartbeat is now buried under waves and fuzz!

---

### 🧠 Use Case 3: Clean the Signal using LMS-AR (Temporal Filtering)
Now, let's train a smart time-based filter to reconstruct the clean heartbeat.

1.  In the **Algorithm Selector** dropdown, select **LMS-AR Prediction** (sometimes labeled as `AR Process`).
2.  Set your dials in the configuration panel:
    *   **AR Order (P):** Start with `5`.
    *   **Step Size ($\mu$):** Start with `0.001` or `0.002` (a safe, stable learning rate).
    *   **Monte Carlo Runs:** Set to `50` for a smooth diagnostics curve.
3.  Click **Apply Algorithm**.
4.  **Inspect the results on the charts:**
    *   **Original vs. LMS-AR Predicted:** The blue line (original) and green line (predicted/cleaned) will be plotted. Notice how the green line quickly aligns itself with the blue line!
    *   **MSE Learning Curve:** Watch how the error starts high and rapidly drops and plateaus. This shows the filter "learning" and settling down.
    *   **AR Coefficient Convergence:** See how the lines (representing the filter's dials tuning themselves in real-time) smoothly transition until they perfectly align with the dashed lines (which represent the absolute mathematical ideal Wiener solution).

---

### 📡 Use Case 4: Clean the Signal using MVDR (Spatial Filtering)
Let's switch paradigms and use a smart sensor array to filter out noise coming from a bad direction.

1.  In the **Algorithm Selector** dropdown, select **MVDR Beamformer**.
2.  Set your spatial dials:
    *   **Array Size (M):** Set to `8` sensors.
    *   **Desired Angle ($\theta_s$):** Let's assume our heart is at `30°`.
    *   **Interference Angle ($\theta_i$):** Let's assume an electrical machine is humming at `-45°`.
    *   **Snapshots (K):** Set to `256` for a solid noise calculation.
3.  Click **Apply Algorithm**.
4.  **Inspect the results on the charts:**
    *   **Original vs. MVDR Denoised:** See how the processed signal matches the original heart signal, with the directional interference stripped away.
    *   **Beampattern Chart:** This is a top-down radar-like chart. Notice the massive, deep downwards spike (a null) pointing exactly at `-45°` (Interference)! The filter has successfully blocked that direction while keeping `30°` (Desired) wide open.

---

### 📊 Use Case 5: Verify Frequencies (Power Spectral Density - PSD)
How can we prove the noise is truly gone? By looking at its "color" or frequency signature.

1.  Scroll down to the **Power Spectral Density (PSD)** charts.
2.  Make sure you have injected noise and applied an algorithm.
3.  Click **Compute PSD**.
4.  **Compare the two frequency spectrum charts:**
    *   **Noisy ECG Spectrum:** If you injected Powerline Hum, you will see a massive, sharp spike pointing straight up at **50 Hz**.
    *   **Processed ECG Spectrum:** Look at the same spot at 50 Hz. The spike has been flattened! The filter successfully detected and erased that frequency signature.

---

### 📍 Use Case 6: Compare Different Settings (Compare Runs Mode)
Which settings make the filter learn fastest? Let's benchmark them.

1.  Run the **LMS-AR** algorithm with a small step size (e.g. `Step Size = 0.0005`).
2.  Once the charts render, click the **Pin Current Run** button in the comparison panel. This saves your learning curve on the graph.
3.  Increase the step size (e.g. `Step Size = 0.003`) and click **Apply Algorithm** again.
4.  Look at the **MSE Learning Curve** chart. The active run (solid line) and the pinned run (dashed line) are overlayed! 
5.  *Notice:* The larger step size drops to zero much faster (faster learning), but it might wobble more (slight instability) compared to the slow, steady pinned run.
6.  Click **Clear Comparison** when you want to start a new experiment.

---

## 5. Interactive Experiments to Try

Become an expert by trying these quick laboratory experiments:

### Experiment A: The Runaway Filter (Instability)
*   **Goal:** See what happens when the learning rate is too high.
*   **Setup:** Load `ecg100`, click **Generate**, then apply **LMS-AR**.
*   **Action:** Keep increasing the **Step Size ($\mu$)** (try `0.05` or `0.1`).
*   **Observation:** The filter becomes unstable! The predicted line will fly off the screen, and the MSE learning curve will shoot up to infinity. This is **divergence**—the step size is too large for the filter to walk down the error hill safely.

### Experiment B: The Sharper Shadow
*   **Goal:** Observe how adding more sensors makes the spatial filter more powerful.
*   **Setup:** Select **MVDR Beamformer**. Set Desired Angle to `30°` and Interference to `-45°`.
*   **Action:** 
    1. Run it with **Array Size (M) = 4** and click **Apply**. Inspect the **Beampattern** chart—the "null" at `-45°` is shallow and wide.
    2. Change **Array Size (M) = 12** and click **Apply** again.
*   **Observation:** The null at `-45°` is now a sharp, deep needle-like spike! More sensors give the filter the physical resolution to carve out extremely precise blind spots.

---

## 6. The Science & Mathematics (For Advanced Learners)

If you are studying advanced engineering or mathematics, here are the actual equations driving the simulator behind the scenes:

### 6.1 LMS Coefficient Update Equation
At each sample index $n$, the filter estimates the next sample $\hat{y}(n)$ using the past $P$ samples:
$$\hat{y}(n) = \sum_{k=1}^{P} w_k(n)\, x_k(n)$$
Where $x_k(n) = u(n-k)$ represents the previous clean samples plus Monte Carlo perturbation noise.

The instantaneous prediction error is:
$$e(n) = u(n) - \hat{y}(n)$$

The filter updates its weight vector $\mathbf{w}$ using the Least Mean Squares (LMS) update rule:
$$\mathbf{w}(n+1) = \mathbf{w}(n) + \mu\, e(n)\, \mathbf{x}(n)$$
where $\mu$ is the learning step size.

---

### 6.2 The Wiener-Hopf Optimum (The Ideal Reference)
The theoretical perfect solution for the autoregressive coefficients, representing the best possible fit to the signal's autocorrelation, is given by the **Wiener-Hopf equation**:
$$\mathbf{R}\,\mathbf{w}_{\mathrm{opt}} = \mathbf{p}$$
Where:
*   $\mathbf{R}$ is the Toeplitz autocorrelation matrix of the signal $u(n)$.
*   $\mathbf{p}$ is the cross-correlation vector between the past samples and the desired current sample.

The simulator estimates the sample autocorrelation function $\hat{r}(k)$ as:
$$\hat{r}(k) = \frac{1}{N-k} \sum_{i=k}^{N-1} u(i)\, u(i-k)$$
And solves the system of linear equations in real-time to plot the dashed reference lines in the convergence chart.

---

### 6.3 MVDR Beamforming Mathematics
For an $M$-sensor Uniform Linear Array (ULA), the steering vector $\mathbf{a}(\theta)$ representing a signal arriving from angle $\theta$ is:
$$a_m(\theta) = e^{j m \pi \sin\theta}, \quad m = 0, 1, \dots, M-1$$

The sample covariance matrix $\hat{\mathbf{R}}$ is estimated using $K$ snapshots:
$$\hat{\mathbf{R}} = \frac{1}{K} \sum_{k=1}^{K} \mathbf{x}(k)\mathbf{x}^T(k)$$
*(To prevent numerical errors, a small diagonal loading value of $0.01$ is added to the diagonal).*

The optimal weight vector $\mathbf{w}_{\mathrm{MVDR}}$ that minimizes output interference power while maintaining a distortionless gain of $1$ (0 dB) in the desired look-direction $\theta_s$ is:
$$\mathbf{w}_{\mathrm{MVDR}} = \frac{\hat{\mathbf{R}}^{-1} \mathbf{a}(\theta_s)}{\mathbf{a}^T(\theta_s)\, \hat{\mathbf{R}}^{-1}\, \mathbf{a}(\theta_s)}$$

---

## 7. Project Directory & File Structure

Here is how the project files are laid out. Knowing this helps you understand where the computations happen:

```
ASP_Simulation_6/
├── public/                     # Static ECG datasets (.csv files)
│   ├── ecg100.csv
│   ├── ecg200.csv
│   └── ecg300.csv
├── src/
│   ├── main.jsx                # Web App entry point
│   ├── context/
│   │   ├── SimulationContext.jsx    # Global lab state (loaded signals, active settings)
│   │   └── CompareRunsContext.jsx   # Manages pinned charts for comparison
│   ├── components/
│   │   ├── rightPanel/         # Interactive controls (sliders, checkboxes, select menus)
│   │   ├── leftPanel/          # Chart dashboards
│   │   ├── graph/              # Renders the time-domain, MSE, and Beampattern plots
│   │   ├── instruction/        # Interactive help menu & guidelines
│   │   └── guidedModal/        # Pop-up tutorial walkthrough for first-time users
│   └── utils/
│       ├── algorithms.js       # Core math engines (LMS-AR and MVDR calculations)
│       ├── ecgDatasetCache.js  # Preloads CSV files so they load instantly
│       ├── ecgDisplay.js       # Decimates/optimizes charts so they run smoothly
│       ├── addNoise.js         # Adds baseline wander, 50Hz hum, and EMG static
│       └── psd.js              # Computes FFT frequency spectrum
└── vite.config.js              # Bundler & project configuration
```

---

## 8. Installation and Local Usage

### Prerequisites
To run this laboratory on your computer, you need to install [Node.js](https://nodejs.org/) (version 18 or newer recommended).

### 1. Download and Install Dependencies
Open your command terminal, navigate to the folder, and run:
```bash
cd ASP_Simulation_6
npm install
```

### 2. Launch the Development Server
Start the interactive application locally:
```bash
npm run dev
```
Open the URL printed in the terminal (usually `http://localhost:5173/` or `http://localhost:5173/ASP_Simulation_6/`) in your web browser.

### 3. Production Build (To Deploy)
To build a highly optimized version that can be uploaded to a website server:
```bash
npm run build
npm run preview
```

---

*© Virtual Labs, IIT Roorkee — Experiment 3(a): Adaptive Signal Processing Simulation. Developed for educational purposes.*
