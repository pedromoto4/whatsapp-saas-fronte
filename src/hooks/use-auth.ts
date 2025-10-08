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
import { toast } from 'sonner'

// Simple localStorage-based persistence for compatibility
function useAuthState(): [boolean, (value: boolean) => void] {
  const [isLoggedIn, setIsLoggedInState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      const item = localStorage.getItem('auth-is-logged-in')
      return item ? JSON.parse(item) : false
    } catch {
      return false
    }
  })

  const setIsLoggedIn = (value: boolean) => {
    try {
      setIsLoggedInState(value)
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth-is-logged-in', JSON.stringify(value))
      }
    } catch (e) {
      console.error('Error saving auth state:', e)
    }
  }

  return [isLoggedIn, setIsLoggedIn]
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useAuthState()

  useEffect(() => {
    // Add error handling for Firebase initialization
    try {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user)
        setIsLoggedIn(!!user)
        setLoading(false)
      }, (error) => {
        console.error('Firebase auth state change error:', error)
        setLoading(false)
      })

      return () => unsubscribe()
    } catch (error) {
      console.error('Firebase auth initialization error:', error)
      setLoading(false)
    }
  }, [])

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