import { Handler } from '@netlify/functions';
import { MemStorage } from '../../server/memStorage';

// Initialize storage
const storage = new MemStorage();

export const handler: Handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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
      // Get user preferences
      const preferences = await storage.getPreferences(userId);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(preferences || { voiceEnabled: 1, avatarEnabled: 1 }),
      };
      
    } else if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
      // Update user preferences
      const { voiceEnabled, avatarEnabled } = JSON.parse(event.body || '{}');
      
      await storage.updatePreferences(userId, {
        voiceEnabled: voiceEnabled ? 1 : 0,
        avatarEnabled: avatarEnabled ? 1 : 0
      });
      
      const updatedPreferences = await storage.getPreferences(userId);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updatedPreferences),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };

  } catch (error) {
    console.error('Error in preferences function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', message: String(error) }),
    };
  }
};