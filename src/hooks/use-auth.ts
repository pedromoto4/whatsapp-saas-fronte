import { useState, useEffect } from 'react'
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useKV<boolean>('isLoggedIn', false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setIsLoggedIn(!!user)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [setIsLoggedIn])

  const loginWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true)
      const result = await signInWithEmailAndPassword(auth, email, password)
      toast.success('Login realizado com sucesso!')
      return result
    } catch (error: any) {
      toast.error('Erro no login: ' + error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const loginWithGoogle = async () => {
    try {
      setLoading(true)
      const result = await signInWithPopup(auth, googleProvider)
      toast.success('Login com Google realizado com sucesso!')
      return result
    } catch (error: any) {
      toast.error('Erro no login com Google: ' + error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const register = async (email: string, password: string) => {
    try {
      setLoading(true)
      const result = await createUserWithEmailAndPassword(auth, email, password)
      toast.success('Conta criada com sucesso!')
      return result
    } catch (error: any) {
      toast.error('Erro ao criar conta: ' + error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      setIsLoggedIn(false)
      toast.success('Logout realizado com sucesso!')
    } catch (error: any) {
      toast.error('Erro no logout: ' + error.message)
    }
  }

  return {
    user,
    isLoggedIn,
    loading,
    loginWithEmail,
    loginWithGoogle,
    register,
    logout
  }
}