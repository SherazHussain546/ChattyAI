import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema, insertPreferencesSchema } from "@shared/schema";
import { getChatResponse, getImageChatResponse } from "./gemini";
import { setupAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes and middleware
  setupAuth(app);

  // Simple test endpoint for Gemini API
  app.get("/api/test-gemini", async (req, res) => {
    try {
      console.log("Testing Gemini API...");
      const response = await getChatResponse("Hello, can you give me a short response to test if you're working?");
      res.json({ success: true, message: response });
    } catch (error) {
      console.error('Error testing Gemini:', error);
      res.status(500).json({ success: false, message: 'Failed to test Gemini API', error: String(error) });
    }
  });

  // Get chat history
  app.get("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log("User not authenticated for /api/messages GET");
      return res.sendStatus(401);
    }
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
    console.log("POST /api/messages received");
    
    // Skip authentication temporarily for testing
    // if (!req.isAuthenticated()) {
    //   console.log("User not authenticated for /api/messages POST");
    //   return res.sendStatus(401);
    // }
    
    try {
      // Extract the message content, whether it has an image, and the image data if present
      const { content, role, has_image, image_data } = req.body;
      console.log(`Message content: "${content.substring(0, 30)}...", has_image: ${has_image}`);
      
      // Use a default user ID for testing if not authenticated
      const userId = req.isAuthenticated() ? req.user.id : "test-user-123";
      
      // Validate the message data
      const messageData = insertMessageSchema.parse({ content, role });

      // Store user message
      const userMessage = await storage.addMessage({
        content: messageData.content,
        role: "user",
        userId: userId,
        has_image: has_image || false
      });

      // Choose appropriate AI handler based on whether there's an image
      let aiResponse: string;
      
      if (has_image && image_data) {
        console.log("Processing image with Gemini Vision...");
        try {
          // Extract the base64 data from the data URI if needed
          const base64Data = image_data.includes('base64,') 
            ? image_data.split('base64,')[1] 
            : image_data;
            
          // Get AI response using Gemini Vision
          aiResponse = await getImageChatResponse(messageData.content, base64Data);
        } catch (error) {
          console.error("Error processing image with Gemini Vision:", error);
          aiResponse = "I'm sorry, I couldn't analyze that image. " + String(error);
        }
      } else {
        // Get AI response using standard Gemini text model
        try {
          aiResponse = await getChatResponse(messageData.content);
        } catch (error) {
          console.error("Error getting chat response:", error);
          aiResponse = "I'm sorry, I couldn't generate a response. " + String(error);
        }
      }

      console.log(`AI Response (first 50 chars): ${aiResponse.substring(0, 50)}...`);

      // Store AI response
      const aiMessage = await storage.addMessage({
        content: aiResponse,
        role: "assistant",
        userId: userId,
        has_image: false
      });

      res.json({ userMessage, aiMessage });
    } catch (error) {
      console.error('Error processing message:', error);
      res.status(500).json({ message: 'Failed to process message', error: String(error) });
    }
  });

  // Get user preferences
  app.get("/api/preferences", async (req, res) => {
    // Skip authentication temporarily for testing
    const userId = req.isAuthenticated() ? req.user.id : "test-user-123";
    
    try {
      const prefs = await storage.getPreferences(userId);
      res.json(prefs);
    } catch (error) {
      console.error('Error fetching preferences:', error);
      res.status(500).json({ message: 'Failed to fetch preferences' });
    }
  });

  // Update user preferences
  app.patch("/api/preferences", async (req, res) => {
    // Skip authentication temporarily for testing
    const userId = req.isAuthenticated() ? req.user.id : "test-user-123";
    
    try {
      const prefsData = insertPreferencesSchema.parse(req.body);
      const updatedPrefs = await storage.updatePreferences(userId, prefsData);
      res.json(updatedPrefs);
    } catch (error) {
      console.error('Error updating preferences:', error);
      res.status(500).json({ message: 'Failed to update preferences' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}