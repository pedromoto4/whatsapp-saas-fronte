import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { firebaseAuth, auth } from '@/lib/firebase'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'

interface User {
  uid: string
  email: string
  displayName?: string
}

// Define our own persistent state management to avoid Spark dependency issues
function usePersistentState<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  })

  const setValue = (value: T | ((prev: T) => T)) => {
    setState(prevState => {
      const nextState = typeof value === 'function' ? (value as (prev: T) => T)(prevState) : value
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(key, JSON.stringify(nextState))
        }
      } catch (e) {
        console.error('Error saving to localStorage:', e)
      }
      return nextState
    })
  }

  return [state, setValue]
}

export function useAuth() {
  const [user, setUser] = usePersistentState<User | null>('auth-user', null)
  const [isLoggedIn, setIsLoggedIn] = usePersistentState<boolean>('auth-is-logged-in', false)
  const [loading, setLoading] = useState(true) // Start with true to show loading initially

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          const userData: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User'
          }
          setUser(userData)
          setIsLoggedIn(true)
          
          // Store Firebase token for backend authentication
          const token = await firebaseUser.getIdToken()
          localStorage.setItem('firebase_token', token)
        } else {
          setUser(null)
          setIsLoggedIn(false)
          localStorage.removeItem('firebase_token')
        }
      } catch (error) {
        console.error('Auth state change error:', error)
        setUser(null)
        setIsLoggedIn(false)
        localStorage.removeItem('firebase_token')
      } finally {
        setLoading(false) // Always set loading to false after auth check
      }
    })

    return () => unsubscribe()
  }, [setUser, setIsLoggedIn])

  const loginWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true)
      
      const userCredential = await firebaseAuth.signInWithEmail(auth, email, password)
      const firebaseUser = userCredential.user
      
      const userData: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User'
      }
      
      // Get Firebase token for backend
      const token = await firebaseUser.getIdToken()
      localStorage.setItem('firebase_token', token)
      
      toast.success('Login realizado com sucesso!')
      return { user: userData }
    } catch (error: any) {
      console.error('Login error:', error)
      let errorMessage = 'Erro no login'
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Utilizador não encontrado'
          break
        case 'auth/wrong-password':
          errorMessage = 'Password incorreta'
          break
        case 'auth/invalid-email':
          errorMessage = 'Email inválido'
          break
        case 'auth/too-many-requests':
          errorMessage = 'Muitas tentativas. Tente novamente mais tarde'
          break
        default:
          errorMessage = error.message || 'Erro desconhecido'
      }
      
      toast.error(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const loginWithGoogle = async () => {
    try {
      setLoading(true)
      
      const result = await firebaseAuth.signInWithGoogle()
      const firebaseUser = result.user
      
      const userData: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User'
      }
      
      // Get Firebase token for backend
      const token = await firebaseUser.getIdToken()
      localStorage.setItem('firebase_token', token)
      
      toast.success('Login com Google realizado com sucesso!')
      return { user: userData }
    } catch (error: any) {
      console.error('Google login error:', error)
      toast.error('Erro no login com Google: ' + (error.message || 'Erro desconhecido'))
      throw error
    } finally {
      setLoading(false)
    }
  }

  const register = async (email: string, password: string) => {
    try {
      setLoading(true)
      
      const userCredential = await firebaseAuth.createUser(auth, email, password)
      const firebaseUser = userCredential.user
      
      const userData: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User'
      }
      
      // Get Firebase token for backend
      const token = await firebaseUser.getIdToken()
      localStorage.setItem('firebase_token', token)
      
      toast.success('Conta criada com sucesso!')
      return { user: userData }
    } catch (error: any) {
      console.error('Registration error:', error)
      let errorMessage = 'Erro ao criar conta'
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Este email já está em uso'
          break
        case 'auth/invalid-email':
          errorMessage = 'Email inválido'
          break
        case 'auth/weak-password':
          errorMessage = 'Password muito fraca'
          break
        default:
          errorMessage = error.message || 'Erro desconhecido'
      }
      
      toast.error(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await firebaseAuth.signOut()
      toast.success('Logout realizado com sucesso!')
    } catch (error: any) {
      console.error('Logout error:', error)
      toast.error('Erro no logout: ' + (error.message || 'Erro desconhecido'))
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