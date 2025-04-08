/**
 * API client for interacting with the FastAPI backend
 */

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:8000';

export interface ChatMessage {
  id?: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp?: string;
  has_image?: boolean;
}

export interface Chat {
  id: string;
  title: string;
  last_message: string;
  updated_at: string;
}

// Function to send a chat message to the API
export async function sendChatMessage({
  prompt,
  userId,
  chatId,
  screenshot,
  history
}: {
  prompt: string;
  userId: string;
  chatId?: string;
  screenshot?: string;
  history?: ChatMessage[];
}): Promise<{ response: string; chat_id: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        user_id: userId,
        chat_id: chatId,
        screenshot,
        chat_history: history,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
}

// Function to get all chats for a user
export async function getUserChats(userId: string): Promise<Chat[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/chats/${userId}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.chats || [];
  } catch (error) {
    console.error('Error fetching user chats:', error);
    throw error;
  }
}

// Function to get all messages for a specific chat
export async function getChatMessages(userId: string, chatId: string): Promise<ChatMessage[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/chats/${userId}/${chatId}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    throw error;
  }
}