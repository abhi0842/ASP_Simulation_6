# Adaptive Signal Processing Virtual Laboratory

**Implementation and Analysis of Autoregressive Stochastic Processes and Minimum Variance Distortionless Beamformer using LMS Algorithm and Monte Carlo Runs**

*B.Tech / M.Tech — Electronics & Communication Engineering · Academic Year 2024–2025*

---

Interactive browser-based laboratory for **Experiment 6 — Adaptive Signal Processing for ECG Analysis**. This simulator implements the unified theoretical framework from the ASP theory document: **AR stochastic modelling**, **LMS adaptive filtering**, **MVDR beamforming**, **Power Spectral Density (PSD) analysis**, and **Monte Carlo statistical validation** on real electrocardiogram (ECG) recordings.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [What This Simulation Does](#2-what-this-simulation-does)
3. [Stochastic Processes — Theoretical Background](#3-stochastic-processes--theoretical-background)
4. [Autoregressive (AR) Stochastic Processes](#4-autoregressive-ar-stochastic-processes)
5. [Least Mean Squares (LMS) Algorithm](#5-least-mean-squares-lms-algorithm)
6. [MVDR Beamformer](#6-mvdr-beamformer)
7. [Monte Carlo Simulation](#7-monte-carlo-simulation)
8. [Unified Framework & Signal Processing Pipeline](#8-unified-framework--signal-processing-pipeline)
9. [Step-by-Step Simulation Guide](#9-step-by-step-simulation-guide)
10. [Interactive Experiments](#10-interactive-experiments)
11. [Summary of Key Equations](#11-summary-of-key-equations)
12. [References](#12-references)
13. [Project Structure](#13-project-structure)
14. [Installation and Local Usage](#14-installation-and-local-usage)

---

## 1. Introduction

Adaptive signal processing is a branch of digital signal processing (DSP) in which filter parameters are automatically adjusted based on the characteristics of the input signal. Unlike fixed filters, adaptive filters track time-varying statistical properties of signals, making them indispensable in noise cancellation, echo elimination, channel equalization, and biomedical signal processing.

This laboratory presents four interconnected concepts:

| Topic | Role in the lab |
| :--- | :--- |
| **AR stochastic processes** | Model the structured, predictable component of ECG waveforms |
| **LMS algorithm** | Adaptively denoise the corrupted ECG using gradient-based weight updates |
| **MVDR beamformer** | Optimally reject directional interference under a distortionless constraint |
| **Monte Carlo simulation** | Evaluate convergence, steady-state MSE, and confidence bands statistically |

The simulator applies these methods to **ECG signals** corrupted by realistic noise: baseline wander, powerline hum (50 Hz), and EMG muscle noise.

---

## 2. What This Simulation Does

The dashboard runs a complete adaptive signal processing workflow:

| Stage | Simulator action |
| :--- | :--- |
| **Signal Setup** | Load built-in ECG datasets (`ecg100`, `ecg200`, `ecg300`) or upload CSV/TXT |
| **Add Noise** | Inject baseline wander, 50 Hz powerline hum, and/or EMG noise |
| **Apply Filter** | Run **LMS Adaptive Filter** (temporal) or **MVDR Beamformer** (spatial) |
| **Compute PSD** | View unfiltered vs. filtered power spectral density side by side |
| **LMS vs MVDR Comparison** | Run both algorithms on the same noisy signal and compare outputs |
| **Monte Carlo Runs** | Repeat LMS denoising with independent noise realisations and analyse ensemble statistics |

**Algorithms available in Algorithm Setup:**

- **LMS Adaptive Filter** — adaptive noise cancellation with filter order *M* and step size μ
- **MVDR Beamformer** — spatial filtering with sensor array, steering angles, and diagonal loading

---

## 3. Stochastic Processes — Theoretical Background

### 3.1 Definition

A **stochastic process** is a collection of random variables $\{x[n],\, n \in \mathbb{Z}\}$ defined on a common probability space. In practice, processes are characterised by second-order statistics: the mean and the autocorrelation function.

### 3.2 Wide-Sense Stationarity (WSS)

A process is **wide-sense stationary** if:

1. **Constant mean:** $\mathbb{E}\{x[n]\} = \mu$ (independent of $n$)
2. **Autocorrelation depends only on lag:** $R_x[n_1, n_2] = R_x[n_1 - n_2] = R_x[k]$

The autocorrelation function (ACF) is:

$$R_x[k] = \mathbb{E}\{\, x[n] \cdot x[n-k] \,\}$$

### 3.3 Power Spectral Density (Wiener–Khinchin Theorem)

For a WSS process, the PSD is the discrete-time Fourier transform of the ACF:

$$S_x(e^{j\omega}) = \sum_{k=-\infty}^{\infty} R_x[k]\, e^{-j\omega k}$$

In the simulator, PSD is estimated via **Hanning-windowed FFT** and displayed in **V²/Hz** from 0 to $f_s/2$ Hz when you click **Compute PSD**.

---

## 4. Autoregressive (AR) Stochastic Processes

### 4.1 AR(p) Model

An autoregressive process of order $p$, denoted **AR(p)**, expresses the current sample as a linear combination of $p$ past samples plus white noise:

$$x[n] = a_1 x[n-1] + a_2 x[n-2] + \cdots + a_p x[n-p] + w[n]$$

Compact form:

$$x[n] = \mathbf{a}^T \mathbf{x}_{n-1} + w[n], \quad w[n] \sim \mathcal{N}(0, \sigma_w^2)$$

### 4.2 Stability

The AR(p) process is stationary when all roots of the characteristic polynomial lie inside the unit circle:

$$A(z) = 1 - a_1 z^{-1} - a_2 z^{-2} - \cdots - a_p z^{-p}, \quad |z_i| < 1$$

### 4.3 AR Power Spectral Density

$$S_x(e^{j\omega}) = \frac{\sigma_w^2}{\left|A(e^{j\omega})\right|^2} = \frac{\sigma_w^2}{\left|1 - \sum_{k=1}^{p} a_k e^{-j\omega k}\right|^2}$$

This all-pole model captures prominent spectral peaks in signals such as speech and ECG.

### 4.4 Yule–Walker Equations

AR coefficients are estimated from the signal autocorrelation:

$$\mathbf{R}\,\mathbf{a} = -\mathbf{r}, \quad \mathbf{a} = -\mathbf{R}^{-1}\mathbf{r}$$

Noise variance: $\hat{\sigma}_w^2 = R_x[0] + \mathbf{a}^T \mathbf{r}$

### 4.5 Model Order Selection

| Criterion | Expression |
| :--- | :--- |
| **AIC** | $\mathrm{AIC}(p) = N \ln(\hat{\sigma}_w^2(p)) + 2p$ |
| **BIC / MDL** | $\mathrm{BIC}(p) = N \ln(\hat{\sigma}_w^2(p)) + p \ln(N)$ |

The optimal order minimises the chosen criterion.

---

## 5. Least Mean Squares (LMS) Algorithm

### 5.1 Adaptive Filtering Problem

Given input regression vector $\mathbf{x}[n] \in \mathbb{R}^M$ and desired signal $d[n]$:

$$\hat{y}[n] = \mathbf{w}^T[n]\,\mathbf{x}[n], \qquad e[n] = d[n] - \hat{y}[n]$$

In this simulator, LMS performs **adaptive noise cancellation** on the noisy ECG: the filter learns to estimate and subtract structured noise while preserving the heartbeat waveform.

### 5.2 Wiener–Hopf Optimal Solution

The weight vector minimising mean square error $J(\mathbf{w}) = \mathbb{E}\{e^2[n]\}$ satisfies:

$$\mathbf{R}\,\mathbf{w}_{\mathrm{opt}} = \mathbf{p}, \qquad \mathbf{w}_{\mathrm{opt}} = \mathbf{R}^{-1}\mathbf{p}$$

Minimum MSE: $J_{\min} = \sigma_d^2 - \mathbf{p}^T \mathbf{w}_{\mathrm{opt}}$

### 5.3 LMS Update Rule

The LMS algorithm replaces statistical expectations with instantaneous gradient estimates:

| Step | Equation |
| :--- | :--- |
| Filter output | $y[n] = \mathbf{w}^T[n]\,\mathbf{x}[n]$ |
| Error | $e[n] = d[n] - y[n]$ |
| Weight update | $\mathbf{w}[n+1] = \mathbf{w}[n] + 2\mu\, e[n]\,\mathbf{x}[n]$ |

**Simulator parameters:**

- **Filter Order (M)** — number of taps ($1 \leq M \leq 256$)
- **Step size μ** — learning rate; typical range $10^{-8}$ to $0.1$

### 5.4 Convergence and Misadjustment

**Stability condition:**

$$0 < \mu < \frac{1}{\lambda_{\max}}$$

Conservative bound: $0 < \mu < 1/(M \cdot P_x)$ where $P_x$ is average input power.

**Mode time constant:** $\tau_k = 1/(4\mu\lambda_k)$

**Misadjustment:** $\mathcal{M} \approx \mu \cdot \mathrm{tr}(\mathbf{R})$

| Step size μ | Convergence | Steady-state MSE | Stability |
| :--- | :--- | :--- | :--- |
| Large μ | Fast | High (large EMSE) | Risk of divergence |
| Small μ | Slow | Low (near $J_{\min}$) | Guaranteed stable |
| Moderate μ | Balanced | Acceptable EMSE | Stable |

---

## 6. MVDR Beamformer

### 6.1 Concept

The **Minimum Variance Distortionless Response (MVDR)** beamformer (Capon, 1969) maximises output SINR while guaranteeing the desired signal passes undistorted. Unlike LMS, MVDR solves a **constrained optimisation** problem analytically.

### 6.2 Signal Model

$$\mathbf{x}[n] = s[n]\,\mathbf{d} + \mathbf{i}[n] + \mathbf{v}[n], \qquad y[n] = \mathbf{w}^H \mathbf{x}[n]$$

### 6.3 Optimisation Problem

$$\min_{\mathbf{w}} \;\mathbf{w}^H \mathbf{R}\,\mathbf{w} \quad \text{subject to} \quad \mathbf{w}^H \mathbf{d} = 1$$

### 6.4 Closed-Form Solution

$$\mathbf{w}_{\mathrm{MVDR}} = \frac{\mathbf{R}^{-1}\mathbf{d}}{\mathbf{d}^H \mathbf{R}^{-1}\mathbf{d}}$$

### 6.5 Covariance Estimation & Diagonal Loading

$$\hat{\mathbf{R}} = \frac{1}{N}\sum_{n=1}^{N} \mathbf{x}[n]\mathbf{x}^H[n], \qquad \hat{\mathbf{R}}_{\mathrm{DL}} = \hat{\mathbf{R}} + \delta \mathbf{I}$$

Diagonal loading $\delta > 0$ improves numerical stability when snapshot count is limited.

**Simulator parameters:**

- **Number of Sensors (M)** — array size (2–16)
- **Desired Angle $\theta_s$** — look direction of ECG signal (−90° to 90°)
- **Interferer Angle $\theta_i$** — direction of main interference
- **Diagonal Loading δ** — regularisation factor (0–0.1)

**Outputs:** filtered waveform, beampattern, covariance heatmap, input/output SNR.

### 6.6 LMS vs. MVDR

| Criterion | LMS | MVDR |
| :--- | :--- | :--- |
| Approach | Stochastic gradient (iterative) | Constrained optimisation (analytical) |
| Optimality | Converges to Wiener solution | Statistically optimal (maximises SINR) |
| Desired signal | No explicit protection | Guaranteed distortionless response |
| Cost per step | $O(M)$ | $O(M^3)$ for matrix inversion |
| Adaptation | Continuous, sample-by-sample | Batch / snapshot-based |

---

## 7. Monte Carlo Simulation

### 7.1 Concept

A single simulation run is one realisation of a stochastic process. **Monte Carlo** repeats the experiment $N_{\mathrm{MC}}$ times with independent noise sequences and averages the results (Law of Large Numbers).

### 7.2 Ensemble MSE

Instantaneous squared error in trial $k$:

$$\xi_k[n] = e_k^2[n] = (d_k[n] - \hat{y}_k[n])^2$$

Ensemble-averaged MSE:

$$J_{\mathrm{MC}}[n] = \frac{1}{N_{\mathrm{MC}}} \sum_{k=1}^{N_{\mathrm{MC}}} e_k^2[n] \;\rightarrow\; \mathbb{E}\{e^2[n]\} = J[n]$$

### 7.3 Performance Metrics

| Metric | Expression / meaning |
| :--- | :--- |
| Convergence time | Iterations to reach within ~5% of steady-state MSE |
| Steady-state MSE | $J_{ss} \approx J_{\min}/(1 - \mu \cdot \mathrm{tr}(\mathbf{R}))$ |
| Misadjustment | $\mathcal{M} = (J_{ss} - J_{\min})/J_{\min} \approx \mu \cdot \mathrm{tr}(\mathbf{R})$ |
| SNR improvement | $10\log_{10}(\sigma_{\mathrm{signal}}^2 / J_{ss}) - \mathrm{SNR}_{\mathrm{in}}$ (dB) |
| 95% confidence interval | $J_{\mathrm{MC}}[n] \pm 1.96 \cdot \mathrm{SE}[n]$ |

In the simulator, open **Monte Carlo Runs & Statistical Analysis** after applying a filter. The explainer widget shows individual trials, running average, and confidence bands with the governing formulas.

---

## 8. Unified Framework & Signal Processing Pipeline

The theory document (§7) connects AR modelling, LMS, MVDR, and Monte Carlo into one pipeline. The simulator implements this as follows:

| Stage | Operation | Mathematical core | Simulator output |
| :---: | :--- | :--- | :--- |
| 1 | Signal model | AR(p): $x[n] = \mathbf{a}^T \mathbf{x}_{n-1} + w[n]$ | Clean ECG waveform |
| 2 | Noise addition | $d[n] = x[n] + \mathrm{noise}[n]$ | Noisy ECG chart |
| 3 | LMS filter | $\mathbf{w}[n+1] = \mathbf{w}[n] + 2\mu e[n]\mathbf{x}[n]$ | Filtered ECG, comparison, weight evolution |
| 4 | MVDR | $\mathbf{w} = \mathbf{R}^{-1}\mathbf{d}/(\mathbf{d}^H\mathbf{R}^{-1}\mathbf{d})$ | Beam pattern, covariance, SNR |
| 5 | Monte Carlo | $J[n] = (1/N_{\mathrm{MC}})\sum e_k^2[n]$ | Learning curve, confidence bands |
| 6 | PSD analysis | FFT of Hanning-windowed signal | Unfiltered vs. filtered spectra |

---

## 9. Step-by-Step Simulation Guide

### 9.1 Load an ECG Signal

1. Open **Signal Setup** (right panel).
2. Select a dataset (`ecg100`, `ecg200`, `ecg300`) or **Upload your own (CSV/TXT)**.
3. Set **Duration (seconds)** with the slider.
4. Click **Generate ECG Signal**. The clean waveform appears on the left.

### 9.2 Add Noise

1. In **Noise Configuration**, enable one or more types:
   - **Baseline Wander** — slow drift from breathing/movement
   - **Powerline Hum (50 Hz)** — electrical interference
   - **EMG Noise** — muscle artefact
2. Click **Add Noise to Signal**.

### 9.3 LMS Adaptive Filter

1. In **Algorithm Setup**, select **LMS Adaptive Filter**.
2. Set **Filter Order (M)** (start with 32) and **Step size μ** (start with 0.01 or smaller).
3. Click **Apply Filter**.
4. Review results: filtered ECG, noisy vs. filtered comparison, adaptive weight evolution, Monte Carlo panel.
5. Click **Compute PSD** to view unfiltered and filtered spectra side by side.

### 9.4 MVDR Beamformer

1. Select **MVDR Beamformer** in the algorithm dropdown.
2. Configure **Number of Sensors**, **Desired Angle $\theta_s$**, **Interferer Angle $\theta_i$**, and **Diagonal Loading δ**.
3. Click **Apply Filter** (requires noise to be added first).
4. Review: MVDR filtered output, beampattern, covariance heatmap, SNR metrics.
5. Click **Compute PSD** for frequency-domain verification.

### 9.5 LMS vs MVDR Comparison

1. Scroll to **LMS vs MVDR Comparison** (below Algorithm Setup).
2. Set LMS and MVDR parameters independently.
3. Click **Run LMS vs MVDR Comparison** for side-by-side results on the same noisy ECG.

### 9.6 Monte Carlo Analysis

1. After **Apply Filter** (LMS or MVDR path), expand **Monte Carlo Runs & Statistical Analysis** on the left.
2. Set number of runs (default 50; theory recommends 100–500 for smooth curves).
3. Click **Run Monte Carlo** and explore the explainer tabs: individual trials, running average, confidence bands.

---

## 10. Interactive Experiments

### Experiment A — LMS Divergence (μ too large)

- Load `ecg100`, add noise, select LMS.
- Increase **Step size μ** to 0.05 or higher and click **Apply Filter**.
- Observe unstable output and rising error — the filter diverges when $\mu > 1/\lambda_{\max}$.

### Experiment B — MVDR Null Depth vs. Array Size

- Select MVDR; set $\theta_s = 0°$, $\theta_i = 30°$.
- Run with **M = 4** sensors, then **M = 12**.
- Compare beampatterns: more sensors yield sharper interference nulls.

### Experiment C — PSD Verification of Powerline Removal

- Add **Powerline Hum (50 Hz)** only.
- Apply LMS or MVDR, then **Compute PSD**.
- Confirm the 50 Hz spike in the unfiltered spectrum is attenuated in the filtered spectrum.

### Experiment D — Monte Carlo Confidence Bands

- Apply LMS with μ = 0.01, run Monte Carlo with $N_{\mathrm{MC}} = 50$, then 200.
- Observe narrower confidence bands with more trials (smaller standard error).

---

## 11. Summary of Key Equations

| Name | Expression |
| :--- | :--- |
| AR(p) model | $x[n] = \sum_{k=1}^{p} a_k x[n-k] + w[n]$ |
| Yule–Walker | $\mathbf{R}\mathbf{a} = -\mathbf{r}$, $\mathbf{a} = -\mathbf{R}^{-1}\mathbf{r}$ |
| AR PSD | $S_x = \sigma_w^2 / \|A(e^{j\omega})\|^2$ |
| Wiener solution | $\mathbf{w}_{\mathrm{opt}} = \mathbf{R}^{-1}\mathbf{p}$ |
| LMS output | $y[n] = \mathbf{w}^T[n]\mathbf{x}[n]$ |
| LMS error | $e[n] = d[n] - y[n]$ |
| LMS update | $\mathbf{w}[n+1] = \mathbf{w}[n] + 2\mu e[n]\mathbf{x}[n]$ |
| LMS stability | $0 < \mu < 1/\lambda_{\max}$ |
| Misadjustment | $\mathcal{M} = \mu \cdot \mathrm{tr}(\mathbf{R})$ |
| MVDR weights | $\mathbf{w} = \mathbf{R}^{-1}\mathbf{d} / (\mathbf{d}^H \mathbf{R}^{-1}\mathbf{d})$ |
| Covariance estimate | $\hat{\mathbf{R}} = (1/N)\sum \mathbf{x}[n]\mathbf{x}^H[n]$ |
| Monte Carlo MSE | $J[n] = (1/N_{\mathrm{MC}})\sum_k e_k^2[n]$ |

---

## 12. References

[1] S. Haykin, *Adaptive Filter Theory*, 4th ed. Prentice Hall, 2002.

[2] J. G. Proakis and D. G. Manolakis, *Digital Signal Processing: Principles, Algorithms, and Applications*, 4th ed. Prentice Hall, 2007.

[3] S. M. Kay, *Modern Spectral Estimation: Theory and Application*. Prentice Hall, 1988.

[4] J. P. Burg, "Maximum entropy spectral analysis," in *Proc. 37th Meeting Soc. Exploration Geophysicists*, 1967.

[5] B. Widrow and S. D. Stearns, *Adaptive Signal Processing*. Prentice Hall, 1985.

[6] J. Capon, "High-resolution frequency-wavenumber spectrum analysis," *Proc. IEEE*, vol. 57, no. 8, pp. 1408–1418, Aug. 1969.

[7] A. H. Sayed, *Fundamentals of Adaptive Filtering*. Wiley-IEEE Press, 2003.

[8] H. L. Van Trees, *Optimum Array Processing*. Wiley-Interscience, 2002.

[9] P. Stoica and R. Moses, *Spectral Analysis of Signals*. Prentice Hall, 2005.

[10] L. C. Godara, "Application of antenna arrays to mobile communications, Part II," *Proc. IEEE*, vol. 85, no. 8, pp. 1195–1245, Aug. 1997.

---

## 13. Project Structure

```
ASP_Simulation_6/
├── public/                          # Static ECG datasets
│   ├── ecg100.csv
│   ├── ecg200.csv
│   └── ecg300.csv
├── src/
│   ├── main.jsx                     # Application entry point
│   ├── guideSteps.js                # Guided tour steps
│   ├── context/
│   │   └── SimulationContext.jsx    # Global simulation state
│   ├── components/
│   │   ├── rightPanel/              # Controls (signal, noise, algorithms)
│   │   ├── leftPanel/               # Result charts and analysis panels
│   │   ├── graph/                   # ECG, PSD, MVDR, Monte Carlo charts
│   │   ├── educational/             # Weight evolution, dataset info
│   │   ├── instruction/             # Lab instructions panel
│   │   ├── guidedModal/             # First-run guided tour
│   │   ├── noise/                   # Noise type cards and previews
│   │   └── MonteCarloExplainer.jsx  # Monte Carlo theory & visualisation
│   └── utils/
│       ├── filters.js               # LMS adaptive filter engine
│       ├── spatialMvdr.js           # Spatial ULA MVDR beamformer
│       ├── psd.js                   # Hanning-window FFT PSD
│       ├── monteCarloEcg.js         # Monte Carlo LMS experiments
│       ├── addNoise.js              # Baseline, powerline, EMG noise
│       ├── arModel.js               # AR modelling utilities
│       ├── pipeline.js              # Full 5-stage theory pipeline
│       └── ecgDatasets.js           # Dataset paths and upload parsing
├── package.json
└── vite.config.js
```

---

## 14. Installation and Local Usage

### Prerequisites

[Node.js](https://nodejs.org/) version 18 or newer.

### Install dependencies

```bash
cd ASP_Simulation_6
npm install
```

### Run development server

```bash
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173/`).

### Production build

```bash
npm run build
npm run preview
```

---

*© Virtual Labs, IIT Roorkee — Adaptive Signal Processing Simulation. Developed for B.Tech / M.Tech laboratory instruction.*
