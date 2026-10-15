import { useCallback, useRef, useState } from "react";
import * as Speech from "expo-speech";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";

export function useVoiceConversation() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // En modo continuo cada pausa cierra un "segmento" y el siguiente resultado
  // arranca vacío otra vez — hay que ir acumulando los segmentos finales a mano.
  const finalTranscriptRef = useRef("");

  useSpeechRecognitionEvent("start", () => setIsListening(true));
  useSpeechRecognitionEvent("end", () => setIsListening(false));
  useSpeechRecognitionEvent("result", (event) => {
    const segment = event.results[0]?.transcript ?? "";
    if (event.isFinal) {
      finalTranscriptRef.current = `${finalTranscriptRef.current} ${segment}`.trim();
      setTranscript(finalTranscriptRef.current);
    } else {
      setTranscript(`${finalTranscriptRef.current} ${segment}`.trim());
    }
  });
  useSpeechRecognitionEvent("error", (event) => {
    setError(event.message ?? event.error);
    setIsListening(false);
  });

  const startListening = useCallback(async (continuous = false) => {
    setError(null);
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setError("Necesitamos permiso de micrófono y reconocimiento de voz para practicar.");
      return;
    }
    finalTranscriptRef.current = "";
    setTranscript("");
    ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
      continuous,
    });
  }, []);

  const stopListening = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  const speak = useCallback((text: string, onDone?: () => void) => {
    setIsSpeaking(true);
    Speech.speak(text, {
      language: "en-US",
      onDone: () => {
        setIsSpeaking(false);
        onDone?.();
      },
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, []);

  const stopSpeaking = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
  }, []);

  return {
    isListening,
    isSpeaking,
    transcript,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
