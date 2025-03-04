import { db } from "./db";
import { eq } from "drizzle-orm";
import {
  users,
  chatMessages,
  userPreferences,
  type User,
  type InsertUser,
  type ChatMessage,
  type InsertChatMessage,
  type UserPreferences,
  type InsertUserPreferences,
} from "@shared/schema";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Chat methods
  getMessages(userId: number): Promise<ChatMessage[]>;
  addMessage(message: InsertChatMessage & { userId: number }): Promise<ChatMessage>;

  // Preferences methods
  getPreferences(userId: number): Promise<UserPreferences>;
  updatePreferences(userId: number, prefs: InsertUserPreferences): Promise<UserPreferences>;

  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();

    // Create default preferences for the new user
    await db.insert(userPreferences).values({
      userId: user.id,
      voiceEnabled: 1,
      avatarEnabled: 1,
    });

    return user;
  }

  async getMessages(userId: number): Promise<ChatMessage[]> {
    return db.select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(chatMessages.timestamp);
  }

  async addMessage(message: InsertChatMessage & { userId: number }): Promise<ChatMessage> {
    const [newMessage] = await db.insert(chatMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  async getPreferences(userId: number): Promise<UserPreferences> {
    const [prefs] = await db.select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    return prefs;
  }

  async updatePreferences(userId: number, prefs: InsertUserPreferences): Promise<UserPreferences> {
    const [updated] = await db.update(userPreferences)
      .set(prefs)
      .where(eq(userPreferences.userId, userId))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();