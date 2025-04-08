import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AvatarProps {
  speaking: boolean;
  className?: string;
}

// Array of different AI avatar images
const avatarVariants = [
  "https://api.dicebear.com/7.x/bottts/svg?seed=gemini",
  "https://api.dicebear.com/7.x/bottts/svg?seed=aipowered",
  "https://api.dicebear.com/7.x/bottts/svg?seed=assistant",
  "https://api.dicebear.com/7.x/bottts/svg?seed=helper",
  "https://api.dicebear.com/7.x/bottts/svg?seed=chatbot"
];

export function Avatar({ speaking, className }: AvatarProps) {
  const [avatarIndex, setAvatarIndex] = useState(0);
  
  // Periodically change avatar to create a simple animation effect when speaking
  useEffect(() => {
    if (!speaking) return;
    
    const interval = setInterval(() => {
      setAvatarIndex(prev => (prev + 1) % avatarVariants.length);
    }, 300);
    
    return () => clearInterval(interval);
  }, [speaking]);
  
  return (
    <Card className={cn(
      "overflow-hidden p-0 border-4", 
      speaking ? "border-primary animate-pulse" : "border-transparent",
      className
    )}>
      <div className="aspect-square relative">
        <img 
          src={avatarVariants[avatarIndex]} 
          alt="AI Avatar" 
          className="w-full h-full object-cover"
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
