import { Handler } from '@netlify/functions';
import { MemStorage } from '../../server/memStorage';

// Initialize storage
const storage = new MemStorage();

export const handler: Handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // Use default user ID for testing (in production, get from auth)
    const userId = "netlify-user-123";

    if (event.httpMethod === 'GET') {
      // Get all chat sessions for current user
      const sessions = await storage.getChatSessions(userId);
      
      // Format response
      const formattedSessions = sessions.map(session => ({
        id: session.id,
        title: session.title,
        created_at: session.createdAt.toISOString(),
        updated_at: session.updatedAt.toISOString(),
        message_count: session.messageCount,
        last_message: session.lastMessage || 'Empty chat'
      }));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(formattedSessions),
      };
      
    } else if (event.httpMethod === 'POST') {
      // Create a new chat session
      const { title } = JSON.parse(event.body || '{}');
      
      // Create a new session
      const newSession = await storage.createChatSession(userId, title || "New Chat");
      
      // Format response
      const formattedSession = {
        id: newSession.id,
        title: newSession.title,
        created_at: newSession.createdAt.toISOString(),
        updated_at: newSession.updatedAt.toISOString(),
        message_count: newSession.messageCount,
        last_message: newSession.lastMessage || 'Empty chat'
      };
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(formattedSession),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };

  } catch (error) {
    console.error('Error in chat-sessions function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', message: String(error) }),
    };
  }
};