import { useState, useEffect } from 'react'
import { toast } from 'sonner'

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
  const [loading, setLoading] = useState(false)

  const loginWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true)
      
      // Simulate authentication - in real app this would call your backend
      if (email && password) {
        const mockUser: User = {
          uid: 'demo-user-' + Date.now(),
          email: email,
          displayName: email.split('@')[0]
        }
        
        setUser(mockUser)
        setIsLoggedIn(true)
        toast.success('Login realizado com sucesso!')
        return { user: mockUser }
      } else {
        throw new Error('Email e password são obrigatórios')
      }
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
      
      // Simulate Google authentication
      const mockUser: User = {
        uid: 'google-user-' + Date.now(),
        email: 'demo@gmail.com',
        displayName: 'Demo User'
      }
      
      setUser(mockUser)
      setIsLoggedIn(true)
      toast.success('Login com Google realizado com sucesso!')
      return { user: mockUser }
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
      
      // Simulate registration
      if (email && password) {
        const mockUser: User = {
          uid: 'new-user-' + Date.now(),
          email: email,
          displayName: email.split('@')[0]
        }
        
        setUser(mockUser)
        setIsLoggedIn(true)
        toast.success('Conta criada com sucesso!')
        return { user: mockUser }
      } else {
        throw new Error('Email e password são obrigatórios')
      }
    } catch (error: any) {
      toast.error('Erro ao criar conta: ' + error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      setUser(null)
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