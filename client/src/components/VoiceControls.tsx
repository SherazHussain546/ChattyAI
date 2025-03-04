import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useEffect } from 'react';
import { speechHandler } from '@/lib/speechUtils';

interface VoiceControlsProps {
  isListening: boolean;
  voiceEnabled: boolean;
  onToggleListening: () => void;
  onToggleVoice: () => void;
}

export function VoiceControls({
  isListening,
  voiceEnabled,
  onToggleListening,
  onToggleVoice
}: VoiceControlsProps) {
  // Check browser support on mount
  useEffect(() => {
    if (!speechHandler.isRecognitionSupported()) {
      console.warn('Speech recognition is not supported in this browser');
    }
    if (!speechHandler.isSynthesisSupported()) {
      console.warn('Speech synthesis is not supported in this browser');
    }
  }, []);

  return (
    <div className="flex gap-2 justify-center my-4">
      <Button
        variant={isListening ? "destructive" : "secondary"}
        size="icon"
        onClick={onToggleListening}
        disabled={!speechHandler.isRecognitionSupported()}
        title={!speechHandler.isRecognitionSupported() ? "Speech recognition not supported in this browser" : ""}
      >
        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>
      <Button
        variant={voiceEnabled ? "default" : "secondary"}
        size="icon"
        onClick={onToggleVoice}
        disabled={!speechHandler.isSynthesisSupported()}
        title={!speechHandler.isSynthesisSupported() ? "Speech synthesis not supported in this browser" : ""}
      >
        {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </Button>
    </div>
  );
}