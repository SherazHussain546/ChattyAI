import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ChatMessage } from '@/lib/types';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Loader2, UploadCloud, FileText } from 'lucide-react';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (content: string, withScreenshot?: boolean) => void;
  isCapturingScreen?: boolean;
  isSendingMessage?: boolean;
  isStreaming?: boolean;
  streamingContent?: string;
  onUploadFile?: (file: File) => void;
  useStreaming?: boolean;
}

export function ChatInterface({
  messages,
  onSendMessage,
  isCapturingScreen = false,
  isSendingMessage = false,
  isStreaming = false,
  streamingContent = '',
  onUploadFile,
  useStreaming = false
}: ChatInterfaceProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change or streaming updates
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isSendingMessage, isStreaming, streamingContent]);

  // Handle sending a message
  const handleSend = () => {
    if (!message.trim() || !user) return;
    onSendMessage(message);
    setMessage('');
  };
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };
  
  // Handle file upload button click
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Handle submitting the selected file
  const handleFileUpload = () => {
    if (selectedFile && onUploadFile) {
      onUploadFile(selectedFile);
      setSelectedFile(null);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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
        
        {/* Show streaming response in real-time */}
        {isStreaming && streamingContent && (
          <div className="mb-4 p-3 rounded-lg bg-muted max-w-[80%]">
            {streamingContent}
            <div className="mt-2 flex items-center">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse mr-1"></div>
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-150 mr-1"></div>
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-300"></div>
            </div>
          </div>
        )}
        
        {/* Regular loading indicator */}
        {isSendingMessage && !isStreaming && (
          <div className="mb-4 p-3 rounded-lg bg-muted max-w-[80%] flex items-center">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            <span>AI is thinking...</span>
          </div>
        )}
        
        {/* File upload preview if a file is selected */}
        {selectedFile && (
          <div className="mb-4 p-3 rounded-lg bg-primary/10 ml-auto max-w-[80%]">
            <div className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">{selectedFile.name}</span>
            </div>
            <div className="mt-2 flex justify-end">
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleFileUpload}
                className="mr-2"
              >
                Upload
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedFile(null)}
              >
                Cancel
              </Button>
            </div>
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
          <div className="flex gap-2">
            {/* Screenshot button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSendMessage(message || 'Analyze this screenshot', true)}
              disabled={!user || isSendingMessage || isCapturingScreen || isStreaming}
            >
              {isCapturingScreen ? "Capturing..." : "Screenshot"}
            </Button>
            
            {/* File upload button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleUploadClick}
              disabled={!user || isSendingMessage || isCapturingScreen || isStreaming || !onUploadFile}
            >
              <UploadCloud className="h-4 w-4 mr-1" />
              Upload File
            </Button>
            
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.csv,.json"
            />
          </div>
          
          {/* Status indicators */}
          <div className="text-xs text-muted-foreground italic flex items-center">
            {isCapturingScreen && "Capturing your screen..."}
            {isSendingMessage && !isStreaming && "Sending message..."}
            {isStreaming && (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                <span>Streaming response...</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}