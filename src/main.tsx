import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'

import "./main.css"
import "./styles/theme.css"
import "./index.css"

// GitHub Spark detection and loading with proper error handling
if (typeof window !== 'undefined') {
  try {
    // Check for Spark environment indicators
    const hostname = window.location.hostname
    const isSparkEnvironment = hostname.includes('spark.github.dev') || 
                              hostname.includes('github.dev') ||
                              hostname.includes('app.github.dev')
    
    if (isSparkEnvironment) {
      console.log('GitHub Spark environment detected')
      
      // Only load Spark runtime if we're in the right environment
      import("@github/spark/spark").then(() => {
        console.log('Spark runtime loaded successfully')
      }).catch((error) => {
        // Don't throw error, just log it
        console.log('Spark runtime could not be loaded:', error.message)
      })
    } else {
      console.log('Running in standard web environment (non-Spark)')
    }
  } catch (error) {
    // Catch any errors during environment detection
    console.log('Environment detection error, continuing as standalone:', error.message)
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <App />
   </ErrorBoundary>
)