// Import necessary types
import {
  type User,
  type InsertUser,
  type ChatMessage,
  type InsertChatMessage,
  type UserPreferences,
  type InsertUserPreferences,
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

// Import MemStorage first to avoid conflicts
import { MemStorage } from "./memStorage";

// Firebase imports
import { db } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  updateDoc,
  addDoc,
  Timestamp,
  DocumentData
} from "firebase/firestore";

const MemoryStore = createMemoryStore(session);

// Firebase collections
const USERS_COLLECTION = "users";
const MESSAGES_COLLECTION = "chat_messages";
const PREFERENCES_COLLECTION = "user_preferences";
const CHAT_SESSIONS_COLLECTION = "chat_sessions";

// Chat session interface for Firebase implementation
export interface ChatSession {
  id: string;
  title: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  lastMessage?: string;
}

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Chat methods
  getMessages(userId: string, chatId?: string): Promise<ChatMessage[]>;
  addMessage(message: InsertChatMessage & { userId: string, chatId?: string }): Promise<ChatMessage>;
  
  // Chat session methods
  getChatSessions(userId: string): Promise<ChatSession[]>;
  createChatSession(userId: string, title?: string): Promise<ChatSession>;
  updateChatSession(sessionId: string, data: Partial<ChatSession>): Promise<ChatSession>;
  deleteChatSession(sessionId: string): Promise<boolean>;
  setChatSessionTitle(sessionId: string, title: string): Promise<ChatSession>;
  getActiveChatSessionId(userId: string): Promise<string | null>;
  setActiveChatSessionId(userId: string, sessionId: string): Promise<void>;

  // Preferences methods
  getPreferences(userId: string): Promise<UserPreferences>;
  updatePreferences(userId: string, prefs: InsertUserPreferences): Promise<UserPreferences>;

  // Session store
  sessionStore: session.Store;
}

// MemStorage is now imported from memStorage.ts

// Firebase-based storage - uncomment when Firebase permissions are resolved
export class FirebaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    try {
      const userRef = doc(db, USERS_COLLECTION, id);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        return {
          ...userData,
          id: userSnap.id,
          createdAt: userData.createdAt?.toDate() || new Date()
        } as User;
      }
      return undefined;
    } catch (error) {
      console.error("Error getting user:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const usersRef = collection(db, USERS_COLLECTION);
      const q = query(usersRef, where("username", "==", username));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        return {
          ...userData,
          id: userDoc.id,
          createdAt: userData.createdAt?.toDate() || new Date()
        } as User;
      }
      return undefined;
    } catch (error) {
      console.error("Error getting user by username:", error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      // Create a new user document
      const userRef = collection(db, USERS_COLLECTION);
      const userData = {
        ...insertUser,
        createdAt: Timestamp.now()
      };
      
      const userDocRef = await addDoc(userRef, userData);
      const user = {
        ...userData,
        id: userDocRef.id,
        createdAt: userData.createdAt.toDate()
      } as User;
      
      // Create default preferences for the new user
      await setDoc(doc(db, PREFERENCES_COLLECTION, userDocRef.id), {
        userId: userDocRef.id,
        voiceEnabled: 1,
        avatarEnabled: 1
      });
      
      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async getMessages(userId: string, chatId?: string): Promise<ChatMessage[]> {
    try {
      const messagesRef = collection(db, MESSAGES_COLLECTION);
      
      // Create query
      let q;
      if (chatId) {
        // Get messages for a specific chat session
        q = query(
          messagesRef,
          where("userId", "==", userId),
          where("chatId", "==", chatId),
          orderBy("timestamp")
        );
      } else {
        // If no chat ID provided, try to get active chat ID first
        const activeSessionId = await this.getActiveChatSessionId(userId);
        
        if (activeSessionId) {
          // If we have an active session, get messages for that session
          q = query(
            messagesRef,
            where("userId", "==", userId),
            where("chatId", "==", activeSessionId),
            orderBy("timestamp")
          );
        } else {
          // Fallback to getting all user messages (should rarely happen)
          q = query(
            messagesRef,
            where("userId", "==", userId),
            orderBy("timestamp")
          );
        }
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          timestamp: data.timestamp?.toDate() || new Date()
        } as ChatMessage;
      });
    } catch (error) {
      console.error("Error getting messages:", error);
      return [];
    }
  }

  async addMessage(message: InsertChatMessage & { userId: string, chatId?: string }): Promise<ChatMessage> {
    try {
      // If no chatId provided, get active chat session
      if (!message.chatId) {
        const activeSessionId = await this.getActiveChatSessionId(message.userId);
        
        // If no active session, create a new one
        if (!activeSessionId) {
          const newSession = await this.createChatSession(message.userId);
          message.chatId = newSession.id;
        } else {
          message.chatId = activeSessionId;
        }
      }
      
      const messagesRef = collection(db, MESSAGES_COLLECTION);
      
      const messageData = {
        ...message,
        timestamp: Timestamp.now()
      };
      
      const messageDoc = await addDoc(messagesRef, messageData);
      const newMessage = {
        ...messageData,
        id: messageDoc.id,
        timestamp: messageData.timestamp.toDate()
      } as ChatMessage;
      
      // Update the chat session with the latest message info
      if (message.chatId) {
        await this.updateChatSession(message.chatId, {
          lastMessage: message.content.substring(0, 100),
          updatedAt: new Date(),
          messageCount: (await this.getMessages(message.userId, message.chatId)).length
        });
      }
      
      return newMessage;
    } catch (error) {
      console.error("Error adding message:", error);
      throw error;
    }
  }
  
  // Chat session methods
  async getChatSessions(userId: string): Promise<ChatSession[]> {
    try {
      const sessionsRef = collection(db, CHAT_SESSIONS_COLLECTION);
      const q = query(
        sessionsRef,
        where("userId", "==", userId),
        orderBy("updatedAt", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      const sessions = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as ChatSession;
      });
      
      // If no sessions, create a default one
      if (sessions.length === 0) {
        const newSession = await this.createChatSession(userId);
        return [newSession];
      }
      
      return sessions;
    } catch (error) {
      console.error("Error getting chat sessions:", error);
      // Create a default session on error
      try {
        const newSession = await this.createChatSession(userId);
        return [newSession];
      } catch (fallbackError) {
        console.error("Error creating fallback session:", fallbackError);
        return [];
      }
    }
  }
  
  async createChatSession(userId: string, title: string = "New Chat"): Promise<ChatSession> {
    try {
      const sessionsRef = collection(db, CHAT_SESSIONS_COLLECTION);
      
      const now = new Date();
      const sessionData = {
        userId,
        title,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
        messageCount: 0
      };
      
      const sessionDoc = await addDoc(sessionsRef, sessionData);
      
      const newSession = {
        ...sessionData,
        id: sessionDoc.id,
        createdAt: now,
        updatedAt: now
      } as ChatSession;
      
      // Set as active session
      await this.setActiveChatSessionId(userId, sessionDoc.id);
      
      return newSession;
    } catch (error) {
      console.error("Error creating chat session:", error);
      throw error;
    }
  }
  
  async updateChatSession(sessionId: string, data: Partial<ChatSession>): Promise<ChatSession> {
    try {
      const sessionRef = doc(db, CHAT_SESSIONS_COLLECTION, sessionId);
      
      // Convert dates to Firestore timestamps
      const updateData: any = { ...data };
      if (data.createdAt) {
        updateData.createdAt = Timestamp.fromDate(data.createdAt);
      }
      if (data.updatedAt) {
        updateData.updatedAt = Timestamp.fromDate(data.updatedAt);
      }
      
      await updateDoc(sessionRef, updateData);
      
      // Get updated session
      const sessionSnap = await getDoc(sessionRef);
      if (!sessionSnap.exists()) {
        throw new Error(`Chat session ${sessionId} not found`);
      }
      
      const sessionData = sessionSnap.data();
      return {
        ...sessionData,
        id: sessionId,
        createdAt: sessionData.createdAt?.toDate() || new Date(),
        updatedAt: sessionData.updatedAt?.toDate() || new Date()
      } as ChatSession;
    } catch (error) {
      console.error("Error updating chat session:", error);
      throw error;
    }
  }
  
  async deleteChatSession(sessionId: string): Promise<boolean> {
    try {
      // Get session info to check the user
      const sessionRef = doc(db, CHAT_SESSIONS_COLLECTION, sessionId);
      const sessionSnap = await getDoc(sessionRef);
      
      if (!sessionSnap.exists()) {
        throw new Error(`Chat session ${sessionId} not found`);
      }
      
      const sessionData = sessionSnap.data();
      const userId = sessionData.userId;
      
      // Delete the session document
      await updateDoc(sessionRef, { deleted: true });
      
      // Check if this was the active session
      const activeSessionId = await this.getActiveChatSessionId(userId);
      if (activeSessionId === sessionId) {
        // Get another session or create one
        const sessions = await this.getChatSessions(userId);
        const otherSession = sessions.find(s => s.id !== sessionId);
        
        if (otherSession) {
          await this.setActiveChatSessionId(userId, otherSession.id);
        } else {
          const newSession = await this.createChatSession(userId);
          await this.setActiveChatSessionId(userId, newSession.id);
        }
      }
      
      return true;
    } catch (error) {
      console.error("Error deleting chat session:", error);
      return false;
    }
  }
  
  async setChatSessionTitle(sessionId: string, title: string): Promise<ChatSession> {
    return this.updateChatSession(sessionId, { title });
  }
  
  async getActiveChatSessionId(userId: string): Promise<string | null> {
    try {
      const userPrefsRef = doc(db, PREFERENCES_COLLECTION, userId);
      const prefsSnap = await getDoc(userPrefsRef);
      
      if (prefsSnap.exists()) {
        const prefsData = prefsSnap.data();
        return prefsData.activeChatSessionId || null;
      }
      
      // If no preferences, create a new chat session and set it as active
      const newSession = await this.createChatSession(userId);
      await this.setActiveChatSessionId(userId, newSession.id);
      return newSession.id;
    } catch (error) {
      console.error("Error getting active chat session ID:", error);
      return null;
    }
  }
  
  async setActiveChatSessionId(userId: string, sessionId: string): Promise<void> {
    try {
      const userPrefsRef = doc(db, PREFERENCES_COLLECTION, userId);
      const prefsSnap = await getDoc(userPrefsRef);
      
      if (prefsSnap.exists()) {
        // Update existing preferences
        await updateDoc(userPrefsRef, { activeChatSessionId: sessionId });
      } else {
        // Create new preferences with active session
        await setDoc(userPrefsRef, {
          userId,
          activeChatSessionId: sessionId,
          voiceEnabled: 1,
          avatarEnabled: 1
        });
      }
    } catch (error) {
      console.error("Error setting active chat session ID:", error);
      throw error;
    }
  }

  async getPreferences(userId: string): Promise<UserPreferences> {
    try {
      const prefsRef = doc(db, PREFERENCES_COLLECTION, userId);
      const prefsSnap = await getDoc(prefsRef);
      
      if (prefsSnap.exists()) {
        const prefsData = prefsSnap.data();
        return {
          ...prefsData,
          id: prefsSnap.id
        } as UserPreferences;
      }
      
      // If preferences don't exist, create default preferences
      const defaultPrefs: UserPreferences = {
        id: userId,
        userId: userId,
        voiceEnabled: 1,
        avatarEnabled: 1
      };
      
      await setDoc(prefsRef, {
        userId,
        voiceEnabled: 1,
        avatarEnabled: 1
      });
      
      return defaultPrefs;
    } catch (error) {
      console.error("Error getting preferences:", error);
      throw error;
    }
  }

  async updatePreferences(userId: string, prefs: InsertUserPreferences): Promise<UserPreferences> {
    try {
      const prefsRef = doc(db, PREFERENCES_COLLECTION, userId);
      await updateDoc(prefsRef, prefs as DocumentData);
      
      // Get the updated document
      const updatedSnap = await getDoc(prefsRef);
      const updatedData = updatedSnap.data();
      
      return {
        ...updatedData,
        id: userId
      } as UserPreferences;
    } catch (error) {
      console.error("Error updating preferences:", error);
      throw error;
    }
  }
}

// Use in-memory storage for testing until Firebase permissions are fixed
export const storage = new MemStorage();