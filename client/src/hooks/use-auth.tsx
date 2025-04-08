import { useEffect, useState } from 'react';
import { auth, db, googleProvider } from '@/lib/firebase';
import { 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { ChatMessage } from '@/lib/types';

export function useAuth() {
  const [user, setUser] = useState(null);
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
      throw error;
    }
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
      const chatRef = collection(db, 'chats');
      const q = query(
        chatRef,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const messages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      setChatHistory(messages);
    } catch (error) {
      console.error("Error loading chat history:", error);
    }
  };

  return {
    user,
    loading,
    signInWithGoogle,
    signOut,
    chatHistory
  };
}