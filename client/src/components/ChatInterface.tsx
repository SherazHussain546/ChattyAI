import { useState, useEffect, useRef } from 'react';
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isSendingMessage]);

  const handleSend = () => {
    if (!message.trim() || !user) return;
    onSendMessage(message);
    setMessage('');
  };

  return (
    <Card className="flex flex-col h-[80vh] p-4">
      <ScrollArea className="flex-1 mb-4" ref={scrollAreaRef}>
        {messages && messages.length > 0 ? (
          messages.map((msg: ChatMessage, idx) => (
            <div
              key={msg.id || idx}
              className={`mb-4 p-3 rounded-lg ${
                msg.role === 'user' ? 'bg-primary/10 ml-auto' : 'bg-muted'
              } max-w-[80%]`}
            >
              {msg.content}
              {msg.has_image && (
                <div className="mt-2 text-xs italic text-muted-foreground">
                  [Screenshot attached]
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <p className="text-muted-foreground">No messages yet. Start a conversation!</p>
          </div>
        )}
        {isSendingMessage && (
          <div className="mb-4 p-3 rounded-lg bg-muted max-w-[80%] animate-pulse">
            AI is thinking...
          </div>
        )}
      </ScrollArea>

      <div className="flex flex-col gap-2">
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
        <div className="flex justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSendMessage(message || 'Analyze this screenshot', true)}
            disabled={!user || isSendingMessage || isCapturingScreen}
          >
            {isCapturingScreen ? "Capturing..." : "Add Screenshot"}
          </Button>
          <div className="text-xs text-muted-foreground italic">
            {isCapturingScreen && "Capturing your screen..."}
            {isSendingMessage && "Sending message..."}
          </div>
        </div>
      </div>
    </Card>
  );
}