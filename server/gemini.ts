import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Define model names - these might need updating as the API evolves
const MODELS = {
  text: "gemini-1.5-pro",      // The most advanced text model
  vision: "gemini-1.5-pro-vision", // For image analysis
  // Fallbacks to older versions if needed
  textFallback: "gemini-pro",  
  visionFallback: "gemini-pro-vision"
};

// Initialize the Gemini API
// Note: Make sure GEMINI_API_KEY is properly set
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Define interface for chat messages
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Get chat response from Gemini Pro
 */
export async function getChatResponse(message: string, history: ChatMessage[] = []): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not set. AI responses will not work properly.");
      return "I'm sorry, but I'm unable to process requests at the moment. The AI service is not properly configured.";
    }

    console.log("Using Gemini API with key:", process.env.GEMINI_API_KEY?.substring(0, 5) + "...");
    
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
    
    // Convert history and new message into a prompt
    let prompt = "";
    
    // If there's history, format it as a conversation
    if (history.length > 0) {
      for (const msg of history) {
        const role = msg.role === "user" ? "User" : "Assistant";
        prompt += `${role}: ${msg.content}\n\n`;
      }
    }
    
    // Add the new message
    prompt += `User: ${message}\n\nAssistant:`;
    
    // Generate content
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    console.log("Gemini response:", text.substring(0, 100) + "...");
    
    return text;
  } catch (error) {
    console.error("Error getting chat response from Gemini:", error);
    throw new Error("Failed to get response from AI");
  }
}

/**
 * Get chat response for an image from Gemini Vision
 */
export async function getImageChatResponse(message: string, imageBase64: string): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not set. AI responses will not work properly.");
      return "I'm sorry, but I'm unable to process requests at the moment. The AI service is not properly configured.";
    }

    // Try both current and fallback models for vision
    let model;
    try {
      // First try the latest vision model
      model = genAI.getGenerativeModel({ model: MODELS.vision });
      console.log("Using latest Gemini vision model:", MODELS.vision);
    } catch (e) {
      // Fall back to standard vision model if latest isn't available
      model = genAI.getGenerativeModel({ model: MODELS.visionFallback });
      console.log("Falling back to standard Gemini vision model:", MODELS.visionFallback);
    }
    
    // Create image parts from the base64 image
    const imageParts = [{
      inlineData: {
        data: imageBase64,
        mimeType: "image/jpeg",
      },
    }];

    // Create text prompt
    const textPart = { text: message || "What do you see in this image? Provide a detailed description." };
    
    // Generate content with both image and text
    const result = await model.generateContent([textPart, ...imageParts]);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("Error getting image chat response from Gemini:", error);
    throw new Error("Failed to get image analysis from AI");
  }
}

/**
 * Analyze sentiment for avatar expressions
 */
export async function analyzeSentiment(text: string): Promise<{
  mood: "happy" | "neutral" | "sad";
  intensity: number;
}> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not set. Sentiment analysis will not work properly.");
      return { mood: "neutral", intensity: 0.5 };
    }

    // Try appropriate model for sentiment analysis
    let model;
    try {
      model = genAI.getGenerativeModel({ model: MODELS.text });
    } catch (e) {
      model = genAI.getGenerativeModel({ model: MODELS.textFallback });
    }
    
    // Prompt for sentiment analysis in JSON format
    const prompt = `
      Analyze the emotional tone of this text: "${text}"
      
      Respond only with a JSON object having these properties:
      1. mood: Either "happy", "neutral", or "sad"
      2. intensity: A number between 0 and 1 representing the intensity of the emotion

      Example: {"mood":"happy","intensity":0.8}
    `;
    
    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();
    
    // Extract the JSON object from the response
    const jsonMatch = response.match(/\{.*\}/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      return { mood: "neutral", intensity: 0.5 };
    }
  } catch (error) {
    console.error("Error analyzing sentiment with Gemini:", error);
    return { mood: "neutral", intensity: 0.5 };
  }
}

/**
 * Optimize text for speech synthesis
 */
export async function optimizeForSpeech(text: string): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not set. Speech optimization will not work properly.");
      return text;
    }

    // Try appropriate model for speech optimization
    let model;
    try {
      model = genAI.getGenerativeModel({ model: MODELS.text });
    } catch (e) {
      model = genAI.getGenerativeModel({ model: MODELS.textFallback });
    }
    
    const prompt = `
      Convert the following text into a more natural, speech-friendly format.
      Remove special characters and format numbers for speech.
      Just provide the optimized text without any explanations.

      Text to optimize: "${text}"
    `;
    
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Error optimizing for speech with Gemini:", error);
    return text;
  }
}

export default { getChatResponse, getImageChatResponse, analyzeSentiment, optimizeForSpeech };