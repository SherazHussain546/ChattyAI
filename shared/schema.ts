import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  voiceEnabled: integer("voice_enabled").notNull().default(1),
  avatarEnabled: integer("avatar_enabled").notNull().default(1),
});

export const insertMessageSchema = createInsertSchema(chatMessages).pick({
  content: true,
  role: true,
});

export const insertPreferencesSchema = createInsertSchema(userPreferences).pick({
  voiceEnabled: true,
  avatarEnabled: true,
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertMessageSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertPreferencesSchema>;
