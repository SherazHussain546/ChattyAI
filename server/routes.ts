import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema, insertPreferencesSchema } from "@shared/schema";
import { getChatResponse, getImageChatResponse } from "./gemini";
import { setupAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes and middleware
  setupAuth(app);

  // Get chat history
  app.get("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const messages = await storage.getMessages(req.user.id);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ message: 'Failed to fetch chat history' });
    }
  });

  // Add new message and get AI response
  app.post("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      // Extract the message content, whether it has an image, and the image data if present
      const { content, role, has_image, image_data } = req.body;
      
      // Validate the message data
      const messageData = insertMessageSchema.parse({ content, role });

      // Store user message
      const userMessage = await storage.addMessage({
        content: messageData.content,
        role: "user",
        userId: req.user.id,
        has_image: has_image || false
      });

      // Choose appropriate AI handler based on whether there's an image
      let aiResponse: string;
      
      if (has_image && image_data) {
        console.log("Processing image with Gemini Vision...");
        // Extract the base64 data from the data URI if needed
        const base64Data = image_data.includes('base64,') 
          ? image_data.split('base64,')[1] 
          : image_data;
          
        // Get AI response using Gemini Vision
        aiResponse = await getImageChatResponse(messageData.content, base64Data);
      } else {
        // Get AI response using standard Gemini text model
        aiResponse = await getChatResponse(messageData.content);
      }

      // Store AI response
      const aiMessage = await storage.addMessage({
        content: aiResponse,
        role: "assistant",
        userId: req.user.id,
        has_image: false
      });

      res.json({ userMessage, aiMessage });
    } catch (error) {
      console.error('Error processing message:', error);
      res.status(500).json({ message: 'Failed to process message' });
    }
  });

  // Get user preferences
  app.get("/api/preferences", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const prefs = await storage.getPreferences(req.user.id);
      res.json(prefs);
    } catch (error) {
      console.error('Error fetching preferences:', error);
      res.status(500).json({ message: 'Failed to fetch preferences' });
    }
  });

  // Update user preferences
  app.patch("/api/preferences", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const prefsData = insertPreferencesSchema.parse(req.body);
      const updatedPrefs = await storage.updatePreferences(req.user.id, prefsData);
      res.json(updatedPrefs);
    } catch (error) {
      console.error('Error updating preferences:', error);
      res.status(500).json({ message: 'Failed to update preferences' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}