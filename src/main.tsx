import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'

import "./main.css"
import "./styles/theme.css"
import "./index.css"

// Only load Spark in GitHub Spark environment
if (typeof window !== 'undefined') {
  try {
    // Check if we're in a Spark environment
    let isSparkEnv = false
    
    // Check hostname first (safest check)
    if (window.location.hostname.includes('spark.github.dev')) {
      isSparkEnv = true
    }
    
    // Check for Spark environment variable (wrapped in try-catch)
    try {
      if (typeof GITHUB_RUNTIME_PERMANENT_NAME !== 'undefined' && GITHUB_RUNTIME_PERMANENT_NAME) {
        isSparkEnv = true
      }
    } catch (envError) {
      // GITHUB_RUNTIME_PERMANENT_NAME not available - not in Spark environment
    }
    
    if (isSparkEnv) {
      import("@github/spark/spark").catch(() => {
        // Failed to load Spark - running outside Spark environment
        console.log('Spark runtime not available')
      })
    }
  } catch (e) {
    // Environment detection failed - continue without Spark
    console.log('Running in standard web environment')
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <App />
   </ErrorBoundary>
)
