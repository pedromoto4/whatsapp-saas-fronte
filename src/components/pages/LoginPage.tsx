import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useRouter } from '@/hooks/use-router'
import { useKV } from '@github/spark/hooks'
import { GoogleLogo } from '@phosphor-icons/react'
import { toast } from 'sonner'

export default function LoginPage() {
  const { navigate } = useRouter()
  const [, setIsLoggedIn] = useKV<boolean>('isLoggedIn', false)
  const [, setUserEmail] = useKV<string>('userEmail', '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate login process
    await new Promise(resolve => setTimeout(resolve, 1000))

    if (email && password) {
      setIsLoggedIn(true)
      setUserEmail(email)
      toast.success('Login successful!')
      navigate('/dashboard')
    } else {
      toast.error('Please enter both email and password')
    }

    setIsLoading(false)
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    
    // Simulate Google OAuth
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setIsLoggedIn(true)
    setUserEmail('user@example.com')
    toast.success('Logged in with Google!')
    navigate('/dashboard')
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary flex items-center justify-center px-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to your EngagePro account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <GoogleLogo className="mr-2 h-4 w-4" />
            {isLoading ? 'Connecting...' : 'Continue with Google'}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <button 
              className="text-primary hover:underline"
              onClick={() => toast.info('Registration will be available soon!')}
            >
              Sign up
            </button>
          </div>

          <div className="text-center">
            <button 
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
              onClick={() => navigate('/')}
            >
              ← Back to Home
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}