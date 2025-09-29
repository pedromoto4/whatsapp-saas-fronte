import { Toaster } from '@/components/ui/sonner'
import Navbar from '@/components/Navbar'
import LandingPage from '@/components/pages/LandingPage'
import LoginPage from '@/components/pages/LoginPage'
import PricingPage from '@/components/pages/PricingPage'
import DashboardPage from '@/components/pages/DashboardPage'
import { useRouter } from '@/hooks/use-router'
import { useKV } from '@github/spark/hooks'

function App() {
  const { currentRoute } = useRouter()
  const [isLoggedIn] = useKV<boolean>('isLoggedIn', false)

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