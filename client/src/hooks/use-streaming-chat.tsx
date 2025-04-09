import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatMessage, StreamingEvent } from '@/lib/types';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';

type ChatStreamState = {
  isStreaming: boolean;
  messageContent: string;
  streamingMessageId: string | null;
};

/**
 * Custom hook for streaming chat responses
 */
export function useStreamingChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [state, setState] = useState<ChatStreamState>({
    isStreaming: false,
    messageContent: '',
    streamingMessageId: null,
  });
  
  const eventSourceRef = useRef<EventSource | null>(null);
  
  // Cleanup function to close event source connection
  const closeEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      console.log('Closing SSE connection');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);
  
  // Clean up event source when component unmounts
  useEffect(() => {
    return () => {
      closeEventSource();
    };
  }, [closeEventSource]);
  
  // Send a message and receive a streaming response
  const sendStreamingMessage = useCallback(async (content: string, onComplete?: (message: ChatMessage) => void) => {
    try {
      // Validate message content and user authentication
      if (!content || content.trim().length === 0) {
        toast({
          title: 'Empty Message',
          description: 'Please enter a message before sending.',
          variant: 'destructive',
        });
        return;
      }

      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'Please sign in to use the chat.',
          variant: 'destructive',
        });
        return;
      }

      // Check network connectivity
      if (!navigator.onLine) {
        toast({
          title: 'No Internet Connection',
          description: 'Please check your internet connection and try again.',
          variant: 'destructive',
        });
        return;
      }
      
      // Close any existing connection first
      closeEventSource();
      
      // Reset state
      setState({
        isStreaming: true,
        messageContent: '',
        streamingMessageId: null,
      });
      
      console.log('Starting streaming chat request');
      
      // Clean the content to prevent empty message errors
      const cleanedContent = content.trim();
      
      // Make sure message is not too short (Gemini API has issues with very short messages)
      const safeContent = cleanedContent.length < 3 ? 
        `${cleanedContent} - Please respond to this brief message` : 
        cleanedContent;
      
      // First, check if we already have an EventSource - if so, close it to prevent connection issues
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      // Don't use EventSource connection as it's causing issues in Firefox
      // Instead, we'll use regular fetch with streaming response
      console.log("Skipping EventSource connection - using fetch with streaming instead");
      
      // Create a placeholder for compatibility
      eventSourceRef.current = null;
      
      // Send the message content via POST request and handle the response
      try {
        const response = await fetch('/api/messages/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: safeContent,
            role: 'user',
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        // Process the response and extract the full content
        const responseData = await response.json();
        
        if (responseData && responseData.content) {
          // Simulate streaming by adding chunks of text with small delays
          const textChunks = responseData.content.match(/.{1,10}/g) || [];
          
          // Set streaming message ID if available
          if (responseData.id) {
            setState(prev => ({
              ...prev,
              streamingMessageId: responseData.id,
            }));
          }
          
          // Add each chunk with a small delay to simulate streaming
          for (const chunk of textChunks) {
            setState(prev => ({
              ...prev,
              messageContent: prev.messageContent + chunk,
            }));
            
            // Small delay between chunks (20-50ms)
            await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 30) + 20));
          }
          
          // Construct the complete message
          const completeMessage: ChatMessage = {
            id: responseData.id || state.streamingMessageId || undefined,
            content: responseData.content,
            role: 'assistant',
            timestamp: new Date().toISOString(),
          };
          
          // Call the completion callback
          if (onComplete) {
            onComplete(completeMessage);
          }
        } else {
          throw new Error('Invalid response format from server');
        }
        
        // Reset state when complete
        setState({
          isStreaming: false,
          messageContent: '',
          streamingMessageId: null,
        });
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Unknown error occurred';
        
        console.error('Error in streaming fetch:', error);
        
        toast({
          title: 'Error',
          description: `Failed with message: ${errorMessage}`,
          variant: 'destructive',
        });
        
        // Reset state
        setState({
          isStreaming: false,
          messageContent: '',
          streamingMessageId: null,
        });
        return;
      }
      
    } catch (error: unknown) {
      console.error('Error in sendStreamingMessage:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';
      
      toast({
        title: 'Error',
        description: `Failed to start streaming: ${errorMessage}`,
        variant: 'destructive',
      });
      
      // Reset state
      setState({
        isStreaming: false,
        messageContent: '',
        streamingMessageId: null,
      });
    }
  }, [closeEventSource, state.messageContent, state.streamingMessageId, toast]);
  
  return {
    isStreaming: state.isStreaming,
    streamingContent: state.messageContent,
    sendStreamingMessage,
  };
}