import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, PluginOption } from "vite";
import { resolve } from 'path'

// Conditional imports for Spark environment with better error handling
let sparkPlugin: any = null
let createIconImportProxy: any = null
let isSparkEnv = false

try {
  // More robust environment detection
  isSparkEnv = typeof window === 'undefined' && (
    process.env.SPARK_ENV === 'true' || 
    process.env.NODE_ENV === 'development' ||
    typeof process.env.GITHUB_RUNTIME_PERMANENT_NAME !== 'undefined'
  )
  
  if (isSparkEnv) {
    // Try to import Spark plugins
    try {
      sparkPlugin = require("@github/spark/spark-vite-plugin").default
      createIconImportProxy = require("@github/spark/vitePhosphorIconProxyPlugin").default
      console.log('✅ Spark plugins loaded successfully')
    } catch (importError) {
      console.log('⚠️ Spark plugins not available:', importError.message)
      isSparkEnv = false
    }
  }
} catch (e) {
  console.log('🔧 Running in standard environment')
  isSparkEnv = false
}

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Only include Spark plugins if successfully loaded
    ...(createIconImportProxy ? [createIconImportProxy() as PluginOption] : []),
    ...(isSparkEnv && sparkPlugin ? [sparkPlugin() as PluginOption] : []),
  ],
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src')
    }
  },
  // Ensure proper handling of external dependencies
  optimizeDeps: {
    exclude: ['@github/spark/hooks']
  }
});
