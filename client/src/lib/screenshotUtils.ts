/**
 * Utility functions for capturing and processing screenshots
 */

// Capture a screenshot of the current screen using getDisplayMedia
export async function captureScreenshot(): Promise<string | null> {
  try {
    // Ask for permission and access to the screen
    // @ts-ignore - TypeScript doesn't recognize cursor and displaySurface properties
    const mediaStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        // Setting reasonable constraints for a screenshot
        cursor: "always",
        displaySurface: "monitor",
      },
    });

    // Create a video element to capture a frame
    const video = document.createElement('video');
    video.srcObject = mediaStream;
    
    // Wait for the video to load
    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => {
        video.play();
        resolve();
      };
    });

    // Create a canvas to draw the captured frame
    const canvas = document.createElement('canvas');
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
    
    // Resize image if it's too large
    return await resizeBase64Image(imageData);
  } catch (error) {
    console.error('Error capturing screenshot:', error);
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