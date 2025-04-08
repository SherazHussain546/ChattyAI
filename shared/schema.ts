import { z } from "zod";

// Schemas
export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  password: z.string(),
  createdAt: z.date(),
});

export const chatMessageSchema = z.object({
  id: z.string(),
  content: z.string(),
  role: z.enum(["user", "assistant"]),
  userId: z.string(),
  timestamp: z.date(),
});

export const userPreferencesSchema = z.object({
  id: z.string(),
  userId: z.string(),
  voiceEnabled: z.number().default(1),
  avatarEnabled: z.number().default(1),
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