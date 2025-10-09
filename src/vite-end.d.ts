/// <reference types="vite/client" />

// Spark runtime constants (only defined when running in Spark)
declare const GITHUB_RUNTIME_PERMANENT_NAME: string | undefined
declare const BASE_KV_SERVICE_URL: string | undefined

// GitHub Spark environment variables (optional - accessed via import.meta.env)
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_GITHUB_RUNTIME_PERMANENT_NAME?: string
  readonly VITE_BASE_KV_SERVICE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Extend the window object for Spark runtime (when available)
declare global {
  interface Window {
    spark?: {
      llmPrompt?: (strings: TemplateStringsArray, ...values: any[]) => string
      llm?: (prompt: string, modelName?: string, jsonMode?: boolean) => Promise<string>
      user?: () => Promise<{
        avatarUrl: string
        email: string
        id: string
        isOwner: boolean
        login: string
      }>
      kv?: {
        keys: () => Promise<string[]>
        get: <T>(key: string) => Promise<T | undefined>
        set: <T>(key: string, value: T) => Promise<void>
        delete: (key: string) => Promise<void>
      }
    }
  }
}