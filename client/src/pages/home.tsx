import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { Avatar } from '@/components/Avatar';
import { ChatInterface } from '@/components/ChatInterface';
import { VoiceControls } from '@/components/VoiceControls';
import { speechHandler } from '@/lib/speechUtils';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from "@/hooks/use-toast";
import type { ChatMessage, UserPreferences } from '@shared/schema';

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { toast } = useToast();

  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ['/api/messages']
  });

  const { data: preferences } = useQuery<UserPreferences>({
    queryKey: ['/api/preferences']
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest('POST', '/api/messages', { content, role: 'user' });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });

      if (preferences?.voiceEnabled) {
        setIsSpeaking(true);
        if (!speechHandler.speak(data.aiMessage.content)) {
          toast({
            description: "Speech synthesis failed. Voice response disabled.",
            variant: "destructive"
          });
        }
        // Set a reasonable timeout for speaking to complete
        setTimeout(() => setIsSpeaking(false), 3000);
      }
    },
    onError: () => {
      toast({
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  });

  const updatePreferences = useMutation({
    mutationFn: async (prefs: Partial<UserPreferences>) => {
      const res = await apiRequest('PATCH', '/api/preferences', prefs);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/preferences'] });
    }
  });

  const handleSendMessage = (content: string) => {
    sendMessage.mutate(content);
  };

  const toggleListening = useCallback(() => {
    if (isListening) {
      speechHandler.stopListening();
      setIsListening(false);
    } else {
      const started = speechHandler.startListening((text) => {
        handleSendMessage(text);
        setIsListening(false);
      });

      if (!started) {
        toast({
          description: "Failed to start speech recognition",
          variant: "destructive"
        });
      } else {
        setIsListening(true);
      }
    }
  }, [isListening]);

  const toggleVoice = useCallback(() => {
    if (preferences) {
      updatePreferences.mutate({
        voiceEnabled: preferences.voiceEnabled ? 0 : 1
      });
    }
  }, [preferences, updatePreferences]);

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-4xl font-bold text-center mb-8">AI Chat Assistant</h1>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <Avatar speaking={isSpeaking} />
          <VoiceControls
            isListening={isListening}
            voiceEnabled={!!preferences?.voiceEnabled}
            onToggleListening={toggleListening}
            onToggleVoice={toggleVoice}
          />
        </div>

        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}