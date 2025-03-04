import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { startListening, stopListening } from '@/lib/speechUtils';

interface VoiceControlsProps {
  isListening: boolean;
  onListeningChange: (listening: boolean) => void;
}

export function VoiceControls({ isListening, onListeningChange }: VoiceControlsProps) {
  useEffect(() => {
    if (isListening) {
      startListening((text) => {
        // Send the transcribed text to the chat interface
        fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text }),
        });
        onListeningChange(false);
      });
    } else {
      stopListening();
    }
    
    return () => {
      stopListening();
    };
  }, [isListening]);

  return (
    <Button
      variant={isListening ? "destructive" : "default"}
      size="lg"
      className="mt-4"
      onClick={() => onListeningChange(!isListening)}
    >
      {isListening ? (
        <>
          <MicOff className="w-6 h-6 mr-2" />
          Stop Listening
        </>
      ) : (
        <>
          <Mic className="w-6 h-6 mr-2" />
          Start Listening
        </>
      )}
    </Button>
  );
}
