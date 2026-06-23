import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/dashboard.css'
import App from './App.jsx'
import { SimulationProvider } from './context/SimulationContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SimulationProvider>
      <App />
    </SimulationProvider>
  </StrictMode>,
)
