
import { useCallback } from 'react';

interface ToastOptions {
  title?: string;
  description: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

export function useToast() {
  const toast = useCallback(({ title, description, variant = 'default', duration = 3000 }: ToastOptions) => {
    // Simple implementation for now - in a real app, this would integrate with a toast library
    console.log(`[Toast - ${variant}]${title ? ` ${title}:` : ''} ${description}`);
    
    // Create a simple visual toast
    const toastElement = document.createElement('div');
    toastElement.style.position = 'fixed';
    toastElement.style.bottom = '20px';
    toastElement.style.right = '20px';
    toastElement.style.backgroundColor = variant === 'destructive' ? '#ef4444' : '#10b981';
    toastElement.style.color = 'white';
    toastElement.style.padding = '12px 16px';
    toastElement.style.borderRadius = '4px';
    toastElement.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    toastElement.style.zIndex = '9999';
    toastElement.textContent = description;
    
    document.body.appendChild(toastElement);
    
    setTimeout(() => {
      toastElement.style.opacity = '0';
      toastElement.style.transition = 'opacity 0.3s ease-out';
      
      setTimeout(() => {
        document.body.removeChild(toastElement);
      }, 300);
    }, duration);
  }, []);
  
  return { toast };
}
