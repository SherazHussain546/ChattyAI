
import React, { useState, useEffect, useRef } from 'react';
import { IonApp, IonRouterOutlet, IonPage, IonContent, IonHeader, IonToolbar, IonTitle, 
  IonFooter, IonInput, IonButton, IonList, IonItem, IonLabel, IonAvatar, IonIcon, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route } from 'react-router-dom';
import { send } from 'ionicons/icons';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! How can I assist you today?',
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const contentRef = useRef<HTMLIonContentElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollToBottom(300);
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Here would be the API call to your backend
      // For demo purposes, we'll simulate a response after 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));

      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: `This is a simulated response to "${inputText}"`,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error getting response:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Chat Avatar</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent ref={contentRef}>
        <IonList>
          {messages.map((message) => (
            <IonItem key={message.id} className={message.isUser ? 'user-message' : 'ai-message'}>
              {!message.isUser && (
                <IonAvatar slot="start">
                  <img alt="Avatar" src="https://ionicframework.com/docs/img/demos/avatar.svg" />
                </IonAvatar>
              )}
              <IonLabel className="message-content">
                <p>{message.text}</p>
                <p className="timestamp">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </IonLabel>
            </IonItem>
          ))}
          {isLoading && (
            <IonItem>
              <IonAvatar slot="start">
                <img alt="Avatar" src="https://ionicframework.com/docs/img/demos/avatar.svg" />
              </IonAvatar>
              <IonLabel>
                <p>Thinking...</p>
              </IonLabel>
            </IonItem>
          )}
        </IonList>
      </IonContent>
      <IonFooter>
        <IonToolbar>
          <IonInput
            placeholder="Type a message"
            value={inputText}
            onIonChange={e => setInputText(e.detail.value || '')}
            onKeyPress={handleKeyPress}
            clearInput
          ></IonInput>
          <IonButton 
            onClick={sendMessage} 
            disabled={!inputText.trim() || isLoading}
            slot="end"
          >
            <IonIcon icon={send} />
          </IonButton>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <IonRouterOutlet>
        <Route path="/" component={ChatPage} exact />
      </IonRouterOutlet>
    </IonReactRouter>
  </IonApp>
);

export default App;
