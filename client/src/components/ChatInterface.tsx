import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ChatMessage } from '@/lib/types';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';

export function ChatInterface() {
  const { user, chatHistory } = useAuth();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || !user) return;

    setSending(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message,
          role: 'user',
          userId: user.uid
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="flex flex-col h-[80vh] p-4">
      <ScrollArea className="flex-1 mb-4">
        {chatHistory.map((msg: ChatMessage) => (
          <div
            key={msg.id}
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
          disabled={!user || sending}
        />
        <Button 
          onClick={handleSend}
          disabled={!user || !message.trim() || sending}
        >
          Send
        </Button>
      </div>
    </Card>
  );
}