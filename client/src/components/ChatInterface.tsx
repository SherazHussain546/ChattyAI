import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { speak } from '@/lib/speechUtils';
import type { Message } from '@shared/schema';

interface ChatInterfaceProps {
  isListening: boolean;
  onSpeakingChange: (speaking: boolean) => void;
}

export function ChatInterface({ isListening, onSpeakingChange }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const { toast } = useToast();

  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: ['/api/messages'],
  });

  const mutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      onSpeakingChange(true);
      await speak(data.content);
      onSpeakingChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    mutation.mutate(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-[600px]">
      <ScrollArea className="flex-1 p-4 rounded-lg border">
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          messages?.map((msg, i) => (
            <Card key={i} className={`mb-4 p-3 ${
              msg.role === 'user' ? 'bg-primary/10 ml-8' : 'bg-secondary/10 mr-8'
            }`}>
              {msg.content}
            </Card>
          ))
        )}
      </ScrollArea>
      
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isListening || mutation.isPending}
        />
        <Button 
          type="submit" 
          disabled={isListening || mutation.isPending}
        >
          Send
        </Button>
      </form>
    </div>
  );
}
