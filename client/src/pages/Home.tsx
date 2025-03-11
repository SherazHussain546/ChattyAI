
import React, { useState, useCallback } from 'react';
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonFooter, 
  IonInput, IonButton, IonList, IonItem, IonLabel, IonIcon } from '@ionic/react';
import { send, mic, micOff } from 'ionicons/icons';
import { getChatResponse } from '../lib/openai';
import { useToast } from '../hooks/useToast';

interface Message {
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const Home: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { toast } = useToast();
  
  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    // Add user message
    const userMessage = {
      text: input,
      sender: 'user' as const,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    try {
      // Convert messages to format expected by OpenAI
      const history = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.text
      }));
      
      // Get AI response
      const response = await getChatResponse(input, history);
      
      // Add AI message
      setMessages(prev => [
        ...prev, 
        {
          text: response,
          sender: 'ai',
          timestamp: new Date()
        }
      ]);
      
    } catch (error) {
      console.error('Error getting response:', error);
      toast({
        description: "Failed to get AI response",
        variant: "destructive"
      });
    }
  };
  
  const toggleListening = useCallback(() => {
    if (isListening) {
      setIsListening(false);
      toast({
        description: "Stopped listening",
      });
    } else {
      const started = true; // Replace with actual speech recognition start
      
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
  
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>AI Chat Assistant</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="ion-padding">
        <div className="avatar-container">
          {/* Avatar would go here */}
          <div className="avatar-placeholder" style={{
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            backgroundColor: '#ffd700',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            Avatar
          </div>
        </div>
        
        <IonList>
          {messages.map((message, index) => (
            <IonItem key={index} className={message.sender === 'user' ? 'user-message' : 'ai-message'}>
              <IonLabel className="message-content">
                <h2>{message.sender === 'user' ? 'You' : 'AI'}</h2>
                <p>{message.text}</p>
                <p className="timestamp">{message.timestamp.toLocaleTimeString()}</p>
              </IonLabel>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
      
      <IonFooter>
        <IonToolbar>
          <div className="input-container" style={{ display: 'flex', padding: '8px' }}>
            <IonButton onClick={toggleListening} fill="clear">
              <IonIcon icon={isListening ? micOff : mic} />
            </IonButton>
            <IonInput 
              value={input} 
              placeholder="Type your message..." 
              onIonChange={e => setInput(e.detail.value!)} 
              className="message-input"
              style={{ flex: 1, '--padding-start': '12px' }}
            />
            <IonButton onClick={handleSendMessage} disabled={!input.trim()}>
              <IonIcon icon={send} />
            </IonButton>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default Home;
