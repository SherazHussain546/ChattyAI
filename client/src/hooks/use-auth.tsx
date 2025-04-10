import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { auth, db, googleProvider } from '@/lib/firebase';
import { 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { ChatMessage } from '@/lib/types';

type AuthContextType = {
  user: any;
  loading: boolean;
  signInWithGoogle: () => Promise<any>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  chatHistory: ChatMessage[];
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        // If we have a Firebase user, verify with our server
        if (firebaseUser) {
          console.log("Firebase auth state changed: User logged in", firebaseUser.displayName);
          
          try {
            // Get the ID token from Firebase
            const idToken = await firebaseUser.getIdToken();
            
            // Call our server to validate the token and get the user data
            const response = await fetch('/api/firebase-auth', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ idToken })
            });
            
            if (response.ok) {
              // Get the server-authenticated user
              const userData = await response.json();
              console.log("Server authentication successful on auth state change:", userData);
              
              // Set the user with both server and Firebase data
              setUser({
                ...userData,
                firebaseUser // Keep the Firebase user object for Firebase operations
              });
              
              // Load chat history
              loadChatHistory(userData.id);
            } else {
              console.error("Failed to authenticate with server on auth state change");
              setUser(null);
              setChatHistory([]);
            }
          } catch (error) {
            console.error("Error authenticating with server:", error);
            // Just set the Firebase user as a fallback
            setUser(firebaseUser);
          }
        } else {
          // Firebase user is logged out
          console.log("Firebase auth state changed: User logged out");
          setUser(null);
          setChatHistory([]);
        }
      } finally {
        // Always set loading to false when done
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      // Proceed with Firebase Google sign-in
      console.log("Attempting Google Sign-In...");
      
      // Add additional scopes if needed
      googleProvider.addScope('profile');
      googleProvider.addScope('email');
      
      // Use signInWithPopup for better user experience
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Firebase Google Sign-In successful:", result.user.displayName);
      
      // Get the ID token from Firebase
      const idToken = await result.user.getIdToken();
      
      // Call our backend API to authenticate with the Firebase token
      const response = await fetch('/api/firebase-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ idToken })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to authenticate with server');
      }
      
      // Get the user data from the response
      const userData = await response.json();
      console.log("Server authentication successful:", userData);
      
      // Update user state with the server-authenticated user
      setUser({
        ...userData,
        firebaseUser: result.user // Keep the Firebase user object for Firebase operations
      });
      
      // Load chat history for the signed-in user
      await loadChatHistory(userData.id);
      
      return userData;
    } catch (error) {
      console.error("Error signing in with Google:", error);
      
      // Check if it's an unauthorized domain error
      // @ts-ignore - Firebase error type with code property
      if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/unauthorized-domain') {
        // Fallback to guest login when domain is not authorized
        console.warn("Firebase domain not authorized. Showing domain instructions.");
        
        // Show a helpful error message specific to the current domain
        const currentDomain = window.location.hostname;
        
        // Create a more specific error message with domain information
        let errorMessage = `Domain "${currentDomain}" is not authorized in Firebase.`;
        
        // Specific instructions for luxethread.ie
        if (currentDomain.includes('luxethread.ie')) {
          errorMessage = 
            `Firebase Authentication Error: Domain "${currentDomain}" is not authorized in your Firebase project.\n\n` +
            `Please add these domains to your Firebase project:\n` +
            `- ${currentDomain}\n` +
            `- www.luxethread.ie\n\n` +
            `Steps:\n` +
            `1. Go to Firebase Console > Authentication > Settings\n` +
            `2. Add the domains under "Authorized domains"\n\n` +
            `Please try again after adding these domains.`;
        } else {
          // General message for other domains (Replit, local, etc.)
          errorMessage = 
            `Firebase Authentication Error: Domain "${currentDomain}" is not authorized.\n\n` +
            `Please add this domain to your Firebase project's authorized domains list:\n` +
            `- ${currentDomain}\n\n` +
            `Click the "Domain Setup Help" button on the login page for detailed instructions.`;
        }
        
        // Throw a new error with the detailed message
        throw new Error(errorMessage);
      } else {
        // For other errors, re-throw with a more user-friendly message
        const errorMessage = error instanceof Error ? error.message : 'Unknown authentication error occurred';
        throw new Error(`Google Sign-In failed: ${errorMessage}`);
      }
    }
  };

  const signInAsGuest = async () => {
    try {
      console.log("Attempting guest sign-in...");
      
      // Call our backend API for guest login
      const response = await fetch('/api/guest-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sign in as guest');
      }
      
      // Get the user data from the response
      const guestUser = await response.json();
      console.log("Guest sign-in successful:", guestUser);
      
      // Update user state
      setUser(guestUser);
      setChatHistory([]);
      
      return guestUser;
    } catch (error) {
      console.error("Error signing in as guest:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log("Signing out...");
      
      // Call our backend API for logout
      const response = await fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.warn("Server logout may have failed:", response.statusText);
      } else {
        console.log("Server logout successful");
      }
      
      // Clear user data
      setUser(null);
      setChatHistory([]);
      
      // Also sign out from Firebase if needed
      if (auth.currentUser) {
        await firebaseSignOut(auth);
        console.log("Firebase sign-out successful");
      }
      
      console.log("User completely signed out");
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  const loadChatHistory = async (userId: string) => {
    try {
      // Detect if we're on a custom domain like luxethread.ie
      const isCustomDomain = window.location.hostname.includes('luxethread.ie');
      
      // Determine the base URL for API requests
      const apiBasePath = isCustomDomain 
        ? import.meta.env.VITE_API_BASE_URL || '' // Use env variable if available
        : ''; // Use relative path for local/Replit deployment

      // Build the full URL for messages API
      const url = `${apiBasePath}/api/messages`;
      
      console.log(`Loading chat history from: ${url}`);
      
      // For now, use our local in-memory API instead of Firestore
      // to avoid permission issues
      const response = await fetch(url);
      if (response.ok) {
        const messages = await response.json();
        setChatHistory(messages);
      } else {
        console.error("Error loading chat history:", response.statusText);
        setChatHistory([]);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
      setChatHistory([]);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInAsGuest,
        signOut,
        chatHistory
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}