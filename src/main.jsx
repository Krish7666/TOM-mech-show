import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import { MechanismsProvider } from './context/MechanismsContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <MechanismsProvider>
        <App />
      </MechanismsProvider>
    </ErrorBoundary>
  </StrictMode>,
)


