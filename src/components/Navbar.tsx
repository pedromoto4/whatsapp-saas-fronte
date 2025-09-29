import { Button } from '@/components/ui/button'
import { useRouter } from '@/hooks/use-router'
import { useKV } from '@github/spark/hooks'

export default function Navbar() {
  const { navigate } = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useKV<boolean>('isLoggedIn', false)

  const handleLogout = () => {
    setIsLoggedIn(false)
    navigate('/')
  }

  return (
    <nav className="w-full bg-white border-b border-border px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <button 
          onClick={() => navigate('/')}
          className="text-2xl font-bold text-primary hover:text-primary/80 transition-colors"
        >
          EngagePro
        </button>
        <div className="flex items-center gap-4">
          {!isLoggedIn ? (
            <>
              <button 
                onClick={() => navigate('/pricing')}
                className="text-foreground hover:text-primary transition-colors"
              >
                Pricing
              </button>
              <Button 
                onClick={() => navigate('/login')}
                variant="outline"
              >
                Login
              </Button>
            </>
          ) : (
            <>
              <button 
                onClick={() => navigate('/dashboard')}
                className="text-foreground hover:text-primary transition-colors"
              >
                Dashboard
              </button>
              <Button 
                onClick={handleLogout}
                variant="outline"
              >
                Logout
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}