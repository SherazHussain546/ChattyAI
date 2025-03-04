import { useEffect, useRef } from 'react';
import { AvatarRenderer } from '@/lib/avatarUtils';
import { Card } from '@/components/ui/card';

interface AvatarProps {
  speaking: boolean;
}

export function Avatar({ speaking }: AvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<AvatarRenderer | null>(null);

  useEffect(() => {
    if (containerRef.current && !rendererRef.current) {
      rendererRef.current = new AvatarRenderer();
      rendererRef.current.init(containerRef.current);
    }

    return () => {
      rendererRef.current?.cleanup();
    };
  }, []);

  useEffect(() => {
    if (speaking && rendererRef.current) {
      rendererRef.current.speak();
    }
  }, [speaking]);

  return (
    <Card className="w-full aspect-square max-w-[400px] mx-auto overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
    </Card>
  );
}
