import { useState, useEffect } from 'react'

export type Route = '/' | '/dashboard' | '/pricing' | '/login'

export function useRouter() {
  const [currentRoute, setCurrentRoute] = useState<Route>('/')

  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute((window.location.hash.slice(1) || '/') as Route)
    }
    
    window.addEventListener('popstate', handlePopState)
    handlePopState() // Set initial route
    
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (route: Route) => {
    window.history.pushState({}, '', `#${route}`)
    setCurrentRoute(route)
  }

  return { currentRoute, navigate }
}