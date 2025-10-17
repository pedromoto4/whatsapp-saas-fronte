import { Toaster } from '@/components/ui/sonner'
import Navbar from '@/components/Navbar'
import LandingPage from '@/components/pages/LandingPage'
import LoginPage from '@/components/pages/LoginPage'
import PricingPage from '@/components/pages/PricingPage'
import DashboardPage from '@/components/pages/DashboardPage'
import { useRouter } from '@/hooks/use-router'
import { useAuth } from '@/hooks/use-auth'
import { useEffect } from 'react'

function App() {
  const { currentRoute, navigate } = useRouter()
  const { isLoggedIn, loading } = useAuth()

  // Debug logging
  console.log('App render:', { currentRoute, isLoggedIn, loading })

  // Auto-redirect logged in users from home/login to dashboard
  useEffect(() => {
    console.log('Auth effect:', { loading, isLoggedIn, currentRoute })
    if (!loading && isLoggedIn) {
      if (currentRoute === '/' || currentRoute === '/login') {
        console.log('Redirecting to dashboard...')
        navigate('/dashboard')
      }
    }
  }, [loading, isLoggedIn, currentRoute, navigate])

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  // Protect dashboard route
  if (currentRoute === '/dashboard' && !isLoggedIn) {
    return <LoginPage />
  }

  const renderPage = () => {
    switch (currentRoute) {
      case '/':
        return <LandingPage />
      case '/login':
        return <LoginPage />
      case '/pricing':
        return <PricingPage />
      case '/dashboard':
        return <DashboardPage />
      default:
        return <LandingPage />
    }
  }

  const showNavbar = currentRoute !== '/login' && currentRoute !== '/dashboard'

  return (
    <div className="min-h-screen bg-background">
      {showNavbar && <Navbar />}
      {renderPage()}
      <Toaster position="top-right" />
    </div>
  )
}

export default App