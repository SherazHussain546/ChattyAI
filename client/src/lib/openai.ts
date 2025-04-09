import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Define model names - these might need updating as the API evolves
const MODELS = {
  // Updated for compatibility with current available models
  text: "gemini-pro",       // Use a known working text model
  vision: "gemini-pro",     // Use a model that supports both text and images
  // Fallbacks to older versions if needed
  textFallback: "gemini-pro",  
  visionFallback: "gemini-pro"
};

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
    // Try both current and fallback models
    let model;
    try {
      // First try the latest model
      model = genAI.getGenerativeModel({ model: MODELS.text });
      console.log("Using latest Gemini model:", MODELS.text);
    } catch (e) {
      // Fall back to standard model if latest isn't available
      model = genAI.getGenerativeModel({ model: MODELS.textFallback });
      console.log("Falling back to standard Gemini model:", MODELS.textFallback);
    }
    
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
    // Use the standard gemini-pro model that's guaranteed to work with Google AI Studio
    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro",  // Only gemini-pro works for vision on Google AI Studio
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 0.8,
        maxOutputTokens: 1024,
      }
    });
    console.log("Using Google AI Studio model with vision support: gemini-pro");
    
    // Prepare content parts with both text and image
    // Make sure we properly handle the base64 data with or without data URL prefix
    let cleanedBase64 = imageBase64;
    if (imageBase64.startsWith('data:')) {
      cleanedBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
      console.log("Cleaned image data URL format");
    }
    
    const imagePart = {
      inlineData: {
        data: cleanedBase64,
        mimeType: "image/jpeg",
      },
    };
    
    const textPart = {
      text: message,
    };
    
    // Generate content based on text and image (try multiple approaches)
    let result;
    try {
      // First try with the array approach (simpler)
      console.log("Trying first approach...");
      result = await model.generateContent([textPart, imagePart]);
    } catch (e) {
      console.log("First approach failed, trying alternative...", e);
      
      // Fall back to using the contents array with safety settings
      result = await model.generateContent({
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
    }
    
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
    // Try appropriate model for sentiment analysis
    let model;
    try {
      model = genAI.getGenerativeModel({ model: MODELS.text });
    } catch (e) {
      model = genAI.getGenerativeModel({ model: MODELS.textFallback });
    }
    
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
    // Try appropriate model for speech optimization
    let model;
    try {
      model = genAI.getGenerativeModel({ model: MODELS.text });
    } catch (e) {
      model = genAI.getGenerativeModel({ model: MODELS.textFallback });
    }
    
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