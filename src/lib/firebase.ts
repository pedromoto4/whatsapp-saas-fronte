import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut } from 'firebase/auth'

// Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyAg68Lyt3zvJPGb-o_LLreVXkTlRso2I3Q",
  authDomain: "whatsapp-saas-d7e5c.firebaseapp.com", 
  projectId: "whatsapp-saas-d7e5c",
  storageBucket: "whatsapp-saas-d7e5c.firebasestorage.app",
  messagingSenderId: "614740365885",
  appId: "1:614740365885:web:c56a9bb3f490b1ec3f9054",
  measurementId: "G-GZ3SMXRQ61"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Auth
export const auth = getAuth(app)

// Set the redirect URL to the current origin (localhost in dev, production domain in prod)
if (typeof window !== 'undefined') {
  auth.languageCode = 'pt'
  // Configure auth domain for redirect
  const currentOrigin = window.location.origin
  console.log('Current origin:', currentOrigin)
}

// Google Auth Provider - Configure to use popup with fallback
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({
  prompt: 'select_account'
})

// Add redirect URI to the provider
if (typeof window !== 'undefined') {
  // This ensures redirect goes back to our app
  const redirectUrl = window.location.origin
  console.log('Redirect URL:', redirectUrl)
}

// Helper function to try popup first, fallback to redirect
const signInWithGoogleHelper = async () => {
  try {
    // Try popup first (better UX)
    return await signInWithPopup(auth, googleProvider)
  } catch (error: any) {
    // If popup is blocked, use redirect
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
      console.log('Popup bloqueado, usando redirect...')
      // Store redirect info for Cursor browser compatibility
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_redirect_origin', window.location.origin)
        localStorage.setItem('auth_redirect_path', window.location.pathname)
      }
      await signInWithRedirect(auth, googleProvider)
      // Note: With redirect, the result will be handled by getRedirectResult
      throw new Error('REDIRECT_INITIATED')
    }
    throw error
  }
}

// Check for redirect result on page load
export const checkRedirectResult = async () => {
  try {
    console.log('Checking redirect result...')
    const result = await getRedirectResult(auth)
    if (result) {
      console.log('Redirect result found:', {
        user: result.user?.email,
        providerId: result.providerId
      })
      return result
    } else {
      console.log('No redirect result found')
    }
  } catch (error: any) {
    console.error('Redirect result error:', error)
    // If error is about no redirect, that's ok
    if (error.code !== 'auth/no-auth-event') {
      throw error
    }
  }
  return null
}

// Auth functions
export const firebaseAuth = {
  signInWithEmail: signInWithEmailAndPassword,
  createUser: createUserWithEmailAndPassword,
  signInWithGoogle: signInWithGoogleHelper,
  signInWithGoogleRedirect: () => signInWithRedirect(auth, googleProvider),
  signOut: () => signOut(auth)
}