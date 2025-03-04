let recognition: SpeechRecognition | null = null;
let synthesis = window.speechSynthesis;

export function startListening(onResult: (text: string) => void) {
  if (!('webkitSpeechRecognition' in window)) {
    throw new Error('Speech recognition not supported');
  }

  recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    onResult(text);
  };

  recognition.start();
}

export function stopListening() {
  recognition?.stop();
  recognition = null;
}

export async function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => resolve();
    synthesis.speak(utterance);
  });
}
