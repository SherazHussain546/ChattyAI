export class SpeechHandler {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis;
  private isListening: boolean = false;

  constructor() {
    // Check for both standard and webkit prefixed
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      this.recognition = new SpeechRecognitionAPI();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
    }

    this.synthesis = window.speechSynthesis;
  }

  startListening(onResult: (text: string) => void): void {
    if (!this.recognition) {
      console.error('Speech recognition not supported in this browser');
      return;
    }

    if (this.isListening) {
      return;
    }

    this.recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      onResult(text);
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
    };

    try {
      this.recognition.start();
      this.isListening = true;
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      this.isListening = false;
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

  speak(text: string): void {
    if (!this.synthesis) {
      console.error('Speech synthesis not supported in this browser');
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      this.synthesis.speak(utterance);
    } catch (error) {
      console.error('Failed to synthesize speech:', error);
    }
  }
}

export const speechHandler = new SpeechHandler();