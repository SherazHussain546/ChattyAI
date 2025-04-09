import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { resizeBase64Image } from '@/lib/screenshotUtils';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera, CameraOff } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ScreenStreamCaptureProps {
  onAnalysisResult: (result: string) => void;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function ScreenStreamCapture({ 
  onAnalysisResult, 
  enabled, 
  onToggle 
}: ScreenStreamCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureInterval, setCaptureInterval] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  // Start screen capture
  const startCapture = useCallback(async () => {
    try {
      setIsCapturing(true);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen capture not supported in your browser');
      }
      
      // Request screen sharing permission
      // @ts-ignore - TypeScript doesn't fully recognize getDisplayMedia options
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        // The following options are standard but not fully typed in TypeScript
        // cursor: 'always',
        // displaySurface: 'window'
      });
      
      // Stop the stream when track ends (user stops sharing)
      mediaStream.getVideoTracks()[0].onended = () => {
        stopCapture();
      };
      
      setStream(mediaStream);
      
      // Connect stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      // Start analysis loop
      const intervalId = window.setInterval(() => {
        captureAndAnalyzeFrame();
      }, 5000); // Analyze every 5 seconds
      
      setCaptureInterval(intervalId);
      onToggle(true);
      
      toast({
        description: "Screen streaming started. Your screen will be analyzed every 5 seconds.",
      });
      
    } catch (error) {
      console.error('Error starting screen capture:', error);
      setIsCapturing(false);
      
      toast({
        title: "Screen Capture Failed",
        description: error instanceof Error ? error.message : "Could not start screen capture",
        variant: "destructive"
      });
    }
  }, [onToggle, toast]);
  
  // Stop screen capture
  const stopCapture = useCallback(() => {
    // Clear interval
    if (captureInterval) {
      clearInterval(captureInterval);
      setCaptureInterval(null);
    }
    
    // Stop all tracks
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsCapturing(false);
    onToggle(false);
    
    toast({
      description: "Screen streaming stopped",
    });
  }, [captureInterval, stream, onToggle, toast]);
  
  // Capture and analyze current frame
  const captureAndAnalyzeFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !stream) {
      return;
    }
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the current video frame to the canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      // Only capture if video has valid dimensions
      if (video.videoWidth <= 0 || video.videoHeight <= 0) {
        return;
      }
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get image data as base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      // Resize image to save bandwidth
      const resizedImage = await resizeBase64Image(imageData);
      
      // Send to server for analysis
      const result = await analyzeScreenshot(resizedImage);
      
      // Send result to parent component
      if (result) {
        onAnalysisResult(result);
      }
    } catch (error) {
      console.error('Error capturing or analyzing frame:', error);
    }
  }, [stream, onAnalysisResult]);
  
  // Send screenshot to server for analysis
  const analyzeScreenshot = async (imageBase64: string): Promise<string | null> => {
    try {
      const response = await apiRequest('POST', '/api/analyze-screen', {
        image_data: imageBase64
      });
      
      const data = await response.json();
      return data.analysis || null;
    } catch (error) {
      console.error('Error analyzing screenshot:', error);
      return null;
    }
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Stop capture on unmount
      if (captureInterval) {
        clearInterval(captureInterval);
      }
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [captureInterval, stream]);
  
  // Toggle capture based on enabled prop
  useEffect(() => {
    if (enabled && !isCapturing) {
      startCapture();
    } else if (!enabled && isCapturing) {
      stopCapture();
    }
  }, [enabled, isCapturing, startCapture, stopCapture]);
  
  return (
    <div className="relative">
      {/* Hidden video element to hold the stream */}
      <video 
        ref={videoRef} 
        autoPlay 
        muted 
        className="hidden" 
      />
      
      {/* Hidden canvas element for frame capture */}
      <canvas 
        ref={canvasRef} 
        className="hidden" 
      />
      
      {/* Controls */}
      <Button
        variant={isCapturing ? "destructive" : "default"}
        size="sm"
        onClick={() => isCapturing ? stopCapture() : startCapture()}
        className="flex items-center gap-1"
      >
        {isCapturing ? (
          <>
            <CameraOff className="h-4 w-4 mr-1" />
            Stop Streaming
          </>
        ) : (
          <>
            <Camera className="h-4 w-4 mr-1" />
            Start Streaming
          </>
        )}
      </Button>
      
      {/* Status indicator */}
      {isCapturing && (
        <div className="absolute top-0 right-0 -mt-1 -mr-1">
          <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
        </div>
      )}
    </div>
  );
}