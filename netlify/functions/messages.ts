import { Handler } from '@netlify/functions';
import { getChatResponse, getImageChatResponse } from '../../server/gemini';
import { MemStorage } from '../../server/memStorage';
import { insertMessageSchema } from '../../shared/schema';

// Initialize storage
const storage = new MemStorage();

export const handler: Handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    if (event.httpMethod === 'POST') {
      // Handle posting new messages
      const { content, role, has_image, image_data } = JSON.parse(event.body || '{}');
      console.log(`Message content: "${content.substring(0, 30)}...", has_image: ${has_image}`);
      
      // Use default user ID for testing (in production, get from auth)
      const userId = "netlify-user-123";
      
      // Validate the message data
      const messageData = insertMessageSchema.parse({ content, role });

      // Get active chat session ID or create a new one
      let activeChatId = await storage.getActiveChatSessionId(userId);
      
      if (!activeChatId) {
        // Create a new chat session if none is active
        const newSession = await storage.createChatSession(userId, "New Chat");
        activeChatId = newSession.id;
        await storage.setActiveChatSessionId(userId, activeChatId);
      }
      
      // Store user message
      const userMessage = await storage.addMessage({
        content: messageData.content,
        role: "user",
        userId: userId,
        has_image: has_image || false,
        chatId: activeChatId
      });

      // Get AI response
      let aiResponse: string;
      
      // Get previous messages for context
      const previousMessages = await storage.getMessages(userId, activeChatId);
      const history = previousMessages
        .filter(msg => msg.id !== userMessage.id)
        .map(msg => ({
          content: msg.content,
          role: msg.role
        }));
      
      if (has_image && image_data) {
        console.log("Processing image with Gemini Vision...");
        try {
          const base64Data = image_data.includes('base64,') 
            ? image_data.split('base64,')[1] 
            : image_data;
            
          aiResponse = await getImageChatResponse(messageData.content, base64Data);
        } catch (error) {
          console.error("Error processing image:", error);
          aiResponse = "I'm sorry, I couldn't analyze that image. Please try again.";
        }
      } else {
        try {
          aiResponse = await getChatResponse(messageData.content, history);
        } catch (error) {
          console.error("Error getting chat response:", error);
          aiResponse = "I'm sorry, I couldn't generate a response. " + String(error);
        }
      }

      // Store AI response
      const aiMessage = await storage.addMessage({
        content: aiResponse,
        role: "assistant",
        userId: userId,
        has_image: false,
        chatId: activeChatId
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ userMessage, aiMessage }),
      };
      
    } else if (event.httpMethod === 'GET') {
      // Handle getting messages
      const userId = "netlify-user-123";
      
      let activeChatId = await storage.getActiveChatSessionId(userId);
      if (!activeChatId) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify([]),
        };
      }
      
      const messages = await storage.getMessages(userId, activeChatId);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(messages),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };

  } catch (error) {
    console.error('Error in messages function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', message: String(error) }),
    };
  }
};