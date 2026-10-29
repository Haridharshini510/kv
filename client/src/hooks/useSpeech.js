import { useState, useRef, useCallback, useEffect } from 'react';
import { createSpeechAdapter } from '../services/speechAdapter';

export function useSpeech() {
  const [state, setState] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState('');
  const adapterRef = useRef(null);

  useEffect(() => {
    adapterRef.current = createSpeechAdapter({
      onResult: (text) => {
        setTranscript(text);
        setInterimText('');
      },
      onError: (err) => {
        setError(err);
        setInterimText('');
      },
      onStateChange: (newState, interim) => {
        setState(newState);
        if (interim !== undefined) setInterimText(interim);
      },
    });
  }, []);

  const startListening = useCallback(() => {
    setError('');
    setTranscript('');
    setInterimText('');
    adapterRef.current?.start();
  }, []);

  const stopListening = useCallback(() => {
    adapterRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterimText('');
    setError('');
    setState('idle');
  }, []);

  return {
    state,
    transcript,
    interimText,
    error,
    isSupported: adapterRef.current?.isSupported ?? true,
    startListening,
    stopListening,
    reset,
  };
}
