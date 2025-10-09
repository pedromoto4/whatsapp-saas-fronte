import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, PluginOption } from "vite";
import { resolve } from 'path'

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

// https://vite.dev/config/
export default defineConfig(async () => {
  // Detect Spark environment and conditionally load plugins
  let sparkPlugin: any = null
  let createIconImportProxy: any = null
  let isSparkEnv = false

  try {
    // Try dynamic import of Spark plugins (ESM compatible)
    const [sparkPkg, iconPkg] = await Promise.all([
      import("@github/spark/spark-vite-plugin").catch(() => null),
      import("@github/spark/vitePhosphorIconProxyPlugin").catch(() => null)
    ])
    
    if (sparkPkg && iconPkg) {
      sparkPlugin = sparkPkg.default
      createIconImportProxy = iconPkg.default
      isSparkEnv = true
      console.log('✅ Spark environment detected - plugins loaded')
    } else {
      console.log('🔧 Standalone mode - Spark plugins not available')
    }
  } catch (error) {
    console.log('🔧 Standalone mode - Spark plugins not available')
    isSparkEnv = false
  }

  return {
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
  }
});
