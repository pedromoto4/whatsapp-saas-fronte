import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { firebaseAuth, auth, checkRedirectResult } from '@/lib/firebase'
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
  
  // Clean up test tokens on mount (one-time cleanup)
  useEffect(() => {
    const token = localStorage.getItem('firebase_token')
    if (token && token.startsWith('test_token_')) {
      // Remove test token and related data
      localStorage.removeItem('firebase_token')
      localStorage.removeItem('auth-user')
      localStorage.removeItem('auth-is-logged-in')
      console.log('🧹 Test tokens cleaned up')
    }
  }, [])
  
  // Check for redirect result on mount
  useEffect(() => {
    
    // Check if we're on Firebase domain (Cursor browser issue)
    if (typeof window !== 'undefined' && window.location.hostname.includes('firebaseapp.com')) {
      const redirectOrigin = localStorage.getItem('auth_redirect_origin') || 'http://localhost:5173'
      let redirectPath = localStorage.getItem('auth_redirect_path') || '/login'
      const currentParams = window.location.search
      
      // Clean path (remove index.html if present)
      redirectPath = redirectPath.replace('/index.html', '').replace('index.html', '')
      if (!redirectPath.startsWith('/')) redirectPath = '/' + redirectPath
      
      // Use hash routing format
      const hashPath = redirectPath === '/' ? '' : '#' + redirectPath
      
      console.log('Detected Firebase domain, redirecting to:', redirectOrigin + hashPath + currentParams)
      
      // Redirect back to our app with auth params
      window.location.href = redirectOrigin + hashPath + currentParams
      return
    }
    
    // Clean URL if it has index.html in it
    if (typeof window !== 'undefined' && window.location.pathname.includes('index.html')) {
      const cleanPath = window.location.pathname.replace('/index.html', '').replace('index.html', '') || '/'
      const search = window.location.search
      const hash = window.location.hash || '#/login'
      // Preserve hash routing and params
      window.history.replaceState({}, document.title, cleanPath + search + hash)
    }
    
    // Check if we're coming back from a redirect
    const urlParams = new URLSearchParams(window.location.search)
    const hasAuthParams = urlParams.has('code') || urlParams.has('state')
    
    if (hasAuthParams) {
      // We're on the redirect callback page - process the auth result
      console.log('🔐 Processing redirect result with params:', {
        code: urlParams.has('code'),
        state: urlParams.has('state'),
        fullUrl: window.location.href,
        search: window.location.search,
        hash: window.location.hash
      })
      
      // Clear stored redirect info
      localStorage.removeItem('auth_redirect_origin')
      localStorage.removeItem('auth_redirect_path')
      
      // Try multiple times to get redirect result (Firebase sometimes needs time)
      let attempts = 0
      const maxAttempts = 5
      
      const tryGetRedirectResult = async () => {
        attempts++
        console.log(`🔄 Attempt ${attempts}/${maxAttempts} to get redirect result...`)
        
        try {
          const result = await checkRedirectResult()
          if (result?.user) {
            console.log('✅ Redirect auth successful:', result.user.email)
            toast.success('Login com Google realizado com sucesso!')
            // Clear URL params but keep hash routing
            const cleanPath = window.location.pathname.replace('/index.html', '') || '/'
            const hash = window.location.hash || '#/dashboard'
            window.history.replaceState({}, document.title, cleanPath + hash)
            return true
          } else if (attempts < maxAttempts) {
            // Try again after a delay
            console.log(`⏳ No result yet, retrying in ${attempts * 500}ms...`)
            setTimeout(tryGetRedirectResult, attempts * 500)
            return false
          } else {
            console.log('⚠️ No redirect result found after all attempts, auth state change will handle it')
            // Clear URL params but keep hash
            const cleanPath = window.location.pathname.replace('/index.html', '') || '/'
            const hash = window.location.hash || '#/login'
            window.history.replaceState({}, document.title, cleanPath + hash)
            // The onAuthStateChanged will handle the login if it succeeded
            return false
          }
        } catch (error: any) {
          console.error('❌ Redirect result error:', error)
          if (attempts < maxAttempts && error.code !== 'auth/no-auth-event') {
            // Retry if it's not a "no auth event" error
            setTimeout(tryGetRedirectResult, attempts * 500)
            return false
          } else {
            // Clear URL params even on error, but keep hash
            const cleanPath = window.location.pathname.replace('/index.html', '') || '/'
            const hash = window.location.hash || '#/login'
            window.history.replaceState({}, document.title, cleanPath + hash)
            return false
          }
        }
      }
      
      // Start trying after initial delay
      setTimeout(() => {
        tryGetRedirectResult()
      }, 500)
    } else {
      // Normal page load, just check for existing auth
      checkRedirectResult().then((result) => {
        if (result?.user) {
          toast.success('Login com Google realizado com sucesso!')
        }
      })
    }
  }, [])

  // Listen to Firebase auth state changes
  useEffect(() => {
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          console.log('✅ Auth state changed - User logged in:', firebaseUser.email)
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
          
          // If we just came from a redirect, show success message
          const urlParams = new URLSearchParams(window.location.search)
          if (urlParams.has('code') || urlParams.has('state')) {
            toast.success('Login com Google realizado com sucesso!')
            // Clear URL params
            const cleanPath = window.location.pathname.replace('/index.html', '') || '/'
            const hash = window.location.hash || '#/dashboard'
            window.history.replaceState({}, document.title, cleanPath + hash)
          }
        } else {
          console.log('ℹ️ Auth state changed - User logged out')
          setUser(null)
          setIsLoggedIn(false)
          localStorage.removeItem('firebase_token')
        }
      } catch (error) {
        console.error('❌ Auth state change error:', error)
        setUser(null)
        setIsLoggedIn(false)
        localStorage.removeItem('firebase_token')
      } finally {
        setLoading(false) // Always set loading to false after auth check
      }
    })

    return () => unsubscribe()
  }, []) // Remove dependencies to prevent infinite loop

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
      // If redirect was initiated, don't show error
      if (error.message === 'REDIRECT_INITIATED') {
        toast.info('Redirecionando para Google...')
        return
      }
      
      // If popup was blocked, offer redirect option
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
        // Store current URL to redirect back after auth
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_redirect_uri', window.location.origin + window.location.pathname)
        }
        toast.info('Popup bloqueado. Redirecionando para Google...')
        // Automatically try redirect
        await firebaseAuth.signInWithGoogleRedirect()
        return
      }
      
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