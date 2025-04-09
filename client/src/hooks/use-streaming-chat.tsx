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
      
      // Create a new EventSource connection
      const eventSource = new EventSource('/api/messages/stream');
      eventSourceRef.current = eventSource;
      
      // Send the message content via POST request
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
      } catch (error: unknown) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Unknown error occurred';
        
        toast({
          title: 'Error',
          description: `Failed to send message: ${errorMessage}`,
          variant: 'destructive',
        });
        closeEventSource();
        setState({
          isStreaming: false,
          messageContent: '',
          streamingMessageId: null,
        });
        return;
      }
      
      // Set up event handlers for server-sent events
      eventSource.onmessage = (event) => {
        console.log('Received SSE message:', event.data);
        try {
          const data = JSON.parse(event.data) as StreamingEvent;
          
          switch (data.type) {
            case 'user-message':
              // User message has been received by server
              console.log('User message received by server:', data.id);
              break;
              
            case 'ai-message-start':
              // AI is starting to respond
              console.log('AI starting to respond, message ID:', data.id);
              setState(prev => ({
                ...prev,
                streamingMessageId: data.id || null,
              }));
              break;
              
            case 'chunk':
              // New chunk of AI's response
              if (data.content) {
                setState(prev => ({
                  ...prev,
                  messageContent: prev.messageContent + data.content,
                }));
              }
              break;
              
            case 'done':
              // Streaming is complete
              console.log('Streaming complete, full response received');
              const fullContent = data.fullContent || state.messageContent;
              
              // Construct the complete message
              const completeMessage: ChatMessage = {
                id: state.streamingMessageId || undefined,
                content: fullContent,
                role: 'assistant',
                timestamp: new Date().toISOString(),
              };
              
              // Call the completion callback
              if (onComplete) {
                onComplete(completeMessage);
              }
              
              // Reset state
              setState({
                isStreaming: false,
                messageContent: '',
                streamingMessageId: null,
              });
              
              // Close the connection
              closeEventSource();
              break;
              
            case 'error':
              // Error occurred during streaming
              console.error('Streaming error:', data.message);
              toast({
                title: 'Error',
                description: data.message || 'An error occurred during streaming',
                variant: 'destructive',
              });
              
              // Reset state
              setState({
                isStreaming: false,
                messageContent: '',
                streamingMessageId: null,
              });
              
              // Close the connection
              closeEventSource();
              break;
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        toast({
          title: 'Connection Error',
          description: 'Lost connection to the server during streaming response',
          variant: 'destructive',
        });
        
        // Reset state
        setState({
          isStreaming: false,
          messageContent: '',
          streamingMessageId: null,
        });
        
        // Close connection
        closeEventSource();
      };
      
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