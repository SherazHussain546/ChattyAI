import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema, insertPreferencesSchema } from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function registerRoutes(app: Express): Promise<Server> {
  // Get chat history
  app.get("/api/messages", async (req, res) => {
    const messages = await storage.getMessages();
    res.json(messages);
  });

  // Add new message and get AI response
  app.post("/api/messages", async (req, res) => {
    const messageData = insertMessageSchema.parse(req.body);
    
    // Store user message
    const userMessage = await storage.addMessage({
      content: messageData.content,
      role: "user"
    });

    // Get AI response
    const completion = await openai.chat.completions.create({
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      model: "gpt-4o",
      messages: [{ role: "user", content: messageData.content }],
    });

    // Store AI response
    const aiMessage = await storage.addMessage({
      content: completion.choices[0].message.content || "I'm not sure how to respond to that.",
      role: "assistant"
    });

    res.json({ userMessage, aiMessage });
  });

  // Get user preferences
  app.get("/api/preferences", async (req, res) => {
    const prefs = await storage.getPreferences();
    res.json(prefs);
  });

  // Update user preferences
  app.patch("/api/preferences", async (req, res) => {
    const prefsData = insertPreferencesSchema.parse(req.body);
    const updatedPrefs = await storage.updatePreferences(prefsData);
    res.json(updatedPrefs);
  });

  const httpServer = createServer(app);
  return httpServer;
}
