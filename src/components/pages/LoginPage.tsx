import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useRouter } from '@/hooks/use-router'
import { useAuth } from '@/hooks/use-auth'
import { GoogleLogoIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'

export default function LoginPage() {
  const { navigate } = useRouter()
  const { loginWithEmail, loginWithGoogle, register, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (isRegistering) {
        await register(email, password)
      } else {
        await loginWithEmail(email, password)
      }
      navigate('/dashboard')
    } catch (error) {
      // Error is already handled in the useAuth hook
    }
  }

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle()
      navigate('/dashboard')
    } catch (error) {
      // Error is already handled in the useAuth hook
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary flex items-center justify-center px-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {isRegistering ? 'Criar Conta' : 'Bem-vindo'}
          </CardTitle>
          <CardDescription className="text-center">
            {isRegistering ? 'Crie sua conta WhatsApp SaaS' : 'Entre na sua conta WhatsApp SaaS'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Digite seu email"
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
                placeholder="Digite sua password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Processando...' : (isRegistering ? 'Criar Conta' : 'Entrar')}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Ou continue com
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <GoogleLogoIcon className="mr-2 h-4 w-4" />
            {loading ? 'Conectando...' : 'Continuar com Google'}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            {isRegistering ? 'Já tem conta?' : 'Não tem conta?'}{' '}
            <button 
              className="text-primary hover:underline"
              onClick={() => setIsRegistering(!isRegistering)}
            >
              {isRegistering ? 'Fazer login' : 'Criar conta'}
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