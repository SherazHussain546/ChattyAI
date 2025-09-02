import { Handler } from '@netlify/functions';

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
    const { displayName, email, photoURL, uid } = JSON.parse(event.body || '{}');
    
    // For Netlify deployment, we'll return a simplified user object
    // In production, you'd integrate with Firebase Admin SDK here
    const userData = {
      username: `user_${Date.now()}`,
      displayName: displayName || 'Anonymous User',
      photoURL: photoURL || null,
      firebaseUid: uid,
      isAnonymous: !uid,
      id: "1", // Simplified for now
      createdAt: new Date().toISOString()
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(userData),
    };
  } catch (error) {
    console.error('Error in Firebase auth:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Authentication failed' }),
    };
  }
};