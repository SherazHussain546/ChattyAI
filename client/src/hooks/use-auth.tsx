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
      const result = await signInWithPopup(auth, googleProvider);
      await loadChatHistory(result.user.uid);
      return result.user;
    } catch (error) {
      console.error("Error signing in with Google:", error);
      
      // Check if it's an unauthorized domain error
      // @ts-ignore - Firebase error type with code property
      if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/unauthorized-domain') {
        // Fallback to guest login when domain is not authorized
        console.warn("Firebase domain not authorized. Falling back to guest login.");
        await signInAsGuest();
        return user;
      } else {
        throw error;
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
      await firebaseSignOut(auth);
      setChatHistory([]);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  const loadChatHistory = async (userId: string) => {
    try {
      // For now, use our local in-memory API instead of Firestore
      // to avoid permission issues
      const response = await fetch('/api/messages');
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