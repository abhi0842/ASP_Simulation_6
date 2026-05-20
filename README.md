# Experiment 3(a): Adaptive Signal Processing Simulation

This project is a React-based web application that simulates and visualizes adaptive signal processing algorithms for Experiment 3(a). By leveraging modern web technologies, it implements complex mathematical algorithms natively on the client-side, ensuring fast, real-time feedback without the need for an external backend like Octave.

## Datasets Used (ECG)

This experiment uses **three ECG datasets** placed in `public/`:
- `public/ecg100.csv`
- `public/ecg200.csv`
- `public/ecg300.csv`

### How the datasets are used and why
- **Selection**: In the UI under **Signal Setup → Select ECG Dataset**.
- **Usage**: The app plots `ECG_I` as the primary channel. These datasets provide a realistic basis to visualize raw sampled waveforms, though the core algorithms in this specific experiment (ARP and MVDR) generate their own synthetic signals to demonstrate fundamental adaptive filtering concepts clearly.

## Implemented Algorithms

### 1. Autoregressive (AR) Process via LMS (Least Mean Squares)
This algorithm simulates a 2nd-order Autoregressive (AR) process and applies an LMS adaptive filter to iteratively estimate the optimal filter coefficients.

- **How it works**: The algorithm generates a synthetic signal using a known AR model. The LMS filter then attempts to predict this signal by adapting its weights. At each step, it calculates the error between its prediction and the actual signal, and updates its weights to minimize the mean square error (MSE).
- **Visualizations and What They Explain:**
  - **Mean Square Error (MSE) vs. Iterations:** Tracks the learning curve of the algorithm. It plots the squared error over time. A rapid drop indicates the filter is quickly adapting to the signal. The flat tail end shows the steady-state error after convergence.
  - **Random Walk of Weights ($w_1$ & $w_2$):** Displays the real-time trajectory of the adaptive filter taps. It shows exactly *how* the algorithm learns—starting from your chosen initial values and randomly "walking" until they lock onto the optimal theoretical coefficients.
- **Why we use it**: The AR process is a standard model for testing adaptive filters. LMS is used because of its computational simplicity and robustness. This experiment visualizes the **learning curve** (MSE convergence) and the **weight trajectory** (random walk), helping students understand how adaptive filters learn over time.

### 2. MVDR (Minimum Variance Distortionless Response) Beamformer
The MVDR Beamformer is an optimal spatial filtering technique used with antenna arrays.

- **How it works**: It calculates array weights that minimize the total output power (variance) while strictly maintaining a constant gain (distortionless response) in the direction of the desired signal ($\theta_s$). Consequently, it places deep "nulls" in the directions of interfering signals ($\theta_i$).
- **Visualizations and What They Explain:**
  - **Beam Pattern (Spatial Power Spectrum):** Plots the array's spatial gain (in dB) across all angles (-90° to +90°). It visually proves that the beamformer works by showing a massive peak at the **DOA of Signal** (maximizing signal reception) and a sharp, deep dip/null precisely at the **DOA of Interference** (blocking the jammer).
- **Why we use it**: It demonstrates spatial filtering and interference suppression. By adjusting SNR, INR, and DOA angles, users can see how the array's "beam pattern" dynamically adapts to capture the target signal while rejecting noise and jamming signals.

## Technologies Used
* **React & Vite**: Fast UI component architecture.
* **Chart.js**: Real-time rendering of complex charts (MSE, Weight walks, Beam patterns).
* **PapaParse**: Fast client-side CSV parsing.

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```
