import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sendChatMessage, getUserChats, getChatMessages, type ChatMessage, type Chat } from '@/lib/apiClient';
import { captureScreenshot, resizeBase64Image } from '@/lib/screenshotUtils';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';

export function useChat() {
  const auth = useAuth();
  const currentUser = auth.currentUser;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isCapturingScreen, setIsCapturingScreen] = useState(false);

  // Get user chats
  const {
    data: chats = [],
    isLoading: isLoadingChats,
    isError: isChatsError,
    refetch: refetchChats
  } = useQuery<Chat[]>({
    queryKey: ['chats', currentUser?.uid],
    queryFn: () => getUserChats(currentUser?.uid || ''),
    enabled: !!currentUser?.uid,
  });

  // Get messages for active chat
  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    isError: isMessagesError,
    refetch: refetchMessages
  } = useQuery<ChatMessage[]>({
    queryKey: ['messages', currentUser?.uid, activeChatId],
    queryFn: () => getChatMessages(currentUser?.uid || '', activeChatId || ''),
    enabled: !!currentUser?.uid && !!activeChatId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ 
      message, 
      withScreenshot = false 
    }: { 
      message: string; 
      withScreenshot?: boolean;
    }) => {
      if (!currentUser?.uid) {
        throw new Error('User not authenticated');
      }

      let screenshot: string | undefined = undefined;
      
      if (withScreenshot) {
        setIsCapturingScreen(true);
        try {
          const screenshotData = await captureScreenshot();
          if (screenshotData) {
            // Resize screenshot to reduce size
            screenshot = await resizeBase64Image(screenshotData);
          }
        } catch (error) {
          console.error('Error capturing screenshot:', error);
          toast({
            description: 'Failed to capture screenshot',
            variant: 'destructive'
          });
        } finally {
          setIsCapturingScreen(false);
        }
      }

      return sendChatMessage({
        prompt: message,
        userId: currentUser.uid,
        chatId: activeChatId || undefined,
        screenshot,
        history: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })).slice(-10) // Send only the last 10 messages for context
      });
    },
    onSuccess: (data) => {
      // Set active chat ID if it's a new chat
      if (!activeChatId) {
        setActiveChatId(data.chat_id);
      }
      
      // Refetch data
      refetchMessages();
      refetchChats();
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['chats', currentUser?.uid] });
      queryClient.invalidateQueries({ queryKey: ['messages', currentUser?.uid, activeChatId || data.chat_id] });
    },
    onError: (error) => {
      toast({
        description: `Error sending message: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Create a new chat
  const startNewChat = useCallback(() => {
    setActiveChatId(null);
  }, []);

  // Switch to a different chat
  const switchChat = useCallback((chatId: string) => {
    setActiveChatId(chatId);
  }, []);

  return {
    chats,
    messages,
    activeChatId,
    isLoadingChats,
    isLoadingMessages,
    isChatsError,
    isMessagesError,
    isCapturingScreen,
    sendMessage: sendMessageMutation.mutate,
    isSendingMessage: sendMessageMutation.isPending,
    startNewChat,
    switchChat
  };
}