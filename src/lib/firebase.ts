import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth'

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

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider()

// Auth functions
export const firebaseAuth = {
  signInWithEmail: signInWithEmailAndPassword,
  createUser: createUserWithEmailAndPassword,
  signInWithGoogle: () => signInWithPopup(auth, googleProvider),
  signOut: () => signOut(auth)
}