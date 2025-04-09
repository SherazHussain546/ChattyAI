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
    <div className="flex flex-col h-[80vh] w-full">
      {/* Message Area with ChatGPT-like styling */}
      <div className="flex-1 overflow-y-auto mb-4" ref={scrollAreaRef}>
        <div className="max-w-[800px] mx-auto pt-4 pb-[80px]">
          {messages && messages.length > 0 ? (
            messages.map((msg: ChatMessage, idx) => (
              <div
                key={msg.id || idx}
                className={`py-5 px-4 ${
                  msg.role === 'user' 
                    ? 'bg-background' 
                    : 'bg-muted'
                } border-b border-border/20`}
              >
                <div className="max-w-3xl mx-auto flex">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 shrink-0 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-accent'}`}>
                    {msg.role === 'user' ? 'U' : 'AI'}
                  </div>
                  <div className="min-w-0 prose prose-neutral dark:prose-invert">
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.has_image && (
                      <div className="mt-2 text-xs italic text-muted-foreground">
                        [Image was analyzed for this response]
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <h2 className="text-2xl font-bold mb-2">How can I help you today?</h2>
              <p className="text-muted-foreground">Ask me anything or upload a file to analyze</p>
            </div>
          )}
          
          {/* Show streaming response in real-time */}
          {isStreaming && streamingContent && (
            <div className="py-5 px-4 bg-muted border-b border-border/20">
              <div className="max-w-3xl mx-auto flex">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center mr-3 shrink-0">
                  AI
                </div>
                <div className="min-w-0 prose prose-neutral dark:prose-invert">
                  <p className="whitespace-pre-wrap">{streamingContent}</p>
                  <div className="mt-1 flex items-center">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse mr-1"></div>
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-150 mr-1"></div>
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-300"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Regular loading indicator */}
          {isSendingMessage && !isStreaming && (
            <div className="py-5 px-4 bg-muted border-b border-border/20">
              <div className="max-w-3xl mx-auto flex">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center mr-3 shrink-0">
                  AI
                </div>
                <div className="min-w-0 prose prose-neutral dark:prose-invert flex items-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          {/* File upload preview if a file is selected */}
          {selectedFile && (
            <div className="py-5 px-4 bg-background border-b border-border/20">
              <div className="max-w-3xl mx-auto flex">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center mr-3 shrink-0">
                  U
                </div>
                <div className="min-w-0 w-full">
                  <div className="p-3 border rounded-md bg-background">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-muted-foreground" />
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
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom input bar with glass effect - ChatGPT style */}
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 fixed bottom-0 left-0 right-0">
        <div className="max-w-3xl mx-auto p-4">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 relative">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message ChattyAI..."
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                disabled={!user || isSendingMessage || isCapturingScreen}
                className="pr-[100px] py-6 text-base"
              />
              
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {/* File upload button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-8 w-8"
                  onClick={handleUploadClick}
                  disabled={!user || isSendingMessage || isCapturingScreen || isStreaming || !onUploadFile}
                  title="Upload file"
                >
                  <UploadCloud className="h-4 w-4" />
                </Button>
                
                {/* Submit button */}
                <Button 
                  size="icon"
                  className="rounded-full h-8 w-8"
                  onClick={handleSend}
                  disabled={!user || !message.trim() || isSendingMessage || isCapturingScreen}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                    <path d="M7 11L12 6L17 11M12 18V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Button>
              </div>
              
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.csv,.json,image/*"
              />
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
                  {isCapturingScreen ? "Capturing..." : "Take Screenshot"}
                </Button>
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
            
            <div className="text-center text-xs text-muted-foreground">
              ChattyAI can make mistakes. Consider checking important information.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}