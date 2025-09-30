import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
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

// Initialize Firebase Auth and get a reference to the service
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

export default app