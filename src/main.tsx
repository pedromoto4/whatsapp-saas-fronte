import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";

// Import Spark if available (only works in GitHub Spark environment)
try {
  // @ts-ignore
  await import("@github/spark/spark")
} catch {
  // Spark not available (Vercel, local dev, etc.) - that's ok
}

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'

import "./main.css"
import "./styles/theme.css"
import "./index.css"

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <App />
   </ErrorBoundary>
)
