import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { ChatInterface } from "@/components/ChatInterface";
import { VoiceControls } from "@/components/VoiceControls";
import { Card } from "@/components/ui/card";

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col items-center justify-center">
              <Avatar isSpeaking={isSpeaking} />
              <VoiceControls 
                isListening={isListening}
                onListeningChange={setIsListening}
              />
            </div>
            <ChatInterface 
              isListening={isListening}
              onSpeakingChange={setIsSpeaking}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
