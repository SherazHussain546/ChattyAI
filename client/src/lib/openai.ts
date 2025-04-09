import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Define model names - these might need updating as the API evolves
// Updated for April 2025 API versions based on available models
const MODELS = {
  // Updated model names for compatibility with current available models
  text: "models/gemini-1.5-pro-latest",         // Use the latest Pro model
  vision: "models/gemini-1.0-pro-vision-latest", // Use the dedicated vision model
  // Fallbacks to alternate versions
  textFallback: "models/gemini-1.5-flash-latest",  
  visionFallback: "models/gemini-pro-vision"
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
    // Check if API key is available
    if (!import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY.trim() === "") {
      console.warn("VITE_GEMINI_API_KEY is not set. AI responses will not work properly.");
      return "I'm sorry, but I'm unable to process requests at the moment. The AI service is not properly configured. Please make sure to add a valid Gemini API key.";
    }
    
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
    
    // Handle specific API key errors
    const errorMessage = String(error);
    if (errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("expired")) {
      return "I'm sorry, there was an error with the API key. It may have expired or be invalid. Please contact the administrator to update the API key.";
    }
    
    // For unknown errors, return a generic message instead of throwing
    return "I'm sorry, I couldn't generate a response. There was an error communicating with the AI service.";
  }
}

// Process image-based messages and get AI response
export async function getImageChatResponse(message: string, imageBase64: string): Promise<string> {
  try {
    // Check if API key is available
    if (!import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY.trim() === "") {
      console.warn("VITE_GEMINI_API_KEY is not set. AI image responses will not work properly.");
      return "I'm sorry, but I'm unable to analyze images at the moment. The AI service is not properly configured. Please make sure to add a valid Gemini API key.";
    }
    
    // Try both main and fallback vision models
    let model;
    try {
      // First try the latest vision model
      model = genAI.getGenerativeModel({ 
        model: MODELS.vision,
        generationConfig: {
          temperature: 0.4,  // Lower temperature for more accurate image descriptions
          topK: 32,
          topP: 0.8,
          maxOutputTokens: 2048,  // Increased for more detailed image descriptions
        }
      });
      console.log("Using latest Gemini vision model:", MODELS.vision);
    } catch (e) {
      // Fall back to standard model if the vision model isn't available
      model = genAI.getGenerativeModel({ 
        model: MODELS.visionFallback,
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 0.8,
          maxOutputTokens: 1024,
        }
      });
      console.log("Falling back to standard vision model:", MODELS.visionFallback);
    }
    
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
    
    // Handle specific API key errors
    const errorMessage = String(error);
    if (errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("expired")) {
      return "I'm sorry, there was an error with the API key. It may have expired or be invalid. Please contact the administrator to update the API key.";
    }
    
    // For unknown errors, return a generic message instead of throwing
    return "I'm sorry, I couldn't analyze that image. There was an error with the image processing service.";
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