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
    
    // Create default preferences
    this.preferences.set(id, {
      id,
      userId: id,
      voiceEnabled: 1,
      avatarEnabled: 1
    });
    
    return user;
  }
  
  async getMessages(userId: string): Promise<ChatMessage[]> {
    return this.messages.get(userId) || [];
  }
  
  async addMessage(message: InsertChatMessage & { userId: string }): Promise<ChatMessage> {
    const id = String(this.messageIdCounter++);
    const now = new Date();
    
    const newMessage: ChatMessage = {
      ...message,
      id,
      timestamp: now
    };
    
    // Initialize messages array for user if it doesn't exist
    if (!this.messages.has(message.userId)) {
      this.messages.set(message.userId, []);
    }
    
    // Add message to the array
    this.messages.get(message.userId)!.push(newMessage);
    
    console.log(`Message saved in memory: ${newMessage.content.substring(0, 30)}...`);
    
    return newMessage;
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