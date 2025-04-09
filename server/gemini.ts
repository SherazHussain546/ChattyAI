import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Define the official model names from Google AI Studio (as of April 2025)
// Note: The model names change periodically as Google updates the API
const MODELS = {
  // Using the models that are actually available in the API (from the model list)
  text: "models/gemini-1.5-pro-latest",
  // Vision model for image analysis - updated to use newer model that isn't deprecated
  vision: "models/gemini-1.5-flash-latest",  
  // Fallbacks to older versions if needed
  textFallback: "models/gemini-1.5-flash",  
  visionFallback: "models/gemini-1.5-flash-002" // Using newer vision-capable models
};

// Let's add a function to list available models
async function listAvailableModels() {
  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY || '',
        },
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      console.log('Available Gemini models:');
      data.models.forEach((model: any) => {
        console.log(`- ${model.name} (${model.displayName})`);
      });
    } else {
      console.error('Error listing models:', response.statusText);
    }
  } catch (error) {
    console.error('Error fetching available models:', error);
  }
}

// List models on startup
listAvailableModels();

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
/**
 * Standard non-streaming chat response
 */
export async function getChatResponse(message: string, history: ChatMessage[] = []): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === "") {
      console.warn("GEMINI_API_KEY is not set. AI responses will not work properly.");
      return "I'm sorry, but I'm unable to process requests at the moment. The AI service is not properly configured. Please make sure to add a valid Gemini API key.";
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
 * Streaming version of chat response for real-time updates
 * @returns An async generator that yields chunks of response text
 */
export async function* getStreamingChatResponse(message: string, history: ChatMessage[] = []) {
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === "") {
      console.warn("GEMINI_API_KEY is not set. AI streaming responses will not work properly.");
      yield "I'm sorry, but I'm unable to process requests at the moment. The AI service is not properly configured.";
      return;
    }

    console.log("Using Gemini API streaming with key:", process.env.GEMINI_API_KEY?.substring(0, 5) + "...");
    
    // Setup model with streaming capability
    let model;
    try {
      model = genAI.getGenerativeModel({ 
        model: MODELS.text,
        generationConfig: {
          temperature: 0.7,
          topK: 32,
          topP: 0.9,
          maxOutputTokens: 2048,
        }
      });
      console.log("Using latest Gemini model for streaming:", MODELS.text);
    } catch (e) {
      model = genAI.getGenerativeModel({ 
        model: MODELS.textFallback,
        generationConfig: {
          temperature: 0.7,
          topK: 32,
          topP: 0.9,
          maxOutputTokens: 2048,
        }
      });
      console.log("Falling back to standard Gemini model for streaming:", MODELS.textFallback);
    }
    
    // Prepare conversation history to include with the prompt
    const chatHistory = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));
    
    // Start the chat
    let chat;
    
    if (chatHistory.length > 0) {
      // If we have history, create a proper chat session
      chat = model.startChat({
        history: chatHistory,
        generationConfig: {
          temperature: 0.7,
          topK: 32,
          topP: 0.9,
          maxOutputTokens: 2048,
        }
      });
    } else {
      // Otherwise just use a simple chat
      chat = model.startChat();
    }
    
    console.log("Starting streaming response for prompt:", message.substring(0, 50) + "...");
    
    // Send the message and get streaming response
    const result = await chat.sendMessageStream(message);
    
    // Yield each chunk as it arrives
    let fullResponse = "";
    for await (const chunk of result.stream) {
      const textChunk = chunk.text();
      fullResponse += textChunk;
      yield textChunk;
    }
    
    console.log("Streaming complete. Full response:", fullResponse.substring(0, 100) + "...");
    
  } catch (error) {
    console.error("Error in streaming chat response from Gemini:", error);
    yield "I'm sorry, but I'm unable to generate a streaming response at the moment. Please try again later.";
  }
}

/**
 * Get chat response for an image from Gemini Vision
 */
export async function getImageChatResponse(message: string, imageBase64: string): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === "") {
      console.warn("GEMINI_API_KEY is not set. AI responses will not work properly.");
      return "I'm sorry, but I'm unable to process requests at the moment. The AI service is not properly configured. Please make sure to add a valid Gemini API key.";
    }

    console.log("Preparing to analyze image with Gemini Vision...");
    
    // Try both main and fallback vision models
    let model;
    try {
      model = genAI.getGenerativeModel({ 
        model: MODELS.vision,
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 0.8,
          maxOutputTokens: 1024,
        }
      });
      console.log("Using Gemini vision model:", MODELS.vision);
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
    
    // Generate content with both image and text - use format compatible with Google AI Studio
    console.log("Sending request to Gemini API...");
    try {
      // First try the simple content array approach
      const result = await model.generateContent([textPart, imagePart]);
      const response = result.response;
      console.log("Received response from Gemini API");
      return response.text();
    } catch (error) {
      console.log("Failed with first approach, trying alternate format...", error);
      
      // If that fails, try the alternate format with contents array
      const result = await model.generateContent({
        contents: [{ 
          role: "user", 
          parts: [
            { text: message || "What do you see in this image?" },
            { 
              inlineData: {
                mimeType: "image/jpeg",
                data: cleanedBase64
              }
            }
          ] 
        }]
      });
      const response = result.response;
      console.log("Received response from Gemini API using alternate format");
      return response.text();
    }
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
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === "") {
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
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === "") {
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