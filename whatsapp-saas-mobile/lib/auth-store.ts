import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { User, AuthState } from '@/types';
import { getApiBaseUrl, API_ENDPOINTS } from './api-config';

// Import Firebase Auth with error handling
let auth: any;
try {
  auth = require('@react-native-firebase/auth').default;
} catch (error) {
  console.error('Firebase Auth import error:', error);
  // Fallback - will cause errors but won't crash the app
  auth = null;
}

// Configure Google Sign-In
const WEB_CLIENT_ID = '614740365885-urjunocpui7bhvh1h89gaemojape8eaa.apps.googleusercontent.com';

// Initialize Google Sign-In configuration
GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID,
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

interface AuthStore extends AuthState {
  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isLoggedIn: false,
      loading: true,
      token: null,

      // Setters
      setUser: (user) => set({ user, isLoggedIn: !!user }),
      setToken: (token) => set({ token }),
      setLoading: (loading) => set({ loading }),

      // Login with email/password using Firebase Auth
      login: async (email: string, password: string) => {
        set({ loading: true });
        try {
          if (!auth) {
            throw new Error('Firebase Auth não está disponível');
          }
          // Sign in with Firebase Auth
          const userCredential = await auth().signInWithEmailAndPassword(email, password);
          const firebaseUser = userCredential.user;
          
          // Get Firebase ID Token (same as web app)
          const firebaseToken = await firebaseUser.getIdToken();
          
          // Get user data
          const userData: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || email,
            displayName: firebaseUser.displayName || email.split('@')[0],
          };
          
          set({
            user: userData,
            token: firebaseToken,
            isLoggedIn: true,
            loading: false,
          });
        } catch (error: any) {
          set({ loading: false });
          
          // Handle Firebase Auth errors
          if (error.code === 'auth/user-not-found') {
            throw new Error('Utilizador não encontrado');
          } else if (error.code === 'auth/wrong-password') {
            throw new Error('Password incorreta');
          } else if (error.code === 'auth/invalid-email') {
            throw new Error('Email inválido');
          } else if (error.code === 'auth/too-many-requests') {
            throw new Error('Muitas tentativas. Tente mais tarde');
          } else {
            throw new Error(error.message || 'Erro no login');
          }
        }
      },

      // Login with Google using Firebase Auth
      loginWithGoogle: async () => {
        set({ loading: true });
        try {
          if (!auth) {
            throw new Error('Firebase Auth não está disponível');
          }
          // Check if device supports Google Play Services
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
          
          // Step 1: Sign in with Google Sign-In
          const googleResponse = await GoogleSignin.signIn();
          
          if (googleResponse.type === 'success' && googleResponse.data) {
            const { idToken } = googleResponse.data;
            
            // Step 2: Create Firebase credential from Google token
            const googleCredential = auth.GoogleAuthProvider.credential(idToken);
            
            // Step 3: Sign in to Firebase with Google credential
            const firebaseUserCredential = await auth().signInWithCredential(googleCredential);
            const firebaseUser = firebaseUserCredential.user;
            
            // Step 4: Get Firebase ID Token (same as web app uses)
            const firebaseToken = await firebaseUser.getIdToken();
            
            // Step 5: Get user data
            const userData: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            };
            
            set({
              user: userData,
              token: firebaseToken,
              isLoggedIn: true,
              loading: false,
            });
          } else {
            throw new Error('Login cancelado pelo utilizador');
          }
        } catch (error: any) {
          set({ loading: false });
          
          // Handle Google Sign-In errors
          if (error.code === statusCodes.SIGN_IN_CANCELLED) {
            throw new Error('Login cancelado');
          } else if (error.code === statusCodes.IN_PROGRESS) {
            throw new Error('Login já em progresso');
          } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
            throw new Error('Google Play Services não disponível');
          } else if (error.code?.startsWith('auth/')) {
            // Firebase Auth errors
            throw new Error(error.message || 'Erro na autenticação');
          } else {
            throw error;
          }
        }
      },

      // Logout
      logout: async () => {
        try {
          // Sign out from Firebase
          if (auth) {
            await auth().signOut();
          }
          
          // Sign out from Google
          const isSignedIn = await GoogleSignin.isSignedIn();
          if (isSignedIn) {
            await GoogleSignin.signOut();
          }
        } catch (error) {
          console.log('Logout error:', error);
        }
        
        set({
          user: null,
          token: null,
          isLoggedIn: false,
          loading: false,
        });
        await AsyncStorage.removeItem('auth-storage');
      },

      // Check if user is authenticated
      checkAuth: async () => {
        try {
          if (!auth) {
            // Firebase not available, check stored token
            const { token, user } = get();
            if (token && user) {
              set({ loading: false, isLoggedIn: true });
            } else {
              set({ loading: false, isLoggedIn: false });
            }
            return;
          }
          
          // Check Firebase Auth state
          const firebaseUser = auth().currentUser;
          
          if (firebaseUser) {
            // User is signed in with Firebase
            // Get fresh token
            const firebaseToken = await firebaseUser.getIdToken();
            
            const userData: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            };
            
            set({
              user: userData,
              token: firebaseToken,
              isLoggedIn: true,
              loading: false,
            });
          } else {
            // No Firebase user, check if we have stored token
            const { token, user } = get();
            
            if (token && user) {
              // We have stored data but no Firebase session
              // Try to verify with backend
              try {
                const baseUrl = getApiBaseUrl();
                const response = await fetch(`${baseUrl}${API_ENDPOINTS.ME}`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                });

                if (response.ok) {
                  // Token is still valid
                  set({ loading: false, isLoggedIn: true });
                } else {
                  // Token invalid, clear auth
                  set({
                    user: null,
                    token: null,
                    isLoggedIn: false,
                    loading: false,
                  });
                }
              } catch (error) {
                // Network error, keep stored session
                set({ loading: false, isLoggedIn: true });
              }
            } else {
              // No stored data, not logged in
              set({ loading: false, isLoggedIn: false });
            }
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          set({ loading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isLoggedIn: state.isLoggedIn,
      }),
    }
  )
);

// Listen to Firebase Auth state changes (only if auth is available)
if (auth) {
  try {
    auth().onAuthStateChanged((firebaseUser) => {
  if (firebaseUser) {
    // User signed in
    firebaseUser.getIdToken().then((token) => {
      useAuthStore.getState().setToken(token);
      useAuthStore.getState().setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      });
      useAuthStore.getState().setLoading(false);
    });
  } else {
    // User signed out
    useAuthStore.getState().setUser(null);
    useAuthStore.getState().setToken(null);
    useAuthStore.getState().setLoading(false);
  }
  });
  } catch (error) {
    console.error('Firebase auth state listener error:', error);
  }
}

// Helper hook to get auth token
export const getAuthToken = (): string | null => {
  return useAuthStore.getState().token;
};

// Helper function to make authenticated requests
export const authFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  let token = useAuthStore.getState().token;
  
  // If we have a Firebase user, get fresh token
  if (auth) {
    try {
      const firebaseUser = auth().currentUser;
      if (firebaseUser) {
        token = await firebaseUser.getIdToken();
        // Update store with fresh token
        useAuthStore.getState().setToken(token);
      }
    } catch (error) {
      console.error('Error getting Firebase token:', error);
    }
  }
  
  const baseUrl = getApiBaseUrl();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });
  
  // If unauthorized (401), token might be expired
  if (response.status === 401 && auth) {
    try {
      const firebaseUser = auth().currentUser;
      if (firebaseUser) {
        // Try to refresh token
        const newToken = await firebaseUser.getIdToken(true);
      useAuthStore.getState().setToken(newToken);
      
      // Retry request with new token
      headers['Authorization'] = `Bearer ${newToken}`;
      return fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers,
      });
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
  }
  
  return response;
};
