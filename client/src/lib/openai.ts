import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper type for chat messages
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Process chat messages and get AI response
export async function getChatResponse(message: string, history: ChatMessage[] = []): Promise<string> {
  try {
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

// Analyze sentiment for avatar expressions (not implemented in current version but prepared for future use)
export async function analyzeSentiment(text: string): Promise<{
  mood: "happy" | "neutral" | "sad";
  intensity: number;
}> {
  try {
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

    const result = JSON.parse(response.choices[0].message.content);
    return {
      mood: result.mood || "neutral",
      intensity: Math.max(0, Math.min(1, result.intensity || 0.5))
    };
  } catch (error) {
    console.error("Error analyzing sentiment:", error);
    return {
      mood: "neutral",
      intensity: 0.5
    };
  }
}

// Convert text to speech-optimized format (not implemented in current version but prepared for future use)
export async function optimizeForSpeech(text: string): Promise<string> {
  try {
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
