import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AvatarRenderer } from '@/lib/avatarUtils';

interface AvatarProps {
  speaking: boolean;
  className?: string;
}

export function Avatar({ speaking, className }: AvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<AvatarRenderer | null>(null);
  
  // Initialize the 3D avatar
  useEffect(() => {
    // Create a renderer if it doesn't exist
    if (!rendererRef.current) {
      rendererRef.current = new AvatarRenderer();
    }
    
    // Initialize the renderer with the container
    if (containerRef.current) {
      rendererRef.current.init(containerRef.current);
    }
    
    // Cleanup on unmount
    return () => {
      if (rendererRef.current) {
        rendererRef.current.cleanup();
      }
    };
  }, []);
  
  // Update speaking state
  useEffect(() => {
    if (!rendererRef.current) return;
    
    if (speaking) {
      rendererRef.current.speak();
    } else {
      rendererRef.current.stopSpeaking();
    }
  }, [speaking]);
  
  return (
    <Card className={cn(
      "overflow-hidden p-0 border-4", 
      speaking ? "border-primary" : "border-transparent",
      className
    )}>
      <div className="aspect-square relative">
        <div 
          ref={containerRef} 
          className="w-full h-full"
        />
        {speaking && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center">
            <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
              Speaking...
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
