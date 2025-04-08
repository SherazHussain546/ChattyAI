import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously, 
  signOut, 
  signInWithPopup, 
  GoogleAuthProvider,
  Auth,
  User as FirebaseUser 
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Type definition for Firebase User if not imported correctly
interface FirebaseUserType {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
}

// Type guard to check if auth is initialized
function isAuthInitialized(auth: Auth | undefined): auth is Auth {
  return !!auth;
}

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();

type AuthContextType = {
  currentUser: FirebaseUser | null;
  isLoading: boolean;
  error: Error | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Sign in with email and password
  const signInWithEmail = async (email: string, password: string) => {
    try {
      setError(null);
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        description: "Successfully signed in",
      });
    } catch (err) {
      setError(err as Error);
      toast({
        title: "Sign in failed",
        description: (err as Error).message,
        variant: "destructive",
      });
      throw err;
    }
  };

  // Sign up with email and password
  const signUpWithEmail = async (email: string, password: string) => {
    try {
      setError(null);
      await createUserWithEmailAndPassword(auth, email, password);
      toast({
        description: "Account created successfully",
      });
    } catch (err) {
      setError(err as Error);
      toast({
        title: "Sign up failed",
        description: (err as Error).message,
        variant: "destructive",
      });
      throw err;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setError(null);
      await signInWithPopup(auth, googleProvider);
      toast({
        description: "Signed in with Google",
      });
    } catch (err) {
      setError(err as Error);
      toast({
        title: "Google sign in failed",
        description: (err as Error).message,
        variant: "destructive",
      });
      throw err;
    }
  };

  // Sign in as guest (anonymously)
  const signInAsGuest = async () => {
    try {
      setError(null);
      await signInAnonymously(auth);
      toast({
        description: "Signed in as guest",
      });
    } catch (err) {
      setError(err as Error);
      toast({
        title: "Guest sign in failed",
        description: (err as Error).message,
        variant: "destructive",
      });
      throw err;
    }
  };

  // Sign out
  const logout = async () => {
    try {
      await signOut(auth);
      // Clear any user-related data from cache
      queryClient.clear();
      toast({
        description: "Successfully signed out",
      });
    } catch (err) {
      setError(err as Error);
      toast({
        title: "Sign out failed",
        description: (err as Error).message,
        variant: "destructive",
      });
      throw err;
    }
  };

  const value = {
    currentUser,
    isLoading,
    error,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInAsGuest,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
