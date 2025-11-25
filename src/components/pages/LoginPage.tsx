import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useRouter } from '@/hooks/use-router'
import { useAuth } from '@/hooks/use-auth'
import { GoogleLogo } from '@phosphor-icons/react'
import { toast } from 'sonner'

// Development quick login - only in development mode
const DEV_QUICK_LOGIN_EMAIL = 'pedro.moto4@gmail.com'
const DEV_QUICK_LOGIN_PASSWORD = 'as4028026' // Hardcoded for development convenience

export default function LoginPage() {
  const { navigate } = useRouter()
  const { loginWithEmail, loginWithGoogle, register, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost'

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (isRegistering) {
        await register(email, password)
      } else {
        await loginWithEmail(email, password)
      }
      // Navigation will be handled by App.tsx useEffect
    } catch (error) {
      // Error is already handled in the useAuth hook
    }
  }

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle()
      // Navigation will be handled by App.tsx useEffect
    } catch (error) {
      // Error is already handled in the useAuth hook
    }
  }

  const handleQuickLogin = async () => {
    try {
      await loginWithEmail(DEV_QUICK_LOGIN_EMAIL, DEV_QUICK_LOGIN_PASSWORD)
      toast.success(`Login rápido realizado como ${DEV_QUICK_LOGIN_EMAIL}`)
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        toast.error('Usuário não encontrado. Crie uma conta primeiro ou use o login normal.')
      } else if (error.code === 'auth/wrong-password') {
        toast.error('Senha incorreta. Verifique a senha no código.')
      } else {
        toast.error('Erro no login rápido: ' + (error.message || 'Erro desconhecido'))
      }
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
            type="button"
          >
            <GoogleLogo className="mr-2 h-4 w-4" />
            {loading ? 'Conectando...' : 'Continuar com Google'}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Se o popup for bloqueado, será usado redirect automaticamente
          </p>

          {/* Development Quick Login - Only shown in development */}
          {isDevelopment && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Desenvolvimento
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
                onClick={handleQuickLogin}
                disabled={loading}
                type="button"
              >
                🚀 Login Rápido: {DEV_QUICK_LOGIN_EMAIL}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Apenas para desenvolvimento - não aparece em produção
              </p>
            </>
          )}

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