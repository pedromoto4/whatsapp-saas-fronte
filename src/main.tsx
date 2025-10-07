import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'

import "./main.css"
import "./styles/theme.css"
import "./index.css"

// Only load Spark in GitHub Spark environment
if (typeof window !== 'undefined' && window.location.hostname.includes('spark.github.dev')) {
  import("@github/spark/spark").catch(() => {
    // Failed to load Spark
  })
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <App />
   </ErrorBoundary>
)
