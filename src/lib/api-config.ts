/**
 * Centralized API configuration
 * Use this to get the API base URL consistently across the app
 */
export const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
}

