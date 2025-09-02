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

// Direct API model names (no 'models/' prefix)
const API_MODELS = {
  text: "gemini-1.5-pro-latest",
  vision: "gemini-1.5-flash-latest", 
  textFallback: "gemini-1.5-flash", 
  visionFallback: "gemini-1.5-flash-002"
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
    
    // Define special training prompts (similar to what was provided in the user's example)
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
      },
      {
        "role": "user",
        "parts": [{
          "text": "Special Dialogue: if any prompt mentions 'coding' word: 'I can definitely help with coding! I'm familiar with many programming languages and development concepts. Let me know which language or framework you're working with.'"
        }]
      },
      {
        "role": "model",
        "parts": [{
          "text": "Understood."
        }]
      }
    ];
    
    // Try direct API approach similar to the user's example code
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${API_MODELS.text}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    // Prepare messages in the format expected by Gemini API
    const messagesToSend = [
      ...trainingPrompt
    ];
    
    // Add conversation history
    for (const msg of history) {
      messagesToSend.push({
        "role": msg.role === 'user' ? 'user' : 'model',
        "parts": [{ "text": msg.content }]
      });
    }
    
    // Add the current message
    messagesToSend.push({
      "role": "user",
      "parts": [{ "text": message }]
    });
    
    // Make the direct API request
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
          "maxOutputTokens": 4096
        }
      })
    });
    
    // Process the response
    const responseData = await response.json();
    
    // Check for API errors first
    if (responseData.error) {
      console.error("Gemini API Error:", responseData.error);
      
      if (responseData.error.code === 429) {
        return "⚠️ **API Quota Exceeded**: Your Gemini API has reached its usage limit. This typically resets daily or you can upgrade your plan at https://ai.google.dev/pricing. Please try again later or check your API quota in Google AI Studio.";
      } else if (responseData.error.code === 403) {
        return "🔑 **API Access Denied**: There's an issue with your Gemini API key permissions. Please check your API key settings in Google AI Studio.";
      } else if (responseData.error.code === 400) {
        return "❌ **Invalid Request**: The message couldn't be processed. Please try rephrasing your question or making it shorter.";
      } else {
        return `🚨 **API Error**: ${responseData.error.message || 'Unknown error occurred'}. Please try again later.`;
      }
    }
    
    if (responseData.candidates && responseData.candidates[0] && 
        responseData.candidates[0].content && responseData.candidates[0].content.parts) {
      const responseText = responseData.candidates[0].content.parts[0].text;
      console.log("Gemini response:", responseText.substring(0, 50) + "...");
      return responseText;
    } else {
      console.error("Unexpected response format from Gemini API:", responseData);
      return "I apologize, but I encountered an issue processing your request. Could you try again with a different question?";
    }
  } catch (error) {
    console.error("Error getting chat response from Gemini:", error);
    console.error("Full error details:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : String(error)
    });
    throw new Error(`Failed to get response from AI: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Streaming version of chat response for real-time updates
 * @returns An async generator that yields chunks of response text
 */
export async function* getStreamingChatResponse(message: string, history: ChatMessage[] = []) {
  try {
    // Validate the message content
    if (!message || message.trim() === "") {
      console.warn("Empty message received in streaming API");
      yield "I don't see any message content. Could you please provide a message?";
      return;
    }
    
    // Check for API key
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === "") {
      console.warn("GEMINI_API_KEY is not set. AI streaming responses will not work properly.");
      yield "I'm sorry, but I'm unable to process requests at the moment. The AI service is not properly configured.";
      return;
    }

    // Clean the message to ensure no problematic characters
    const cleanMessage = message.trim();
    
    console.log("Using Gemini API streaming with key:", process.env.GEMINI_API_KEY?.substring(0, 5) + "...");
    
    // For streaming, we'll still use the @google/generative-ai SDK directly
    // as the direct API doesn't support streaming yet
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
    
    // Define training prompts (same as in getChatResponse for consistency)
    const trainingPrompt = [
      {
        role: 'user',
        parts: [{ text: "This is Introductory dialogue for any prompt: 'Hello, I am ChattyAI. I can help you with anything you'd like to know about coding, technology, or any other topics.'" }]
      },
      {
        role: 'model',
        parts: [{ text: "Understood. I will respond as ChattyAI." }]
      }
    ];
    
    // Prepare conversation history
    const formattedHistory = history
      .filter(msg => msg.content.trim() !== '')
      .map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));
    
    // Combine training prompt and history
    const chatHistory = [
      ...trainingPrompt,
      ...formattedHistory
    ];
    
    // Start the chat with all the history
    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        temperature: 0.7,
        topK: 32,
        topP: 0.9,
        maxOutputTokens: 4096,
      }
    });
    
    console.log("Starting streaming response for prompt:", cleanMessage);
    
    // Add a fallback if the message is too short
    const safeMessage = cleanMessage.length < 5 ? 
      `${cleanMessage} (Please provide a helpful response to this short message)` : 
      cleanMessage;
    
    // Send the message and get streaming response
    const result = await chat.sendMessageStream(safeMessage);
    
    // Yield each chunk as it arrives
    let fullResponse = "";
    for await (const chunk of result.stream) {
      const textChunk = chunk.text();
      if (textChunk) {
        fullResponse += textChunk;
        yield textChunk;
      }
    }
    
    console.log("Streaming complete. Full response:", fullResponse.substring(0, 100) + (fullResponse.length > 100 ? "..." : ""));
    
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