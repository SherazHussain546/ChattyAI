/**
 * Utility functions for capturing and processing screenshots
 */

// Capture a screenshot of the current screen using getDisplayMedia
export async function captureScreenshot(): Promise<string | null> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      throw new Error('Screen capture not supported in this browser');
    }

    // Ask for permission and access to the screen
    // TypeScript doesn't fully support all getDisplayMedia options,
    // but they're part of the standard
    // @ts-ignore - TypeScript doesn't fully recognize getDisplayMedia options
    const mediaStream = await navigator.mediaDevices.getDisplayMedia({
      video: true
    });

    if (!mediaStream) {
      throw new Error('No media stream available');
    }

    // Create a video element to capture a frame
    const video = document.createElement('video');
    video.srcObject = mediaStream;
    
    // Wait for the video to load with a timeout
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Video loading timed out'));
      }, 10000); // 10 second timeout
      
      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        video.play();
        resolve();
      };
    });

    // Create a canvas to draw the captured frame
    const canvas = document.createElement('canvas');
    
    // Check if video has valid dimensions
    if (video.videoWidth <= 0 || video.videoHeight <= 0) {
      throw new Error('Invalid video dimensions');
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the video frame to the canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Stop all tracks to release the camera
    mediaStream.getTracks().forEach(track => track.stop());
    
    // Convert canvas to base64 image data
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    if (!imageData || imageData === 'data:,') {
      throw new Error('Failed to capture image data');
    }
    
    // Resize image if it's too large
    return await resizeBase64Image(imageData);
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    alert('Failed to capture screenshot: ' + (error instanceof Error ? error.message : 'Unknown error'));
    return null;
  }
}

// Resize base64 image to reasonable dimensions to avoid API limits
export async function resizeBase64Image(base64Image: string, maxWidth = 1280, maxHeight = 720): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Image;
    
    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = height * ratio;
      }
      
      if (height > maxHeight) {
        const ratio = maxHeight / height;
        height = maxHeight;
        width = width * ratio;
      }
      
      // Create canvas with new dimensions
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      // Draw and resize image
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Image); // Fallback to original if context fails
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Get resized base64 image
      const resizedImage = canvas.toDataURL('image/jpeg', 0.8);
      resolve(resizedImage);
    };
    
    img.onerror = () => {
      console.error('Error loading image for resizing');
      resolve(base64Image); // Return original on error
    };
  });
}