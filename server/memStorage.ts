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
import { IStorage, ChatSession } from "./storage";

const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  sessionStore: session.Store;
  private users: Map<string, User> = new Map();
  private usernameIndex: Map<string, string> = new Map();
  private messages: Map<string, ChatMessage[]> = new Map();
  private preferences: Map<string, UserPreferences> = new Map();
  private chatSessions: Map<string, ChatSession[]> = new Map(); // userId -> sessions
  private activeChatSessions: Map<string, string> = new Map(); // userId -> sessionId
  private messagesByChat: Map<string, ChatMessage[]> = new Map(); // chatId -> messages
  private messageIdCounter: number = 1;
  private userIdCounter: number = 1;
  private sessionIdCounter: number = 1;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Add a test user
    const testUser: User = {
      id: "test-user-123",
      username: "testuser",
      password: "password",
      createdAt: new Date()
    };
    this.users.set(testUser.id, testUser);
    this.usernameIndex.set(testUser.username, testUser.id);
    
    // Add default preferences
    this.preferences.set(testUser.id, {
      id: testUser.id,
      userId: testUser.id,
      voiceEnabled: 1,
      avatarEnabled: 1
    });
  }
  
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const userId = this.usernameIndex.get(username);
    if (userId) {
      return this.users.get(userId);
    }
    return undefined;
  }

  // Map to store Firebase UID to user ID mappings
  private firebaseUidIndex: Map<string, string> = new Map();

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const userId = this.firebaseUidIndex.get(firebaseUid);
    if (userId) {
      return this.users.get(userId);
    }
    return undefined;
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = String(this.userIdCounter++);
    const now = new Date();
    const user: User = {
      ...insertUser,
      id,
      createdAt: now
    };
    
    this.users.set(id, user);
    this.usernameIndex.set(user.username, id);
    
    // Store Firebase UID mapping if available
    if (user.firebaseUid) {
      this.firebaseUidIndex.set(user.firebaseUid, id);
    }
    
    // Create default preferences
    this.preferences.set(id, {
      id,
      userId: id,
      voiceEnabled: 1,
      avatarEnabled: 1
    });
    
    return user;
  }
  
  async getMessages(userId: string, chatId?: string): Promise<ChatMessage[]> {
    if (chatId) {
      // If chat ID is provided, return messages for that chat
      return this.messagesByChat.get(chatId) || [];
    } else {
      // If no chat ID, try to get active chat ID first
      const activeSessionId = await this.getActiveChatSessionId(userId);
      if (activeSessionId) {
        // Return messages for active chat
        return this.messagesByChat.get(activeSessionId) || [];
      } else {
        // Fallback to all user messages (old storage method)
        return this.messages.get(userId) || [];
      }
    }
  }
  
  async addMessage(message: InsertChatMessage & { userId: string, chatId?: string }): Promise<ChatMessage> {
    const id = String(this.messageIdCounter++);
    const now = new Date();
    
    // If no chatId provided, get active chat session or create a new one
    if (!message.chatId) {
      const activeSessionId = await this.getActiveChatSessionId(message.userId);
      
      if (!activeSessionId) {
        // Create a new session if none exists
        const newSession = await this.createChatSession(message.userId);
        message.chatId = newSession.id;
      } else {
        message.chatId = activeSessionId;
      }
    }
    
    const newMessage: ChatMessage = {
      ...message,
      id,
      timestamp: now
    };
    
    // Initialize messages array for user (legacy storage) if it doesn't exist
    if (!this.messages.has(message.userId)) {
      this.messages.set(message.userId, []);
    }
    
    // Add to legacy storage
    this.messages.get(message.userId)!.push(newMessage);
    
    // Add to chat-based storage if we have a chat ID
    if (message.chatId) {
      if (!this.messagesByChat.has(message.chatId)) {
        this.messagesByChat.set(message.chatId, []);
      }
      this.messagesByChat.get(message.chatId)!.push(newMessage);
      
      // Update chat session with last message and message count
      await this.updateChatSession(message.chatId, {
        lastMessage: message.content.substring(0, 100),
        updatedAt: now,
        messageCount: this.messagesByChat.get(message.chatId)!.length
      });
    }
    
    console.log(`Message saved in memory: ${newMessage.content.substring(0, 30)}...`);
    
    return newMessage;
  }
  
  // Chat session methods
  async getChatSessions(userId: string): Promise<ChatSession[]> {
    // Get user's chat sessions or create an empty array
    if (!this.chatSessions.has(userId)) {
      // Create a default session
      const newSession = await this.createChatSession(userId);
      return [newSession];
    }
    
    // Return sessions sorted by updated date (newest first)
    return [...this.chatSessions.get(userId)!].sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }
  
  async createChatSession(userId: string, title: string = "New Chat"): Promise<ChatSession> {
    const sessionId = `session_${this.sessionIdCounter++}`;
    const now = new Date();
    
    // Create new session
    const newSession: ChatSession = {
      id: sessionId,
      title,
      userId,
      createdAt: now,
      updatedAt: now,
      messageCount: 0
    };
    
    // Initialize sessions array for user if it doesn't exist
    if (!this.chatSessions.has(userId)) {
      this.chatSessions.set(userId, []);
    }
    
    // Add session to user's sessions
    this.chatSessions.get(userId)!.push(newSession);
    
    // Set as active session
    await this.setActiveChatSessionId(userId, sessionId);
    
    return newSession;
  }
  
  async updateChatSession(sessionId: string, data: Partial<ChatSession>): Promise<ChatSession> {
    // Find the session in all user sessions
    const entries = Array.from(this.chatSessions.entries());
    for (const [userId, sessions] of entries) {
      const sessionIndex = sessions.findIndex((s: ChatSession) => s.id === sessionId);
      
      if (sessionIndex >= 0) {
        // Update the session
        const session = sessions[sessionIndex];
        const updatedSession: ChatSession = {
          ...session,
          ...data
        };
        
        // Replace in the array
        sessions[sessionIndex] = updatedSession;
        
        return updatedSession;
      }
    }
    
    throw new Error(`Chat session ${sessionId} not found`);
  }
  
  async deleteChatSession(sessionId: string): Promise<boolean> {
    // Find the session in all user sessions
    const entries = Array.from(this.chatSessions.entries());
    for (const [userId, sessions] of entries) {
      const sessionIndex = sessions.findIndex((s: ChatSession) => s.id === sessionId);
      
      if (sessionIndex >= 0) {
        // Remove the session
        sessions.splice(sessionIndex, 1);
        
        // If this was the active session, set another as active
        const activeSessionId = await this.getActiveChatSessionId(userId);
        if (activeSessionId === sessionId) {
          if (sessions.length > 0) {
            await this.setActiveChatSessionId(userId, sessions[0].id);
          } else {
            // Create a new session if no others exist
            const newSession = await this.createChatSession(userId);
            await this.setActiveChatSessionId(userId, newSession.id);
          }
        }
        
        return true;
      }
    }
    
    return false; // Session not found
  }
  
  async setChatSessionTitle(sessionId: string, title: string): Promise<ChatSession> {
    return this.updateChatSession(sessionId, { title });
  }
  
  async getActiveChatSessionId(userId: string): Promise<string | null> {
    // Check if we have an active session for this user
    const sessionId = this.activeChatSessions.get(userId);
    
    if (sessionId) {
      return sessionId;
    }
    
    // If not, check if the user has any sessions
    if (this.chatSessions.has(userId) && this.chatSessions.get(userId)!.length > 0) {
      // Set the first session as active
      const firstSessionId = this.chatSessions.get(userId)![0].id;
      await this.setActiveChatSessionId(userId, firstSessionId);
      return firstSessionId;
    }
    
    // If no sessions, create a new one
    const newSession = await this.createChatSession(userId);
    return newSession.id;
  }
  
  async setActiveChatSessionId(userId: string, sessionId: string): Promise<void> {
    this.activeChatSessions.set(userId, sessionId);
    
    // Also update preferences to store the active session
    const prefs = await this.getPreferences(userId);
    await this.updatePreferences(userId, {
      ...prefs,
      activeChatSessionId: sessionId
    });
  }
  
  async getPreferences(userId: string): Promise<UserPreferences> {
    const prefs = this.preferences.get(userId);
    if (prefs) return prefs;
    
    // Create default preferences if they don't exist
    const defaultPrefs: UserPreferences = {
      id: userId,
      userId,
      voiceEnabled: 1,
      avatarEnabled: 1
    };
    
    this.preferences.set(userId, defaultPrefs);
    return defaultPrefs;
  }
  
  async updatePreferences(userId: string, prefs: InsertUserPreferences): Promise<UserPreferences> {
    const existing = await this.getPreferences(userId);
    const updated: UserPreferences = {
      ...existing,
      ...prefs
    };
    
    this.preferences.set(userId, updated);
    return updated;
  }
}