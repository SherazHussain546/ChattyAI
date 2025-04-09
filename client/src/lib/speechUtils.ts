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
      
      // Handle custom pause markers in text (e.g., [pause:500] for a 500ms pause)
      const pausePattern = /\[pause:(\d+)\]/g;
      let cleanTextWithPauses = processedText.replace(pausePattern, '|pause=$1|');
      
      // Break long text into sentences for more natural flow
      const sentencePattern = /([.?!])\s*(?=[A-Z])/g;
      cleanTextWithPauses = cleanTextWithPauses.replace(sentencePattern, '$1|');
      
      // Split text into segments (sentences and pause markers)
      const segments = cleanTextWithPauses
        .split('|')
        .filter(segment => segment.trim().length > 0);
      
      let segmentIndex = 0;
      
      const processNextSegment = () => {
        if (segmentIndex >= segments.length) {
          resolve(true);
          return;
        }
        
        const segment = segments[segmentIndex];
        
        // Check if this segment is a pause marker
        const pauseMatch = segment.match(/pause=(\d+)/);
        if (pauseMatch) {
          const pauseDuration = parseInt(pauseMatch[1], 10);
          
          // Add a natural pause
          setTimeout(() => {
            segmentIndex++;
            processNextSegment();
          }, pauseDuration);
          
          return;
        }
        
        // Regular speech segment
        const sentence = segment;
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
        
        // Detect emphasis markers for more expressive speech
        if (sentence.includes('*') && sentence.split('*').length >= 3) {
          // Emphasis detected, make this section slightly more prominent
          utterance.pitch = params.pitch * 1.05;
          utterance.rate = params.rate * 0.95;
          
          // Remove the emphasis markers
          utterance.text = sentence.replace(/\*([^*]+)\*/g, '$1');
        } else {
          utterance.text = sentence;
        }
        
        // Add breaths between sentences for more natural speech
        if (segmentIndex > 0 && !segments[segmentIndex-1].includes('pause=')) {
          // Add a very slight pause before starting this utterance
          setTimeout(() => {
            this.synthesis.speak(utterance);
          }, 100);
        } else {
          this.synthesis.speak(utterance);
        }
        
        utterance.onend = () => {
          segmentIndex++;
          processNextSegment();
        };
        
        utterance.onerror = (event) => {
          console.error('Speech synthesis error:', event);
          segmentIndex++;
          processNextSegment();
        };
      };
      
      processNextSegment();
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
    text = text.replace(/=/g, ' equals ');
    text = text.replace(/≈/g, ' approximately equals ');
    text = text.replace(/©/g, ' copyright ');
    text = text.replace(/®/g, ' registered ');
    text = text.replace(/™/g, ' trademark ');
    
    // Numbers with commas read better with spaces instead
    text = text.replace(/(\d),(\d)/g, '$1 $2');
    
    // Fix technical terms that speech synthesis often struggles with
    text = text.replace(/API/g, 'A P I');
    text = text.replace(/UI/g, 'U I');
    text = text.replace(/UX/g, 'U X');
    text = text.replace(/HTML/g, 'H T M L');
    text = text.replace(/CSS/g, 'C S S');
    text = text.replace(/JS/g, 'JavaScript');
    text = text.replace(/JSON/g, 'J S O N');
    text = text.replace(/HTTP/g, 'H T T P');
    text = text.replace(/HTTPS/g, 'H T T P S');
    text = text.replace(/SQL/g, 'S Q L');
    text = text.replace(/IEEE/g, 'I triple E');
    text = text.replace(/URL/g, 'U R L');
    
    // Add breathing pauses for better flow - use commas for short pause
    text = text.replace(/\.(?=\s)/g, '., '); // Add slight pause after periods
    text = text.replace(/\?\s/g, '? , '); // Add slight pause after questions
    text = text.replace(/!\s/g, '! , '); // Add slight pause after exclamations
    
    // Add emphasis with slight pause before important phrases
    text = text.replace(/\b(important|note that|remember|key point|crucial)\b/gi, ', $1');
    
    // Better pronunciation of numbers
    text = text.replace(/(\d+)\.(\d+)/g, '$1 point $2'); // Better for decimals
    
    // Improve pronunciation of dashes in phrases
    text = text.replace(/(\w)-(\w)/g, '$1 $2'); // Convert dashes to spaces for better flow
    
    return text;
  }
  
  // Get the best available voice for speech
  private getBestAvailableVoice(): SpeechSynthesisVoice | null {
    if (!this.voices || this.voices.length === 0) {
      this.loadVoices();
    }
    
    // Create a priority ranking for modern, natural voices
    const voicePriority = [
      // Premium natural voices from various platforms
      { name: 'Google UK English Female', lang: 'en-GB' },
      { name: 'Google UK English Male', lang: 'en-GB' },
      { name: 'Microsoft Libby Online', lang: 'en-GB' },
      { name: 'Microsoft Ryan Online', lang: 'en-US' },
      { name: 'Microsoft Guy Online', lang: 'en-US' },
      { name: 'Microsoft Aria Online', lang: 'en-US' },
      { name: 'Google US English', lang: 'en-US' },
      { name: 'Microsoft David', lang: 'en-US' },
      { name: 'Microsoft Zira', lang: 'en-US' },
      { name: 'Samantha', lang: 'en-US' },
      { name: 'Karen', lang: 'en-AU' },
      { name: 'Daniel', lang: 'en-GB' },
      { name: 'Moira', lang: 'en-IE' },
      { name: 'Tessa', lang: 'en-ZA' },
    ];
    
    // Try each voice in priority order
    for (const priorityVoice of voicePriority) {
      const voice = this.voices.find(v => 
        v.name.includes(priorityVoice.name) && 
        v.lang.startsWith(priorityVoice.lang)
      );
      if (voice) return voice;
    }
    
    // Still no match? Try any premium-sounding voice
    const premiumVoice = this.voices.find(
      voice => voice.lang.startsWith('en') && (
        voice.name.includes('Google') || 
        voice.name.includes('Microsoft') ||
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
    
    // Analyze content to determine context
    const isQuestion = text.includes('?');
    const isExplanation = text.includes('means') || text.includes('explain') || text.includes('because');
    const isTechnical = text.includes('code') || text.includes('function') || text.includes('programming');
    const isExcited = text.includes('!') || text.includes('wow') || text.includes('amazing');
    const isLongContent = text.length > 100;
    const containsNumbers = /\d+/.test(text);
    
    // Apply context-based adjustments
    if (isQuestion) {
      // Questions should have slightly higher pitch and natural intonation
      params.pitch = 1.05;
      params.rate = 0.98; // Slightly slower for question clarity
    }
    
    if (isExplanation) {
      // Explanations need to be clearer and slightly slower
      params.rate = 0.95;
      params.pitch = 0.98; // Slightly deeper voice for authority
    }
    
    if (isTechnical) {
      // Technical content needs to be slower and very clear
      params.rate = 0.92;
      params.pitch = 0.98;
    }
    
    if (containsNumbers) {
      // Slow down content with numbers for better comprehension
      params.rate = Math.min(params.rate, 0.95);
    }
    
    if (isExcited) {
      // Excited content should be more energetic
      params.pitch = 1.07;
      params.rate = 1.03;
      params.volume = 1.0;
    }
    
    if (isLongContent) {
      // Long content needs a comfortable listening rate
      params.rate = Math.min(params.rate, 0.97);
    }
    
    // Ensure rate stays within reasonable bounds for comprehension
    params.rate = Math.max(0.9, Math.min(1.1, params.rate));
    params.pitch = Math.max(0.9, Math.min(1.1, params.pitch));
    
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