import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ChatMessage } from '@/lib/types';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (content: string, withScreenshot?: boolean) => void;
  isCapturingScreen?: boolean;
  isSendingMessage?: boolean;
}

export function ChatInterface({
  messages,
  onSendMessage,
  isCapturingScreen = false,
  isSendingMessage = false
}: ChatInterfaceProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (!message.trim() || !user) return;
    onSendMessage(message);
    setMessage('');
  };

  return (
    <Card className="flex flex-col h-[80vh] p-4">
      <ScrollArea className="flex-1 mb-4">
        {messages.map((msg: ChatMessage, idx) => (
          <div
            key={msg.id || idx}
            className={`mb-4 p-3 rounded-lg ${
              msg.role === 'user' ? 'bg-primary/10 ml-auto' : 'bg-muted'
            } max-w-[80%]`}
          >
            {msg.content}
          </div>
        ))}
      </ScrollArea>

      <div className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          disabled={!user || isSendingMessage || isCapturingScreen}
        />
        <Button 
          onClick={handleSend}
          disabled={!user || !message.trim() || isSendingMessage || isCapturingScreen}
        >
          Send
        </Button>
      </div>
    </Card>
  );
}