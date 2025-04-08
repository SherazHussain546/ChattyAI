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
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={onToggleListening}
              className={isListening ? "bg-red-100 dark:bg-red-900" : ""}
              disabled={!isSpeechSupported || disabled}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isListening ? "Stop listening" : "Start voice input"}</p>
            {!isSpeechSupported && <p className="text-xs text-red-500">Speech recognition not supported in this browser</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={onToggleVoice}
              disabled={disabled}
            >
              {voiceEnabled ? 
                <Volume2 className="h-4 w-4" /> : 
                <VolumeX className="h-4 w-4" />
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