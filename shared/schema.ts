import { z } from "zod";

// Schemas
export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  password: z.string().optional(),  // Optional for Firebase auth users
  email: z.string().email().optional(), // Added for Firebase auth
  displayName: z.string().optional(), // Added for Firebase auth
  photoURL: z.string().optional(), // Added for Firebase auth
  firebaseUid: z.string().optional(), // Used to link to Firebase auth
  isAnonymous: z.boolean().optional(), // For guest users
  createdAt: z.date(),
});

export const chatMessageSchema = z.object({
  id: z.string(),
  content: z.string(),
  role: z.enum(["user", "assistant"]),
  userId: z.string(),
  chatId: z.string().optional(),
  timestamp: z.string().or(z.date()),
  has_image: z.boolean().optional(),
});

export const userPreferencesSchema = z.object({
  id: z.string(),
  userId: z.string(),
  voiceEnabled: z.number().default(1),
  avatarEnabled: z.number().default(1),
  activeChatSessionId: z.string().optional(),
});

// Insert Schemas
export const insertUserSchema = userSchema.omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = chatMessageSchema.omit({
  id: true,
  userId: true,
  timestamp: true,
});

export const insertPreferencesSchema = userPreferencesSchema.omit({
  id: true,
  userId: true,
});

// Types
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type InsertChatMessage = z.infer<typeof insertMessageSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type InsertUserPreferences = z.infer<typeof insertPreferencesSchema>;