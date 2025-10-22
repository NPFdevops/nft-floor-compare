import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { posthogService } from './services/posthogService.js'

// Lazy initialize PostHog after app loads
setTimeout(() => posthogService.init(), 0);

import { ThemeProvider } from './contexts/ThemeContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ThemeProvider>,
)
