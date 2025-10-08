import { useState, useEffect } from 'react'

export type Route = '/' | '/dashboard' | '/pricing' | '/login'

export function useRouter() {
  const [currentRoute, setCurrentRoute] = useState<Route>(() => {
    // Initialize with current hash or default to '/', with safety check
    if (typeof window !== 'undefined') {
      return (window.location.hash.slice(1) || '/') as Route
    }
    return '/'
  })

  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return

    const handlePopState = () => {
      setCurrentRoute((window.location.hash.slice(1) || '/') as Route)
    }
    
    const handleHashChange = () => {
      setCurrentRoute((window.location.hash.slice(1) || '/') as Route)
    }
    
    window.addEventListener('popstate', handlePopState)
    window.addEventListener('hashchange', handleHashChange)
    
    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  const navigate = (route: Route) => {
    if (typeof window === 'undefined') return
    
    const newHash = route === '/' ? '' : route
    window.location.hash = newHash
    setCurrentRoute(route)
  }

  return { currentRoute, navigate }
}