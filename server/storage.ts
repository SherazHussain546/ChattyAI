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

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Chat methods
  getMessages(userId: string): Promise<ChatMessage[]>;
  addMessage(message: InsertChatMessage & { userId: string }): Promise<ChatMessage>;

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

  async getMessages(userId: string): Promise<ChatMessage[]> {
    try {
      const messagesRef = collection(db, MESSAGES_COLLECTION);
      const q = query(
        messagesRef,
        where("userId", "==", userId),
        orderBy("timestamp")
      );
      
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

  async addMessage(message: InsertChatMessage & { userId: string }): Promise<ChatMessage> {
    try {
      const messagesRef = collection(db, MESSAGES_COLLECTION);
      
      const messageData = {
        ...message,
        timestamp: Timestamp.now()
      };
      
      const messageDoc = await addDoc(messagesRef, messageData);
      
      return {
        ...messageData,
        id: messageDoc.id,
        timestamp: messageData.timestamp.toDate()
      } as ChatMessage;
    } catch (error) {
      console.error("Error adding message:", error);
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