import { Handler } from '@netlify/functions';
import { MemStorage } from '../../server/memStorage';

// Initialize storage
const storage = new MemStorage();

export const handler: Handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Use default user ID for testing (in production, get from auth)
    const userId = "netlify-user-123";
    
    // Create a new chat session (which effectively clears messages)
    const newSession = await storage.createChatSession(userId, "New Chat");
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: "New chat session created", 
        sessionId: newSession.id 
      }),
    };
  } catch (error) {
    console.error('Error clearing messages:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: 'Failed to clear chat history' }),
    };
  }
};