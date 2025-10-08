/// <reference types="vite/client" />

// GitHub Spark environment variables (optional)
declare const GITHUB_RUNTIME_PERMANENT_NAME: string | undefined
declare const BASE_KV_SERVICE_URL: string | undefined

// Extend the window object for Spark runtime (when available)
declare global {
  interface Window {
    spark?: {
      llmPrompt?: (strings: string[], ...values: any[]) => string
      llm?: (prompt: string, modelName?: string, jsonMode?: boolean) => Promise<string>
      user?: () => Promise<{avatarUrl: string, email: string, id: string, isOwner: boolean, login: string}>
      kv?: {
        keys: () => Promise<string[]>
        get: <T>(key: string) => Promise<T | undefined>
        set: <T>(key: string, value: T) => Promise<void>
        delete: (key: string) => Promise<void>
      }
    }
  }
}