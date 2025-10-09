import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, PluginOption } from "vite";
import { resolve } from 'path'

// Detect Spark environment and conditionally load plugins
let sparkPlugin: any = null
let createIconImportProxy: any = null
let isSparkEnv = false

try {
  // Check if we're in Spark environment by trying to require the package
  // This is safer than dynamic import at config level
  sparkPlugin = require("@github/spark/spark-vite-plugin").default
  createIconImportProxy = require("@github/spark/vitePhosphorIconProxyPlugin").default
  isSparkEnv = true
  console.log('✅ Spark environment detected - plugins loaded')
} catch (error) {
  console.log('🔧 Standalone mode - Spark plugins not available')
  isSparkEnv = false
}

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Conditionally include Spark plugins (only if available)
    ...(createIconImportProxy ? [createIconImportProxy() as PluginOption] : []),
    ...(sparkPlugin ? [sparkPlugin() as PluginOption] : []),
  ],
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src')
    }
  },
});
