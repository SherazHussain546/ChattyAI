import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Define the official model names from Google AI Studio
const MODELS = {
  // Standard Google AI Studio models that are guaranteed to work
  text: "gemini-pro",
  vision: "gemini-pro-vision",
  // Same as primary models since these are the standard ones
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

    console.log("Preparing to analyze image with Gemini Vision...");
    
    // Get the vision model - use gemini-pro-vision for image analysis
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
    console.log("Using Gemini model with image support: gemini-pro-vision");
    
    // Clean the base64 data if it has a data URL prefix
    let cleanedBase64 = imageBase64;
    if (imageBase64.includes('base64,')) {
      cleanedBase64 = imageBase64.split('base64,')[1];
      console.log("Cleaned base64 data from data URL format");
    }

    // Create parts for the content generation request
    const imagePart = {
      inlineData: {
        data: cleanedBase64,
        mimeType: "image/jpeg"
      }
    };

    // Create text prompt
    const textPart = { text: message || "What do you see in this image? Provide a detailed description." };
    console.log("Using prompt:", textPart.text);
    
    // Generate content with both image and text
    console.log("Sending request to Gemini Vision API...");
    const result = await model.generateContent([textPart, imagePart]);
    const response = result.response;
    console.log("Received response from Gemini Vision API");
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
    
    // Extract the JSON object from the response - use a greedy approach to handle newlines
    const jsonMatch = response.includes('{') && response.includes('}') 
      ? response.substring(response.indexOf('{'), response.lastIndexOf('}')+1)
      : null;
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch);
      } catch (e) {
        console.error("Failed to parse JSON from Gemini response:", e);
        return { mood: "neutral", intensity: 0.5 };
      }
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