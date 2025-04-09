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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      if (user) {
        loadChatHistory(user.uid);
      } else {
        setChatHistory([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      // Proceed directly with Google sign-in - no confirmation needed
      console.log("Attempting Google Sign-In...");
      
      // Add additional scopes if needed
      googleProvider.addScope('profile');
      googleProvider.addScope('email');
      
      // Use signInWithPopup for better user experience
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Google Sign-In successful:", result.user.displayName);
      
      // Load chat history for the signed-in user
      await loadChatHistory(result.user.uid);
      return result.user;
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
    // Create a temporary user ID for guest access
    const guestUser = {
      uid: `guest_${Date.now()}`,
      displayName: "Guest User",
      isAnonymous: true
    };
    setUser(guestUser);
    setChatHistory([]);
  };

  const signOut = async () => {
    try {
      // Clear user data first
      setUser(null);
      setChatHistory([]);
      
      // Then sign out of Firebase if needed
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }
      
      console.log("User signed out successfully");
      // Don't navigate here - navigation should be handled by the component that calls signOut
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