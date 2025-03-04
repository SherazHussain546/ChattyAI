import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

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
  return (
    <div className="flex gap-2 justify-center my-4">
      <Button
        variant={isListening ? "destructive" : "secondary"}
        size="icon"
        onClick={onToggleListening}
      >
        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>
      <Button
        variant={voiceEnabled ? "default" : "secondary"}
        size="icon"
        onClick={onToggleVoice}
      >
        {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </Button>
    </div>
  );
}
