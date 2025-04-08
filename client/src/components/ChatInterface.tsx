import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Camera, Loader2, Image as ImageIcon } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { type ChatMessage } from '@shared/schema';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string, withScreenshot?: boolean) => void;
  isCapturingScreen?: boolean;
  isSendingMessage?: boolean;
}

export function ChatInterface({ 
  messages, 
  onSendMessage, 
  isCapturingScreen = false,
  isSendingMessage = false
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleScreenshotCapture = () => {
    if (input.trim()) {
      onSendMessage(input.trim(), true);
      setInput('');
    } else {
      onSendMessage('Analyze this screenshot', true);
    }
  };

  // Format date for message timestamp
  const formatDate = (date: string | Date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
              <ImageIcon className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-center">No messages yet. Send a message to start a conversation.</p>
              <p className="text-center text-sm mt-2">
                You can also capture your screen to ask about what you're seeing.
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div 
                key={message.id || index} 
                className={cn(
                  "flex flex-col",
                  message.role === 'user' ? "items-end" : "items-start"
                )}
              >
                <Card
                  className={cn(
                    "p-4 max-w-[85%]",
                    message.role === 'user' 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-secondary"
                  )}
                >
                  <div className="prose dark:prose-invert prose-sm max-w-none">
                    {message.content}
                  </div>
                  {message.has_image && (
                    <div className="mt-2 text-xs opacity-70 italic">
                      Includes screenshot analysis
                    </div>
                  )}
                </Card>
                <div className="text-xs text-muted-foreground mt-1">
                  {message.timestamp && formatDate(message.timestamp)}
                </div>
              </div>
            ))
          )}
          {(isSendingMessage || isCapturingScreen) && (
            <div className="flex items-center space-x-2 py-2">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
              <div className="text-sm text-muted-foreground">
                {isCapturingScreen ? 'Capturing screen...' : 'AI is thinking...'}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
            disabled={isSendingMessage || isCapturingScreen}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={handleScreenshotCapture}
                  disabled={isSendingMessage || isCapturingScreen}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Share screenshot</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button 
            type="submit" 
            size="icon"
            disabled={!input.trim() || isSendingMessage || isCapturingScreen}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
