import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Avatar } from '@/components/Avatar';
import { ChatInterface } from '@/components/ChatInterface';
import { VoiceControls } from '@/components/VoiceControls';
import { speechHandler } from '@/lib/speechUtils';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useStreamingChat } from "@/hooks/use-streaming-chat";
import { captureScreenshot } from "@/lib/screenshotUtils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
         DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { User, LogOut, History, Settings, Moon, Sun, MessageSquare, Loader2, PlusCircle } from 'lucide-react';
import type { ChatMessage, UserPreferences } from '@/lib/types';

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCapturingScreen, setIsCapturingScreen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("chat");
  const [useStreamingResponse, setUseStreamingResponse] = useState(false);
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const [_, navigate] = useLocation();
  
  // Initialize streaming chat hook
  const { isStreaming, streamingContent, sendStreamingMessage } = useStreamingChat();

  // Fetch messages
  const { data: messages = [], isLoading: messagesLoading, refetch: refetchMessages } = useQuery<ChatMessage[]>({
    queryKey: ['/api/messages'],
    refetchInterval: 3000, // Refetch every 3 seconds to catch any missed messages
    staleTime: 1000, // Consider messages stale after 1 second
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true // Refetch when window gets focus
  });

  // Fetch user preferences
  const { data: preferences } = useQuery<UserPreferences>({
    queryKey: ['/api/preferences']
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({ content, withScreenshot }: { content: string, withScreenshot?: boolean }) => {
      let imageBase64 = null;
      
      if (withScreenshot) {
        setIsCapturingScreen(true);
        try {
          imageBase64 = await captureScreenshot();
        } catch (error) {
          console.error("Screenshot capture failed:", error);
          toast({
            title: "Screenshot Failed",
            description: "Could not capture screen content",
            variant: "destructive"
          });
        } finally {
          setIsCapturingScreen(false);
        }
      }
      
      const payload = { 
        content, 
        role: 'user',
        has_image: !!imageBase64,
        image_data: imageBase64
      };
      
      console.log("Sending message:", payload);
      const res = await apiRequest('POST', '/api/messages', payload);
      const data = await res.json();
      console.log("Received response:", data);
      return data;
    },
    onSuccess: async (data) => {
      console.log("Message sent successfully, refreshing messages");
      
      // Immediately update the QueryClient cache with the new messages
      // This ensures the UI will show the messages right away
      if (data && data.userMessage && data.aiMessage) {
        const currentMessages = queryClient.getQueryData<ChatMessage[]>(['/api/messages']) || [];
        
        // Add both messages to the cache directly
        queryClient.setQueryData<ChatMessage[]>(['/api/messages'], [
          ...currentMessages,
          data.userMessage,
          data.aiMessage
        ]);
        
        console.log("Updated message cache with new messages:", data.userMessage.id, data.aiMessage.id);
      }
      
      // Also refetch to ensure we get the latest from the server
      await refetchMessages();
      
      // Invalidate the query cache to ensure it stays updated long-term
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });

      // Check if AI response exists
      if (data && data.aiMessage && data.aiMessage.content) {
        // Process voice response
        if (preferences?.voiceEnabled) {
          setIsSpeaking(true);
          const success = await speechHandler.speak(data.aiMessage.content);
          if (!success) {
            toast({
              description: "Speech synthesis failed. Voice response disabled.",
              variant: "destructive"
            });
          }
          setIsSpeaking(false);
        }
      } else {
        console.error("Invalid AI response received:", data);
        toast({
          title: "Error",
          description: "Received invalid response from the server",
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  });

  // Update preferences mutation
  const updatePreferences = useMutation({
    mutationFn: async (prefs: Partial<UserPreferences>) => {
      const res = await apiRequest('PATCH', '/api/preferences', prefs);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/preferences'] });
    }
  });

  // Handle file upload
  const handleFileUpload = useCallback((file: File) => {
    toast({
      description: "Processing file and generating response...",
    });
    
    // TODO: Implement file upload and processing
    console.log("File upload requested:", file.name);
    
    // For now, just echo back the file name in a message
    const content = `Analyzing file: ${file.name}`;
    sendMessage.mutate({ content, withScreenshot: false });
  }, [sendMessage, toast]);
  
  // Handle sending a message with streaming
  const handleStreamingMessage = useCallback((content: string) => {
    // Check if message is very short - if so, use regular API to avoid Gemini API streaming issues
    if (content.trim().length < 5) {
      console.log("Message too short for streaming, using regular API");
      toast({
        description: "Short messages use regular response mode for better reliability",
      });
      
      // Use regular API for very short messages
      sendMessage.mutate({ content, withScreenshot: false });
      return;
    }
    
    // Send the message using streaming for longer messages
    sendStreamingMessage(content, (completeMessage) => {
      // When streaming is complete, refresh messages
      console.log("Streaming complete, refreshing messages");
      refetchMessages();
      
      // Process voice if enabled
      if (preferences?.voiceEnabled && completeMessage.content) {
        setIsSpeaking(true);
        speechHandler.speak(completeMessage.content)
          .finally(() => setIsSpeaking(false));
      }
    });
  }, [sendStreamingMessage, refetchMessages, preferences?.voiceEnabled, sendMessage, toast]);
  
  // Handle sending a message
  const handleSendMessage = useCallback((content: string, withScreenshot?: boolean) => {
    // For screenshots or when streaming is disabled, use the standard approach
    if (withScreenshot || !useStreamingResponse) {
      // Show a toast notification for longer operations
      if (withScreenshot) {
        toast({
          description: "Processing image and generating response...",
        });
      }
      
      // Start the mutation process to send the message
      sendMessage.mutate({ content, withScreenshot });
      
      // Set a timer to refresh messages if the operation takes longer than expected
      const refreshTimer = setTimeout(() => {
        if (sendMessage.isPending) {
          console.log("Message taking longer than expected, refreshing messages...");
          refetchMessages();
        }
      }, 3000);
      
      // Clear the timer when component unmounts
      return () => clearTimeout(refreshTimer);
    } else {
      // Use streaming for text-only messages when enabled
      handleStreamingMessage(content);
    }
  }, [sendMessage, toast, refetchMessages, useStreamingResponse, handleStreamingMessage]);

  // Toggle speech recognition
  const toggleListening = useCallback(() => {
    if (isListening) {
      speechHandler.stopListening();
      setIsListening(false);
      toast({
        description: "Stopped listening",
      });
    } else {
      const started = speechHandler.startListening((text) => {
        handleSendMessage(text);
        setIsListening(false);
        toast({
          description: "Message received from speech",
        });
      });

      if (!started) {
        toast({
          description: "Failed to start speech recognition",
          variant: "destructive"
        });
      } else {
        setIsListening(true);
        toast({
          description: "Listening for speech...",
        });
      }
    }
  }, [isListening, toast, handleSendMessage]);

  // Toggle voice response
  const toggleVoice = useCallback(() => {
    if (preferences) {
      updatePreferences.mutate({
        voiceEnabled: preferences.voiceEnabled ? 0 : 1
      });

      toast({
        description: preferences.voiceEnabled ? 
          "Voice responses disabled" : 
          "Voice responses enabled"
      });
    }
  }, [preferences, updatePreferences, toast]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      toast({
        title: "Logout failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    }
  };

  // Toggle theme
  const toggleTheme = () => {
    if (preferences) {
      // Assuming theme is stored in preferences (would need to be added to schema)
      // For now, just toggle a class on the document
      document.documentElement.classList.toggle('dark');
      
      toast({
        description: "Theme toggled",
      });
    }
  };

  return (
    <div className="h-screen flex dark:bg-zinc-900">
      {/* Sidebar - ChatGPT style */}
      <div className="w-[260px] h-full flex flex-col bg-zinc-50 dark:bg-zinc-900 border-r border-border/40">
        {/* New Chat Button */}
        <div className="p-2">
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2" 
            onClick={async () => {
              // Clear messages for a new chat
              try {
                // First, clear the local query cache to ensure we get fresh data
                queryClient.setQueryData(['/api/messages'], []);
                queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
                
                // Then call the API to clear the server-side data
                await apiRequest('POST', '/api/messages/clear');
                
                toast({
                  description: "Started a new chat",
                });
                
                // Immediately refetch messages to show empty chat
                await refetchMessages();
                setActiveTab("chat");
                
                console.log('Messages cleared, data refreshed');
              } catch (error) {
                console.error("Failed to clear chat:", error);
                toast({
                  title: "Error",
                  description: "Failed to start a new chat",
                  variant: "destructive"
                });
              }
            }}
          >
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New Chat
          </Button>
        </div>
        
        {/* Chat History */}
        <div className="flex-1 overflow-auto p-2">
          <div className="mt-2 mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2">Recent Chats</h3>
            {messagesLoading ? (
              <div className="flex justify-center p-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2">No chat history</p>
            ) : (
              <div className="space-y-1">
                {/* Simple history items - in a real app this would show unique chat threads */}
                {Array.from(new Set(messages.filter(m => m.role === 'user').map(m => 
                  m.timestamp ? new Date(m.timestamp).toLocaleDateString() : ''
                ))).slice(0, 5).map((date, idx) => {
                  const userMsgs = messages.filter(m => 
                    m.role === 'user' && m.timestamp && new Date(m.timestamp).toLocaleDateString() === date
                  );
                  return userMsgs.length > 0 && (
                    <Button
                      key={idx}
                      variant="ghost"
                      className="w-full justify-start text-xs text-left px-2 py-2 h-auto overflow-hidden"
                      onClick={() => setActiveTab("history")}
                    >
                      <MessageSquare className="h-3 w-3 mr-2 flex-shrink-0" />
                      <span className="truncate">{userMsgs[0].content.substring(0, 25)}{userMsgs[0].content.length > 25 ? '...' : ''}</span>
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        {/* Bottom user section */}
        <div className="border-t border-border/40 p-2">
          <div className="space-y-2">
            {/* Theme toggle */}
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-2" 
              onClick={toggleTheme}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span>{document.documentElement.classList.contains('dark') ? 'Light mode' : 'Dark mode'}</span>
            </Button>
            
            {/* Settings */}
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-2" 
              onClick={() => setActiveTab("settings")}
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Button>
            
            {/* User profile button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-3 w-3" />
                  </div>
                  <span className="truncate">{user?.email || user?.displayName || (user?.isAnonymous ? "Guest User" : "User")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setActiveTab("profile")}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleTheme}>
                  <Sun className="mr-2 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute mr-2 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span>Toggle theme</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          {/* Chat Tab - Main interface */}
          <TabsContent value="chat" className="flex-1 overflow-hidden data-[state=active]:flex flex-col">
            {/* Header with navigation buttons */}
            <div className="flex items-center justify-between p-3 border-b">
              <h2 className="text-xl font-semibold flex items-center">
                <MessageSquare className="mr-2 h-5 w-5" />
                ChattyAI
              </h2>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1 mr-2" 
                  onClick={async () => {
                    // Clear messages for a new chat - reusing same logic as sidebar button
                    try {
                      // First, clear the local query cache to ensure we get fresh data
                      queryClient.setQueryData(['/api/messages'], []);
                      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
                      
                      // Then call the API to clear the server-side data
                      await apiRequest('POST', '/api/messages/clear');
                      
                      toast({
                        description: "Started a new chat",
                      });
                      
                      // Immediately refetch messages to show empty chat
                      await refetchMessages();
                      
                      console.log('Messages cleared, data refreshed (header button)');
                    } catch (error) {
                      console.error("Failed to clear chat:", error);
                      toast({
                        title: "Error",
                        description: "Failed to start a new chat",
                        variant: "destructive"
                      });
                    }
                  }}
                >
                  <PlusCircle className="h-4 w-4 mr-1" />
                  <span>New Chat</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex items-center gap-1" 
                  onClick={() => setActiveTab("profile")}
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Profile</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex items-center gap-1" 
                  onClick={() => setActiveTab("settings")}
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex items-center gap-1" 
                  onClick={toggleTheme}
                >
                  <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto relative">
              <div className="absolute inset-0">
                <ChatInterface
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  onUploadFile={handleFileUpload}
                  isCapturingScreen={isCapturingScreen}
                  isSendingMessage={sendMessage.isPending}
                  isStreaming={isStreaming}
                  streamingContent={streamingContent}
                  useStreaming={useStreamingResponse}
                />
              </div>
            </div>
            
            {/* The floating avatar indicator */}
            <div className="fixed top-2 right-2 z-10">
              <div className="flex items-center gap-2 p-2 bg-background/80 backdrop-blur-sm rounded-full border shadow-sm">
                {isSpeaking && (
                  <span className="animate-pulse w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                )}
                <VoiceControls
                  isListening={isListening}
                  voiceEnabled={!!preferences?.voiceEnabled}
                  onToggleListening={toggleListening}
                  onToggleVoice={toggleVoice}
                  isSpeechSupported={speechHandler.isRecognitionSupported()}
                  disabled={isCapturingScreen || sendMessage.isPending}
                />
              </div>
            </div>
          </TabsContent>
          
          {/* History Tab */}
          <TabsContent value="history" className="data-[state=active]:flex flex-col h-full">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-xl font-semibold">Chat History</h2>
              <Button variant="outline" size="sm" onClick={() => setActiveTab("chat")}>
                Back to Chat
              </Button>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              {messagesLoading ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-12">
                  <p className="text-muted-foreground">No chat history yet. Start a conversation to see your history here.</p>
                  <Button className="mt-4" onClick={() => setActiveTab("chat")}>Start a New Chat</Button>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto divide-y divide-border/40">
                  {/* Group messages by day */}
                  {Array.from(new Set(messages.map(m => 
                    m.timestamp ? new Date(m.timestamp).toLocaleDateString() : ''
                  ))).map(date => (
                    <div key={date} className="py-4">
                      <h3 className="text-sm font-medium text-muted-foreground mb-4">{date}</h3>
                      
                      <div className="space-y-3">
                        {messages
                          .filter(m => 
                            m.timestamp && new Date(m.timestamp).toLocaleDateString() === date
                          )
                          .map((message, idx) => (
                            <div 
                              key={message.id || idx} 
                              className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                                  {message.role === 'user' ? 'You' : 'AI'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {message.timestamp && new Date(message.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-sm">{message.content}</p>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Profile Tab */}
          <TabsContent value="profile" className="data-[state=active]:flex flex-col h-full">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-xl font-semibold">Profile</h2>
              <Button variant="outline" size="sm" onClick={() => setActiveTab("chat")}>
                Back to Chat
              </Button>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              <div className="max-w-md mx-auto mt-8">
                <Card>
                  <CardHeader>
                    <CardTitle>User Profile</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-center">
                      <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-12 w-12 text-primary" />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="font-medium">Email</h3>
                      <p className="text-muted-foreground">
                        {user?.email || 'No email available'}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="font-medium">User Type</h3>
                      <p className="text-muted-foreground">
                        {user?.isAnonymous ? 'Guest User' : 'Registered User'}
                      </p>
                    </div>
                    
                    <Button 
                      variant="destructive" 
                      className="w-full" 
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          {/* Settings Tab */}
          <TabsContent value="settings" className="data-[state=active]:flex flex-col h-full">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-xl font-semibold">Settings</h2>
              <Button variant="outline" size="sm" onClick={() => setActiveTab("chat")}>
                Back to Chat
              </Button>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              <div className="max-w-md mx-auto mt-8">
                <Card>
                  <CardHeader>
                    <CardTitle>App Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Voice Responses</h3>
                        <p className="text-sm text-muted-foreground">Enable AI voice responses</p>
                      </div>
                      <Switch 
                        checked={!!preferences?.voiceEnabled}
                        onCheckedChange={toggleVoice}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Dark Mode</h3>
                        <p className="text-sm text-muted-foreground">Switch between light and dark theme</p>
                      </div>
                      <Switch 
                        checked={document.documentElement.classList.contains('dark')}
                        onCheckedChange={toggleTheme}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Streaming Responses</h3>
                        <p className="text-sm text-muted-foreground">Enable real-time streaming of AI responses</p>
                      </div>
                      <Switch 
                        checked={useStreamingResponse}
                        onCheckedChange={setUseStreamingResponse}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}