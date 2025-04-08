import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Initialize Gemini client
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Process text chat messages and get AI response
export async function getChatResponse(message: string, history: ChatMessage[] = []): Promise<string> {
  try {
    // For text-only requests, use Gemini-Pro
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Set safety settings
    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];
    
    // Convert chat history to Gemini format
    const geminiHistory = history.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));
    
    // Start a chat
    const chat = model.startChat({
      history: geminiHistory,
      safetySettings,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 800,
      },
    });

    const result = await chat.sendMessage(message);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("Error getting chat response:", error);
    throw new Error("Failed to get response from AI");
  }
}

// Process image-based messages and get AI response
export async function getImageChatResponse(message: string, imageBase64: string): Promise<string> {
  try {
    // For requests with images, use Gemini-Pro-Vision
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
    
    // Prepare content parts with both text and image
    const imagePart = {
      inlineData: {
        data: imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, ""),
        mimeType: "image/jpeg",
      },
    };
    
    const textPart = {
      text: message,
    };
    
    // Generate content based on text and image
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [textPart, imagePart] }],
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 800,
      },
    });
    
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("Error processing image:", error);
    throw new Error("Failed to analyze image");
  }
}

// Analyze sentiment for avatar expressions
export async function analyzeSentiment(text: string): Promise<{
  mood: "happy" | "neutral" | "sad";
  intensity: number;
}> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const promptText = `
    Analyze the emotional tone of this text and respond with a JSON object only.
    The JSON should have these fields:
    - mood: either "happy", "neutral", or "sad"
    - intensity: a number between 0 and 1 representing how strong the emotion is
    
    Text to analyze: "${text}"
    
    Respond with ONLY the JSON object.
    `;
    
    const result = await model.generateContent(promptText);
    const response = result.response;
    const jsonStr = response.text().trim();
    
    try {
      const parsedResult = JSON.parse(jsonStr);
      return {
        mood: parsedResult.mood || "neutral",
        intensity: parsedResult.intensity || 0.5
      };
    } catch (parseError) {
      console.error("Error parsing sentiment JSON:", parseError);
      return { mood: "neutral", intensity: 0.5 };
    }
  } catch (error) {
    console.error("Error analyzing sentiment:", error);
    return { mood: "neutral", intensity: 0.5 };
  }
}

// Convert text to speech-optimized format 
export async function optimizeForSpeech(text: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const promptText = `
    Convert the following text into a more natural, speech-friendly format.
    Remove special characters, format numbers for speech, and make it flow naturally when read aloud.
    
    Text to optimize: "${text}"
    
    Only return the optimized text, nothing else.
    `;
    
    const result = await model.generateContent(promptText);
    const response = result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Error optimizing for speech:", error);
    return text;
  }
}

export default genAI;