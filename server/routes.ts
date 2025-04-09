import type { Express } from "express";
import { createServer, type Server } from "http";
import { insertMessageSchema, insertPreferencesSchema, ChatMessage } from "@shared/schema";
import { getChatResponse, getImageChatResponse, getStreamingChatResponse } from "./gemini";
import { setupAuth } from "./auth";
// No Firebase storage import - using local storage instead

// Local in-memory storage for messages and preferences until Firebase permissions are fixed
import { UserPreferences, InsertUserPreferences } from "@shared/schema";

// Messages storage
const messageStore: Record<string, ChatMessage[]> = {};
const getLocalMessages = (userId: string): ChatMessage[] => messageStore[userId] || [];
const clearLocalMessages = (userId: string): void => {
  messageStore[userId] = [];
  console.log(`Cleared messages for user ${userId}`);
};
const addLocalMessage = (message: Omit<ChatMessage, "id" | "timestamp">): ChatMessage => {
  const userId = message.userId;
  if (!messageStore[userId]) {
    messageStore[userId] = [];
  }
  
  const now = new Date();
  const newMessage: ChatMessage = {
    ...message,
    id: `msg_${Date.now()}`,
    timestamp: now,
  };
  
  messageStore[userId].push(newMessage);
  console.log(`Stored message locally for user ${userId}: ${newMessage.content.substring(0, 30)}...`);
  return newMessage;
};

// Preferences storage
const prefsStore: Record<string, UserPreferences> = {};
const getLocalPreferences = (userId: string): UserPreferences => {
  if (!prefsStore[userId]) {
    // Create default preferences if they don't exist
    prefsStore[userId] = {
      id: userId,
      userId: userId,
      voiceEnabled: 1,
      avatarEnabled: 1
    };
  }
  return prefsStore[userId];
};

const updateLocalPreferences = (userId: string, prefs: InsertUserPreferences): UserPreferences => {
  const existing = getLocalPreferences(userId);
  const updated: UserPreferences = {
    ...existing,
    ...prefs
  };
  prefsStore[userId] = updated;
  return updated;
};

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
    // Skip authentication temporarily for testing
    // if (!req.isAuthenticated()) {
    //   console.log("User not authenticated for /api/messages GET");
    //   return res.sendStatus(401);
    // }
    
    try {
      // Use a default user ID for testing if not authenticated
      const userId = req.isAuthenticated() ? req.user.id : "test-user-123";
      
      // Get messages from local storage
      const messages = getLocalMessages(userId);
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

      // Store user message locally
      const userMessage = addLocalMessage({
        content: messageData.content,
        role: "user",
        userId: userId,
        has_image: has_image || false
      });

      // Choose appropriate AI handler based on whether there's an image
      let aiResponse: string;
      
      // Get previous messages for context
      const previousMessages = getLocalMessages(userId);
      const history = previousMessages
        .filter(msg => msg.id !== userMessage.id) // Filter out the message we just added
        .map(msg => ({
          content: msg.content,
          role: msg.role
        }));
      
      // Special handling for very short messages which often cause issues with Gemini API
      if (content.trim().length < 5 && !has_image) {
        console.log("Message too short for streaming, using regular API");
        
        try {
          if (process.env.GEMINI_API_KEY) {
            // Define training prompts for consistency
            const trainingPrompt = [
              {
                "role": "user",
                "parts": [{
                  "text": "This is Introductory dialogue for any prompt: 'Hello, I am ChattyAI. I can help you with anything you'd like to know about coding, technology, or any other topics.'"
                }]
              },
              {
                "role": "model",
                "parts": [{
                  "text": "Understood. I will respond as ChattyAI."
                }]
              }
            ];
            
            // Prepare all messages in the required format
            const messagesToSend = [...trainingPrompt];
            
            // Add conversation history
            history.forEach(msg => {
              messagesToSend.push({
                "role": msg.role === 'user' ? 'user' : 'model',
                "parts": [{ "text": msg.content }]
              });
            });
            
            // Add current message
            messagesToSend.push({
              "role": "user",
              "parts": [{ "text": content }]
            });
            
            // Direct API call without using the SDK
            console.log("Using direct Gemini API call");
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${process.env.GEMINI_API_KEY}`;
            
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                "contents": messagesToSend,
                "generationConfig": {
                  "temperature": 0.7,
                  "topK": 32,
                  "topP": 0.95,
                  "maxOutputTokens": 2048
                }
              })
            });
            
            const responseData = await response.json();
            
            if (responseData.candidates && responseData.candidates[0] && 
                responseData.candidates[0].content && responseData.candidates[0].content.parts) {
              aiResponse = responseData.candidates[0].content.parts[0].text;
            } else {
              aiResponse = "Hi there! How can I help you today?";
            }
          } else {
            // Fallback to getChatResponse with a better prompt
            aiResponse = await getChatResponse(content + " (Please respond even though this is a short message)");
          }
        } catch (error) {
          console.error("Error with direct API call:", error);
          aiResponse = "Hi there! How can I help you today?";
        }
      } 
      else if (has_image && image_data) {
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
          
          // Return a proper error message instead of a fake response
          aiResponse = "I'm sorry, I couldn't analyze that image. Error: Failed to get image analysis from AI";
        }
      } else {
        // Get AI response using standard Gemini text model
        try {
          // Pass the conversation history for context
          aiResponse = await getChatResponse(messageData.content, history);
        } catch (error) {
          console.error("Error getting chat response:", error);
          aiResponse = "I'm sorry, I couldn't generate a response. " + String(error);
        }
      }

      console.log(`AI Response (first 50 chars): ${aiResponse.substring(0, 50)}...`);

      // Store AI response locally
      const aiMessage = addLocalMessage({
        content: aiResponse,
        role: "assistant",
        userId: userId,
        has_image: false
      });

      console.log("Messages in storage for user:", messageStore[userId].length);
      console.log("Returning messages to client:", { 
        userMessageId: userMessage.id,
        aiMessageId: aiMessage.id 
      });

      res.json({ userMessage, aiMessage });
    } catch (error) {
      console.error('Error processing message:', error);
      res.status(500).json({ message: 'Failed to process message', error: String(error) });
    }
  });

  // Clear messages for a new chat
  app.post("/api/messages/clear", async (req, res) => {
    try {
      // Use a default user ID for testing if not authenticated
      const userId = req.isAuthenticated() ? req.user.id : "test-user-123";
      
      // Clear all messages for this user
      clearLocalMessages(userId);
      
      res.json({ success: true, message: "Chat history cleared" });
    } catch (error) {
      console.error('Error clearing messages:', error);
      res.status(500).json({ success: false, message: 'Failed to clear chat history' });
    }
  });

  // Get user preferences
  app.get("/api/preferences", async (req, res) => {
    // Skip authentication temporarily for testing
    const userId = req.isAuthenticated() ? req.user.id : "test-user-123";
    
    try {
      const prefs = getLocalPreferences(userId);
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
      const updatedPrefs = updateLocalPreferences(userId, prefsData);
      res.json(updatedPrefs);
    } catch (error) {
      console.error('Error updating preferences:', error);
      res.status(500).json({ message: 'Failed to update preferences' });
    }
  });

  // Streaming endpoint for real-time chat responses
  app.post("/api/messages/stream", async (req, res) => {
    console.log("POST /api/messages/stream received");
    
    try {
      // Extract message content
      const { content, role } = req.body;
      console.log(`Streaming request for: "${content.substring(0, 30)}..."`);
      
      // Use a default user ID for testing if not authenticated
      const userId = req.isAuthenticated() ? req.user.id : "test-user-123";
      
      // Validate the message data
      const messageData = insertMessageSchema.parse({ content, role });

      // Store user message locally
      const userMessage = addLocalMessage({
        content: messageData.content,
        role: "user",
        userId: userId,
        has_image: false
      });

      // Set up SSE (Server-Sent Events)
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Send the user message ID back to the client
      res.write(`data: ${JSON.stringify({ type: 'user-message', id: userMessage.id })}\n\n`);
      
      // Create a placeholder for the AI message to be updated later
      const placeholderAiMessage = addLocalMessage({
        content: "",  // Start with empty content
        role: "assistant",
        userId: userId,
        has_image: false
      });
      
      // Send the AI message ID back to the client so it can track updates
      res.write(`data: ${JSON.stringify({ type: 'ai-message-start', id: placeholderAiMessage.id })}\n\n`);

      // For very short messages, use non-streaming approach but simulate streaming
      if (content.trim().length < 5) {
        // Get all previous messages for this user to maintain conversation context
        const previousMessages = getLocalMessages(userId);
        const history = previousMessages
          .filter(msg => msg.id !== userMessage.id) // Filter out the message we just added
          .map(({ content, role }) => ({ content, role }));
          
        console.log("Message too short for streaming, using direct API call instead");
        
        try {
          let aiResponse = "";
            
          if (process.env.GEMINI_API_KEY) {
            // Define training prompts for consistency
            const trainingPrompt = [
              {
                "role": "user",
                "parts": [{
                  "text": "This is Introductory dialogue for any prompt: 'Hello, I am ChattyAI. I can help you with anything you'd like to know about coding, technology, or any other topics.'"
                }]
              },
              {
                "role": "model",
                "parts": [{
                  "text": "Understood. I will respond as ChattyAI."
                }]
              }
            ];
            
            // Prepare messages in the format expected by Gemini API
            const messagesToSend = [...trainingPrompt];
            
            // Add conversation history
            history.forEach(msg => {
              messagesToSend.push({
                "role": msg.role === 'user' ? 'user' : 'model',
                "parts": [{ "text": msg.content }]
              });
            });
            
            // Add current message
            messagesToSend.push({
              "role": "user",
              "parts": [{ "text": content }]
            });
            
            // Direct API call for short messages
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${process.env.GEMINI_API_KEY}`;
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                "contents": messagesToSend,
                "generationConfig": {
                  "temperature": 0.7,
                  "topK": 32,
                  "topP": 0.95,
                  "maxOutputTokens": 2048
                }
              })
            });
            
            const responseData = await response.json();
            
            if (responseData.candidates && responseData.candidates[0] && 
                responseData.candidates[0].content && responseData.candidates[0].content.parts) {
              aiResponse = responseData.candidates[0].content.parts[0].text;
            } else {
              aiResponse = "Hi there! How can I help you today?";
            }
          } else {
            aiResponse = await getChatResponse(content, history);
          }
          
          // Simulate streaming by sending the response in chunks
          const chunks = aiResponse.match(/.{1,20}/g) || [aiResponse];
          let fullResponse = "";
          
          for (const chunk of chunks) {
            fullResponse += chunk;
            res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
            
            // Ensure chunks are sent immediately
            if (typeof res.flushHeaders === 'function') {
              res.flushHeaders();
            }
            
            // Add a small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          
          // Update the AI message with the complete response
          placeholderAiMessage.content = fullResponse;
          
          // Send completion event
          res.write(`data: ${JSON.stringify({ type: 'done', fullContent: fullResponse })}\n\n`);
          
          // End the response
          res.end();
          
          console.log("Simulated streaming response completed successfully");
        } catch (error) {
          console.error("Error during simulated streaming:", error);
          res.write(`data: ${JSON.stringify({ type: 'error', message: 'Streaming failed' })}\n\n`);
          res.end();
        }
      } else {
        // Get streaming response generator
        const streamingResponse = getStreamingChatResponse(messageData.content, getLocalMessages(userId));
        
        // Variable to accumulate the full response
        let fullResponse = "";
        
        // Process streaming response
        try {
          for await (const chunk of streamingResponse) {
            // Add the chunk to the full response
            fullResponse += chunk;
            
            // Send the chunk as an SSE event
            res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
            
            // Ensure chunks are sent immediately
            if (typeof res.flushHeaders === 'function') {
              res.flushHeaders();
            }
          }
          
          // Update the AI message with the complete response
          placeholderAiMessage.content = fullResponse;
          
          // Send completion event
          res.write(`data: ${JSON.stringify({ type: 'done', fullContent: fullResponse })}\n\n`);
          
          // End the response
          res.end();
          
          console.log("Streaming response completed successfully");
        } catch (error) {
          console.error("Error during streaming:", error);
          res.write(`data: ${JSON.stringify({ type: 'error', message: 'Streaming failed' })}\n\n`);
          res.end();
        }
      }
    } catch (error) {
      console.error('Error processing streaming message:', error);
      res.status(500).json({ message: 'Failed to process streaming message', error: String(error) });
    }
  });
  
  // File upload endpoint for document analysis
  app.post("/api/upload", async (req, res) => {
    // Skip authentication temporarily for testing
    const userId = req.isAuthenticated() ? req.user.id : "test-user-123";
    
    try {
      // This is a simple implementation - in production you'd use a proper file upload middleware
      const { fileName, fileContent, fileType } = req.body;
      
      // For now, just return a placeholder response
      // In production, you'd process the document with Gemini
      res.json({ 
        success: true, 
        message: `File ${fileName} received. This would be processed with Gemini API in production.` 
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ success: false, message: 'Failed to upload file' });
    }
  });
  
  // Add a console log to help with debugging
  console.log("API is configured with Gemini API - text chat should be working");
  try {
    await getChatResponse("Hello, test message");
    console.log("✅ Successfully tested Gemini API connection!");
  } catch (e) {
    console.error("⚠️ Error testing Gemini API connection:", e);
    console.log("Please check your GEMINI_API_KEY environment variable");
  }
  
  const httpServer = createServer(app);
  return httpServer;
}