/**
 * Speech adapter interface.
 *
 * This module uses the Web Speech API by default.
 * To swap in Whisper or another provider, replace the
 * `createSpeechAdapter` export with one that implements
 * the same { start, stop, isSupported } contract.
 */

export function createSpeechAdapter({ onResult, onError, onStateChange, lang = 'en-IN' }) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return {
      start: () => onError('Speech recognition is not supported in this browser.'),
      stop: () => {},
      isSupported: false,
    };
  }

  const recognition = new SpeechRecognition();
  recognition.lang = lang;
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  let isListening = false;

  recognition.onstart = () => {
    isListening = true;
    onStateChange('listening');
  };

  recognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    const transcript = result[0].transcript;
    const isFinal = result.isFinal;

    if (isFinal) {
      onResult(transcript);
      onStateChange('idle');
    } else {
      onStateChange('listening', transcript);
    }
  };

  recognition.onerror = (event) => {
    isListening = false;
    if (event.error === 'no-speech') {
      onError('No speech detected. Please try again.');
    } else if (event.error === 'not-allowed') {
      onError('Microphone access denied. Please allow microphone access.');
    } else {
      onError(`Speech error: ${event.error}`);
    }
    onStateChange('idle');
  };

  recognition.onend = () => {
    isListening = false;
    onStateChange('idle');
  };

  return {
    start() {
      if (isListening) return;
      recognition.start();
    },
    stop() {
      if (!isListening) return;
      recognition.stop();
    },
    isSupported: true,
  };
}
