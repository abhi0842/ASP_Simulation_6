import React, { useContext } from 'react';
import { SimulationContext } from '../../context/SimulationContext';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export const Exp3aGraph = () => {
  const { algoResults } = useContext(SimulationContext);

  if (!algoResults) return null;

  if (algoResults.type === "AR Process") {
    const data = algoResults.data;
    
    const mseData = {
      labels: data.iterations,
      datasets: [
        {
          label: 'Mean Square Error',
          data: data.mse,
          borderColor: 'red',
          borderWidth: 1,
          pointRadius: 0
        }
      ]
    };

    const w1Data = {
      labels: data.iterations,
      datasets: [
        {
          label: 'Estimated w1',
          data: data.w1,
          borderColor: 'blue',
          borderWidth: 1,
          pointRadius: 0
        },
        {
          label: 'Optimal w1',
          data: Array(data.N).fill(data.w_opt[0]),
          borderColor: 'green',
          borderWidth: 1,
          borderDash: [5, 5],
          pointRadius: 0
        }
      ]
    };

    const w2Data = {
      labels: data.iterations,
      datasets: [
        {
          label: 'Estimated w2',
          data: data.w2,
          borderColor: 'purple',
          borderWidth: 1,
          pointRadius: 0
        },
        {
          label: 'Optimal w2',
          data: Array(data.N).fill(data.w_opt[1]),
          borderColor: 'orange',
          borderWidth: 1,
          borderDash: [5, 5],
          pointRadius: 0
        }
      ]
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', padding: '20px', background: '#fff', borderRadius: '8px', marginTop: '20px' }}>
        <h3 style={{color: '#1D7480'}}>Algorithm Output (AR Process LMS)</h3>
        <div style={{ height: '300px' }}>
          <Line data={mseData} options={{ maintainAspectRatio: false, plugins: { title: { display: true, text: 'Mean Square Error vs Iterations' } } }} />
        </div>
        <div style={{ height: '300px' }}>
          <Line data={w1Data} options={{ maintainAspectRatio: false, plugins: { title: { display: true, text: 'Random Walk of w1' } } }} />
        </div>
        <div style={{ height: '300px' }}>
          <Line data={w2Data} options={{ maintainAspectRatio: false, plugins: { title: { display: true, text: 'Random Walk of w2' } } }} />
        </div>
      </div>
    );
  }

  if (algoResults.type === "MVDR Beamformer") {
    const data = algoResults.data;
    const mvdrData = {
      labels: data.phi,
      datasets: [
        {
          label: 'Magnitude (dB)',
          data: data.G_dB_avg,
          borderColor: 'blue',
          borderWidth: 2,
          pointRadius: 0
        }
      ]
    };

    return (
      <div style={{ width: '100%', padding: '20px', background: '#fff', height: '400px', borderRadius: '8px', marginTop: '20px' }}>
        <h3 style={{color: '#1D7480'}}>Algorithm Output (MVDR)</h3>
        <Line data={mvdrData} options={{ maintainAspectRatio: false, plugins: { title: { display: true, text: 'MVDR Beamformed Output with Monte Carlo Runs' } }, scales: { x: { title: { display: true, text: 'Angle (degrees)' } }, y: { title: { display: true, text: 'Magnitude (dB)' } } } }} />
      </div>
    );
  }

  return null;
};
