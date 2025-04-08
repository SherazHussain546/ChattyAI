import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Process chat messages and get AI response
export async function getChatResponse(message: string, history: ChatMessage[] = []): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OPENAI_API_KEY is not set. AI responses will not work properly.");
      return "I'm sorry, but I'm unable to process requests at the moment. The AI service is not properly configured.";
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful and friendly AI assistant. Provide clear, concise, and engaging responses.",
        },
        ...history,
        { role: "user", content: message }
      ],
    });

    return response.choices[0].message.content || "I apologize, but I'm not sure how to respond to that.";
  } catch (error) {
    console.error("Error getting chat response:", error);
    throw new Error("Failed to get response from AI");
  }
}

// Analyze sentiment for avatar expressions
export async function analyzeSentiment(text: string): Promise<{
  mood: "happy" | "neutral" | "sad";
  intensity: number;
}> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OPENAI_API_KEY is not set. Sentiment analysis will not work properly.");
      return { mood: "neutral", intensity: 0.5 };
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Analyze the emotional tone of the text and respond with JSON containing mood (happy, neutral, or sad) and intensity (0-1)."
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || '{"mood":"neutral","intensity":0.5}';
    return JSON.parse(content);
  } catch (error) {
    console.error("Error analyzing sentiment:", error);
    return { mood: "neutral", intensity: 0.5 };
  }
}

// Convert text to speech-optimized format 
export async function optimizeForSpeech(text: string): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OPENAI_API_KEY is not set. Speech optimization will not work properly.");
      return text;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Convert the following text into a more natural, speech-friendly format. Remove special characters and format numbers for speech."
        },
        {
          role: "user",
          content: text
        }
      ]
    });

    return response.choices[0].message.content || text;
  } catch (error) {
    console.error("Error optimizing for speech:", error);
    return text;
  }
}

export default openai;