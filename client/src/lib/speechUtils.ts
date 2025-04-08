export class SpeechHandler {
  // @ts-ignore - Using any for cross-browser support
  private recognition: any = null;
  private synthesis: SpeechSynthesis;
  private isListening: boolean = false;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    // Initialize speech synthesis
    this.synthesis = window.speechSynthesis;
    
    // Initialize speech recognition if available
    // @ts-ignore - Using window properties that TypeScript doesn't recognize
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      // @ts-ignore - Cross-browser SpeechRecognition
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognitionAPI();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
    }
    
    // Load available voices
    this.loadVoices();
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = this.loadVoices.bind(this);
    }
  }
  
  private loadVoices(): void {
    this.voices = this.synthesis?.getVoices() || [];
  }

  startListening(onResult: (text: string) => void): boolean {
    if (!this.recognition || this.isListening) return false;

    // @ts-ignore - Event typing issues
    this.recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1][0].transcript;
      onResult(result);
    };
    
    // @ts-ignore - Event typing issues
    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
    };

    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      return false;
    }
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      } finally {
        this.isListening = false;
      }
    }
  }

  async speak(text: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.synthesis) {
        resolve(false);
        return;
      }

      // Cancel any ongoing speech
      this.synthesis.cancel();
      
      // Break long text into sentences to improve speech flow
      const sentences = text
        .replace(/([.?!])\s*(?=[A-Z])/g, "$1|")
        .split("|")
        .filter(sentence => sentence.trim().length > 0);
      
      let sentenceIndex = 0;
      
      const speakNextSentence = () => {
        if (sentenceIndex >= sentences.length) {
          resolve(true);
          return;
        }
        
        const sentence = sentences[sentenceIndex];
        const utterance = new SpeechSynthesisUtterance(sentence);
        
        // Use a better voice if available
        const preferredVoice = this.voices.find(
          voice => voice.lang === 'en-US' && (voice.name.includes('Google') || voice.name.includes('Daniel'))
        );
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
        
        // Adjust speech parameters
        utterance.rate = 1.0;  // Normal speed
        utterance.pitch = 1.0; // Normal pitch
        
        utterance.onend = () => {
          sentenceIndex++;
          speakNextSentence();
        };
        
        utterance.onerror = (event) => {
          console.error('Speech synthesis error:', event);
          sentenceIndex++;
          speakNextSentence();
        };
        
        this.synthesis.speak(utterance);
      };
      
      speakNextSentence();
    });
  }

  isRecognitionSupported(): boolean {
    return !!this.recognition;
  }

  isSynthesisSupported(): boolean {
    return !!this.synthesis;
  }
  
  getListeningState(): boolean {
    return this.isListening;
  }
  
  // Cancel any ongoing speech
  cancelSpeech(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }
}

export const speechHandler = new SpeechHandler();