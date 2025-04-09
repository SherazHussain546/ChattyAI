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

    let finalTranscript = '';
    let interimTranscript = '';
    let lastProcessedIndex = 0;
    
    // @ts-ignore - Event typing issues
    this.recognition.onresult = (event: any) => {
      // Reset interim transcript
      interimTranscript = '';
      
      // Process the results
      for (let i = lastProcessedIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += ' ' + transcript;
          lastProcessedIndex = i + 1;
          
          // If we have a complete sentence or phrase, send it
          if (transcript.trim().length > 0 && 
              (transcript.includes('.') || 
               transcript.includes('?') || 
               transcript.includes('!') ||
               transcript.length > 20)) {
            
            // Send the transcript to the callback
            onResult(transcript.trim());
            
            // Reset for the next phrase
            finalTranscript = '';
          }
        } else {
          interimTranscript += transcript;
        }
      }
      
      // If we have a long interim transcript without sentence markers,
      // process it anyway to avoid losing content
      if (interimTranscript.length > 40 && !finalTranscript) {
        onResult(interimTranscript.trim());
        interimTranscript = '';
      }
    };
    
    // When speech recognition ends, submit any remaining transcript
    // @ts-ignore - Event typing issues
    this.recognition.onend = () => {
      if (finalTranscript.trim() || interimTranscript.trim()) {
        onResult((finalTranscript || interimTranscript).trim());
      }
      this.isListening = false;
    };
    
    // @ts-ignore - Event typing issues
    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      
      // If we have any partial content when an error occurs, still send it
      if (finalTranscript.trim() || interimTranscript.trim()) {
        onResult((finalTranscript || interimTranscript).trim());
      }
      
      this.isListening = false;
    };

    try {
      this.recognition.lang = 'en-US'; // Set language explicitly
      this.recognition.maxAlternatives = 1;
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
      
      // Preprocess text for better speech quality
      const processedText = this.preprocessTextForSpeech(text);
      
      // Break long text into sentences to improve speech flow
      const sentences = processedText
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
        
        // Select the best available voice
        const preferredVoice = this.getBestAvailableVoice();
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
        
        // Adjust speech parameters based on content
        const params = this.getSpeechParamsForContent(sentence);
        utterance.rate = params.rate;
        utterance.pitch = params.pitch;
        utterance.volume = params.volume;
        
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
  
  // Preprocess text to make it more suitable for speech synthesis
  private preprocessTextForSpeech(text: string): string {
    // Replace URLs with a simple placeholder
    text = text.replace(/https?:\/\/\S+/g, 'a link');
    
    // Convert common abbreviations and symbols
    text = text.replace(/&/g, ' and ');
    text = text.replace(/%/g, ' percent ');
    text = text.replace(/\$/g, ' dollars ');
    text = text.replace(/\+/g, ' plus ');
    
    // Fix technical terms that speech synthesis often struggles with
    text = text.replace(/API/g, 'A P I');
    text = text.replace(/UI/g, 'U I');
    text = text.replace(/UX/g, 'U X');
    text = text.replace(/HTML/g, 'H T M L');
    text = text.replace(/CSS/g, 'C S S');
    text = text.replace(/JS/g, 'JavaScript');
    
    // Add pauses after sentences
    text = text.replace(/\.\s/g, '. ');
    
    return text;
  }
  
  // Get the best available voice for speech
  private getBestAvailableVoice(): SpeechSynthesisVoice | null {
    if (!this.voices || this.voices.length === 0) {
      this.loadVoices();
    }
    
    // Try to find a premium voice first (Google, Microsoft or natural-sounding voices)
    const premiumVoice = this.voices.find(
      voice => voice.lang.startsWith('en') && (
        voice.name.includes('Google') || 
        voice.name.includes('Microsoft') ||
        voice.name.includes('Daniel') || 
        voice.name.includes('Samantha') ||
        voice.name.includes('Karen') ||
        voice.name.includes('Natural')
      )
    );
    
    if (premiumVoice) return premiumVoice;
    
    // Next preference: any English voice
    const anyEnglishVoice = this.voices.find(
      voice => voice.lang.startsWith('en')
    );
    
    if (anyEnglishVoice) return anyEnglishVoice;
    
    // Fallback to any available voice
    return this.voices[0] || null;
  }
  
  // Get speech parameters based on content type
  private getSpeechParamsForContent(text: string): {
    rate: number,
    pitch: number,
    volume: number
  } {
    // Default parameters
    const params = {
      rate: 1.0,   // Normal speed
      pitch: 1.0,  // Normal pitch
      volume: 1.0  // Full volume
    };
    
    // Adjust based on content type
    
    // Questions - slightly higher pitch
    if (text.includes('?')) {
      params.pitch = 1.05;
    }
    
    // Explanations or long content - slightly slower rate
    if (text.length > 100 && (text.includes('means') || text.includes('explain'))) {
      params.rate = 0.95;
    }
    
    // Technical content - slower to improve comprehension
    if (text.includes('code') || text.includes('function') || text.includes('programming')) {
      params.rate = 0.9;
    }
    
    return params;
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