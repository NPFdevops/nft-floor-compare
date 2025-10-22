import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { ThemeProvider } from './contexts/ThemeContext.jsx'

// Initialize PostHog immediately
posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  api_host: import.meta.env.DEV ? '/ingest' : (import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'),
  ui_host: 'https://us.posthog.com', // Keep UI host for toolbar/debugging
  person_profiles: 'identified_only',
  capture_pageview: true,
  capture_pageleave: true,
  loaded: (posthog) => {
    if (import.meta.env.DEV) {
      console.log('PostHog loaded successfully via', import.meta.env.DEV ? 'reverse proxy' : 'direct connection')
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <PostHogProvider client={posthog}>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </PostHogProvider>,
)
