import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, VolumeX, Settings } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

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
  const [pulseAnim, setPulseAnim] = useState(false);
  const [showAccessibility, setShowAccessibility] = useState(false);
  
  // Add pulse animation when listening to provide visual feedback
  useEffect(() => {
    if (isListening) {
      // Start pulsing animation with intervals
      const interval = setInterval(() => {
        setPulseAnim(prev => !prev);
      }, 750);
      
      return () => clearInterval(interval);
    } else {
      setPulseAnim(false);
    }
  }, [isListening]);
  
  return (
    <div className="flex flex-col gap-3 rounded-lg p-2 bg-background/60 backdrop-blur-sm shadow-sm border">
      <div className="flex justify-center">
        <Badge variant="outline" className="text-xs">
          Voice Controls
        </Badge>
      </div>
      
      <div className="flex flex-row gap-2 justify-center">
        {/* Microphone control */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isListening ? "destructive" : "default"}
                size="sm"
                onClick={onToggleListening}
                className={`flex items-center justify-center w-10 h-10 rounded-full ${isListening && pulseAnim ? 'animate-pulse' : ''}`}
                disabled={!isSpeechSupported || disabled}
                aria-label={isListening ? "Stop listening" : "Start voice input"}
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
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
                aria-label={voiceEnabled ? "Disable voice responses" : "Enable voice responses"}
              >
                {voiceEnabled ? 
                  <Volume2 className="h-5 w-5" /> : 
                  <VolumeX className="h-5 w-5" />
                }
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{voiceEnabled ? "Disable voice responses" : "Enable voice responses"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {/* Settings button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowAccessibility(!showAccessibility)}
                className="flex items-center justify-center w-10 h-10 rounded-full"
                aria-label="Voice settings"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Voice settings</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Accessibility information */}
      {showAccessibility && (
        <div className="text-xs p-2 bg-muted rounded-md mt-2">
          <p><strong>Keyboard shortcuts:</strong></p>
          <p>• Press <kbd className="px-1 border rounded">M</kbd> to toggle microphone</p>
          <p>• Press <kbd className="px-1 border rounded">V</kbd> to toggle voice responses</p>
        </div>
      )}
      
      {/* Status indicator */}
      {isListening && (
        <div className="text-center text-xs text-primary">
          Listening...
        </div>
      )}
    </div>
  );
}