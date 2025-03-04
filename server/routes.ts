import type { Express } from "express";
import { createServer } from "http";
import { z } from "zod";
import { storage } from "./storage";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  // Get chat messages
  app.get("/api/messages", async (_req, res) => {
    const messages = await storage.getMessages();
    res.json(messages);
  });

  // Send message and get AI response
  app.post("/api/chat", async (req, res) => {
    try {
      const schema = z.object({
        content: z.string().min(1)
      });
      
      const { content } = schema.parse(req.body);
      
      // Store user message
      await storage.createMessage({
        role: "user",
        content,
        sessionId: "default"
      });

      // Get OpenAI response
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        messages: [{ role: "user", content }],
      });

      const aiResponse = response.choices[0].message.content;

      // Store AI response
      await storage.createMessage({
        role: "assistant",
        content: aiResponse,
        sessionId: "default"
      });

      res.json({ content: aiResponse });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  return httpServer;
}
