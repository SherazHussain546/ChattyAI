import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema, insertPreferencesSchema } from "@shared/schema";
import { getChatResponse } from "@/lib/openai";
import { setupAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes and middleware
  setupAuth(app);

  // Get chat history
  app.get("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const messages = await storage.getMessages(req.user.id);
    res.json(messages);
  });

  // Add new message and get AI response
  app.post("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const messageData = insertMessageSchema.parse(req.body);

    // Store user message
    const userMessage = await storage.addMessage({
      content: messageData.content,
      role: "user",
      userId: req.user.id
    });

    try {
      // Get AI response using our centralized OpenAI handler
      const aiResponse = await getChatResponse(messageData.content);

      // Store AI response
      const aiMessage = await storage.addMessage({
        content: aiResponse,
        role: "assistant",
        userId: req.user.id
      });

      res.json({ userMessage, aiMessage });
    } catch (error) {
      console.error('Error getting AI response:', error);
      res.status(500).json({ message: 'Failed to get AI response' });
    }
  });

  // Get user preferences
  app.get("/api/preferences", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const prefs = await storage.getPreferences(req.user.id);
    res.json(prefs);
  });

  // Update user preferences
  app.patch("/api/preferences", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const prefsData = insertPreferencesSchema.parse(req.body);
    const updatedPrefs = await storage.updatePreferences(req.user.id, prefsData);
    res.json(updatedPrefs);
  });

  const httpServer = createServer(app);
  return httpServer;
}