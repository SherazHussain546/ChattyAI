import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Initialize the Gemini API
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

    // For Gemini, we need to convert the chat history to their format
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const generationConfig = {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    };
    
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

    // Create a chat session
    const chat = model.startChat({
      generationConfig,
      safetySettings,
      history: history.map(msg => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      })),
    });

    // Send the message and get a response
    const result = await chat.sendMessage(message);
    const response = result.response;
    return response.text();
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

    // Initialize the Gemini Vision model
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
    
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

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
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

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
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