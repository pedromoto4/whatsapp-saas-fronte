import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'

import "./main.css"
import "./styles/theme.css"
import "./index.css"

// Only load Spark in GitHub Spark environment - simplified and safer
if (typeof window !== 'undefined') {
  try {
    // Check if we're in a Spark environment using multiple safe indicators
    let isSparkEnv = false
    
    // Check hostname first (most reliable)
    if (window.location.hostname.includes('spark.github.dev') || 
        window.location.hostname.includes('github.dev')) {
      isSparkEnv = true
    }
    
    // Check for runtime environment variable (optional, with error handling)
    try {
      if (import.meta?.env?.VITE_GITHUB_RUNTIME_PERMANENT_NAME) {
        isSparkEnv = true
      }
    } catch (envError) {
      // Environment variable access failed - continue without it
      console.log('Environment variable check failed:', envError)
    }
    
    // Only attempt to load Spark if we detected the environment
    if (isSparkEnv) {
      import("@github/spark/spark").catch((sparkError) => {
        console.log('Spark runtime not available:', sparkError.message)
      })
    }
  } catch (detectionError) {
    // Environment detection failed entirely - continue without Spark
    console.log('Running in standard web environment:', detectionError)
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <App />
   </ErrorBoundary>
)