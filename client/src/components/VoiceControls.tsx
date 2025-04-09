import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VoiceControlsProps {
  isListening: boolean;
  voiceEnabled: boolean;
  onToggleListening: () => void;
  onToggleVoice: () => void;
  isSpeechSupported: boolean;
  disabled?: boolean;
}

export function VoiceControls({
  isListening,
  voiceEnabled,
  onToggleListening,
  onToggleVoice,
  isSpeechSupported,
  disabled = false,
}: VoiceControlsProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* Microphone control */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isListening ? "destructive" : "default"}
              size="sm"
              onClick={onToggleListening}
              className="flex items-center justify-center w-10 h-10 rounded-full"
              disabled={!isSpeechSupported || disabled}
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isListening ? "Stop listening" : "Start voice input"}</p>
            {!isSpeechSupported && <p className="text-xs text-red-500">Speech recognition not supported in this browser</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Voice response control */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant={voiceEnabled ? "default" : "secondary"} 
              size="sm" 
              onClick={onToggleVoice}
              className="flex items-center justify-center w-10 h-10 rounded-full"
              disabled={disabled}
              title={voiceEnabled ? "Disable voice responses" : "Enable voice responses"}
            >
              {voiceEnabled ? 
                <Volume2 className="h-5 w-5" /> : 
                <VolumeX className="h-5 w-5" />
              }
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{voiceEnabled ? "Disable voice responses" : "Enable voice responses"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}