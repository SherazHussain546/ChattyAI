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
import { captureScreenshot } from "@/lib/screenshotUtils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
         DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, LogOut, History, Settings, Moon, Sun } from 'lucide-react';
import type { ChatMessage, UserPreferences } from '@/lib/types';

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCapturingScreen, setIsCapturingScreen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("chat");
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const [_, navigate] = useLocation();

  // Fetch messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ['/api/messages']
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
      console.log("Message sent successfully, invalidating queries");
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });

      // Check if AI response exists
      if (data && data.aiMessage && data.aiMessage.content) {
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

  // Handle sending a message
  const handleSendMessage = (content: string, withScreenshot?: boolean) => {
    sendMessage.mutate({ content, withScreenshot });
  };

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
  }, [isListening, toast]);

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
    <div className="min-h-screen flex flex-col">
      {/* Header with profile/settings */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <h1 className="text-xl font-bold">ChattyAI</h1>
          
          <div className="flex items-center gap-4">
            {/* Theme toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
            
            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden md:inline-block">
                    {user?.email || user?.displayName || (user?.isAnonymous ? "Guest User" : "User")}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setActiveTab("profile")}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("history")}>
                  <History className="mr-2 h-4 w-4" />
                  <span>History</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
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
      </header>

      {/* Main content with tabs */}
      <div className="flex-1 container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-4">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          {/* Chat Tab */}
          <TabsContent value="chat" className="mt-6">
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div>
                <Avatar speaking={isSpeaking} />
                <VoiceControls
                  isListening={isListening}
                  voiceEnabled={!!preferences?.voiceEnabled}
                  onToggleListening={toggleListening}
                  onToggleVoice={toggleVoice}
                  isSpeechSupported={speechHandler.isRecognitionSupported()}
                  disabled={isCapturingScreen || sendMessage.isPending}
                />
              </div>

              <ChatInterface
                messages={messages}
                onSendMessage={handleSendMessage}
                isCapturingScreen={isCapturingScreen}
                isSendingMessage={sendMessage.isPending}
              />
            </div>
          </TabsContent>
          
          {/* History Tab */}
          <TabsContent value="history" className="mt-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-4">Chat History</h2>
              
              {messagesLoading ? (
                <p>Loading chat history...</p>
              ) : messages.length === 0 ? (
                <p className="text-muted-foreground">No chat history yet. Start a conversation to see your history here.</p>
              ) : (
                <div className="space-y-4">
                  {/* Group messages by day */}
                  {Array.from(new Set(messages.map(m => 
                    m.timestamp ? new Date(m.timestamp).toLocaleDateString() : ''
                  ))).map(date => (
                    <div key={date} className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">{date}</h3>
                      
                      {messages
                        .filter(m => 
                          m.timestamp && new Date(m.timestamp).toLocaleDateString() === date
                        )
                        .map((message, idx) => (
                          <div 
                            key={message.id || idx} 
                            className="p-3 border rounded-md hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                                {message.role === 'user' ? 'You' : 'AI'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {message.timestamp && new Date(message.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm line-clamp-2">{message.content}</p>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-6">
            <div className="max-w-md mx-auto">
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
          </TabsContent>
          
          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <div className="max-w-md mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Voice Responses</h3>
                      <p className="text-sm text-muted-foreground">Enable or disable AI voice responses</p>
                    </div>
                    <Button
                      variant={preferences?.voiceEnabled ? "default" : "outline"}
                      onClick={toggleVoice}
                    >
                      {preferences?.voiceEnabled ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Dark Mode</h3>
                      <p className="text-sm text-muted-foreground">Switch between light and dark theme</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={toggleTheme}
                    >
                      Toggle Theme
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}