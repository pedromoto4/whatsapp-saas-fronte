import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, PluginOption } from "vite";
import { resolve } from 'path'

// Conditional imports for Spark environment
let sparkPlugin: any = null
let createIconImportProxy: any = null

try {
  if (process.env.SPARK_ENV === 'true' || process.env.GITHUB_RUNTIME_PERMANENT_NAME) {
    sparkPlugin = require("@github/spark/spark-vite-plugin").default
    createIconImportProxy = require("@github/spark/vitePhosphorIconProxyPlugin").default
  }
} catch (e) {
  // Spark modules not available - running in standard environment
  console.log('Running in standard (non-Spark) environment')
}

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

// Check if running in Spark environment
let isSparkEnv = false
try {
  isSparkEnv = process.env.SPARK_ENV === 'true' || !!process.env.GITHUB_RUNTIME_PERMANENT_NAME
} catch (e) {
  // Environment variable access failed - not in Spark environment
  isSparkEnv = false
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Only include Spark plugins if available and in Spark environment
    ...(createIconImportProxy ? [createIconImportProxy() as PluginOption] : []),
    ...(isSparkEnv && sparkPlugin ? [sparkPlugin() as PluginOption] : []),
  ],
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src')
    }
  },
});
