export class SpeechHandler {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis;
  private isListening: boolean = false;

  constructor() {
    // Check for browser support
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        this.recognition = new SpeechRecognitionAPI();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
      }
      this.synthesis = window.speechSynthesis;
    }
  }

  startListening(onResult: (text: string) => void): boolean {
    if (!this.recognition) {
      console.error('Speech recognition not supported in this browser');
      return false;
    }

    if (this.isListening) {
      return true;
    }

    try {
      this.recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        onResult(text);
      };

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.isListening = false;
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };

      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      this.isListening = false;
      return false;
    }
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.error('Failed to stop speech recognition:', error);
      }
      this.isListening = false;
    }
  }

  speak(text: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.synthesis) {
        console.error('Speech synthesis not supported in this browser');
        resolve(false);
        return;
      }

      try {
        // Cancel any ongoing speech
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;

        utterance.onend = () => {
          resolve(true);
        };

        utterance.onerror = () => {
          resolve(false);
        };

        this.synthesis.speak(utterance);
      } catch (error) {
        console.error('Failed to synthesize speech:', error);
        resolve(false);
      }
    });
  }

  isRecognitionSupported(): boolean {
    return this.recognition !== null;
  }

  isSynthesisSupported(): boolean {
    return typeof this.synthesis !== 'undefined';
  }
}

export const speechHandler = new SpeechHandler();