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

// Custom hook that persists state to localStorage (works everywhere)
function useLocalStorageState<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  })

  const setValue = (value: T) => {
    try {
      setState(value)
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value))
      }
    } catch (e) {
      console.error('Error saving to localStorage:', e)
    }
  }

  return [state, setValue]
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useLocalStorageState<boolean>('isLoggedIn', false)

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