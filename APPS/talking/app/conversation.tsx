import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getScenarioById } from "../src/scenarios";
import { continueScenario, generateFeedback, startScenario } from "../src/lib/claude";
import { useVoiceConversation } from "../src/lib/speech";
import { getLevelProfile, recordSession } from "../src/lib/storage";
import { setLastSessionResult } from "../src/lib/sessionStore";
import { colors, radius, shadow, spacing } from "../src/theme";
import type { ConversationTurn } from "../src/types";

export default function ConversationScreen() {
  const { scenarioId } = useLocalSearchParams<{ scenarioId: string }>();
  const router = useRouter();
  const scenario = getScenarioById(scenarioId ?? "");

  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [isLoadingReply, setIsLoadingReply] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const wasListeningRef = useRef(false);
  const hasStartedRef = useRef(false);

  const { isListening, isSpeaking, transcript, error, startListening, stopListening, speak, stopSpeaking } =
    useVoiceConversation();

  useEffect(() => {
    if (!scenario || hasStartedRef.current) return;
    hasStartedRef.current = true;
    startScenario(scenario.systemPrompt)
      .then((line) => {
        setTurns([{ role: "assistant", text: line }]);
        speak(line);
      })
      .catch((err) => {
        setStartError(err instanceof Error ? err.message : "No se pudo iniciar la práctica. Revisa tu conexión.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario]);

  const handleSend = useCallback(
    async (userText: string) => {
      if (!scenario || !userText.trim()) return;
      const historyBefore = turns;
      setTurns((prev) => [...prev, { role: "user", text: userText }]);
      setIsLoadingReply(true);
      try {
        const reply = await continueScenario(scenario.systemPrompt, historyBefore, userText);
        setTurns((prev) => [...prev, { role: "assistant", text: reply }]);
        speak(reply);
      } catch (err) {
        Alert.alert("Ups", err instanceof Error ? err.message : "No se pudo enviar tu respuesta. Intenta de nuevo.");
      } finally {
        setIsLoadingReply(false);
      }
    },
    [scenario, turns, speak],
  );

  // Cuando el reconocimiento de voz pasa de "escuchando" a "detenido" (silencio detectado),
  // se envía automáticamente lo que se transcribió — no hace falta un botón extra de "enviar".
  useEffect(() => {
    if (wasListeningRef.current && !isListening && transcript.trim()) {
      handleSend(transcript);
    }
    wasListeningRef.current = isListening;
  }, [isListening, transcript, handleSend]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [turns, isLoadingReply]);

  const handleMicPress = () => {
    if (isSpeaking) stopSpeaking();
    if (isListening) {
      stopListening();
    } else {
      startListening(true);
    }
  };

  const handleEndSession = async () => {
    if (!scenario || turns.length === 0) {
      router.replace("/");
      return;
    }
    stopSpeaking();
    if (isListening) stopListening();
    setIsEndingSession(true);
    try {
      const levelProfile = await getLevelProfile();
      const feedback = await generateFeedback(scenario.title, turns, levelProfile);
      const session = {
        id: `${Date.now()}`,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        date: new Date().toISOString(),
        turnCount: turns.length,
        feedback,
      };
      const progress = await recordSession(session);
      setLastSessionResult({ session, progress });
      router.replace("/summary");
    } catch (err) {
      Alert.alert("Ups", "No se pudo generar el resumen. Intenta terminar de nuevo.");
      setIsEndingSession(false);
    }
  };

  if (!scenario) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No encontré ese escenario.</Text>
        <Pressable onPress={() => router.replace("/")}>
          <Text style={styles.link}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  if (startError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{startError}</Text>
        <Pressable onPress={() => router.replace("/")}>
          <Text style={styles.link}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const micDisabled = isLoadingReply || isEndingSession || turns.length === 0;

  return (
    <View style={styles.container}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.transcript}>
        {turns.map((turn, i) => (
          <View key={i} style={[styles.bubble, turn.role === "user" ? styles.bubbleUser : styles.bubbleAssistant]}>
            <Text style={turn.role === "user" ? styles.bubbleTextUser : styles.bubbleTextAssistant}>{turn.text}</Text>
          </View>
        ))}
        {isListening && transcript ? (
          <View style={[styles.bubble, styles.bubbleUser, styles.bubbleInterim]}>
            <Text style={styles.bubbleTextUser}>{transcript}</Text>
          </View>
        ) : null}
        {isLoadingReply ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
      </ScrollView>

      {error ? <Text style={styles.errorInline}>{error}</Text> : null}

      <View style={styles.footer}>
        <Pressable
          onPress={handleEndSession}
          disabled={isEndingSession || isLoadingReply}
          style={styles.endButton}
        >
          {isEndingSession ? (
            <ActivityIndicator />
          ) : (
            <Text style={[styles.endButtonText, isLoadingReply && styles.endButtonTextDisabled]}>Terminar sesión</Text>
          )}
        </Pressable>

        <Pressable
          onPress={handleMicPress}
          disabled={micDisabled}
          style={[
            styles.micButton,
            isListening && styles.micButtonActive,
            micDisabled && styles.micButtonDisabled,
          ]}
        >
          <Text style={styles.micIcon}>{isListening ? "●" : "🎤"}</Text>
        </Pressable>

        <Text style={styles.micHint}>
          {isSpeaking
            ? "Hablando..."
            : isListening
              ? "Escuchando... toca de nuevo para terminar"
              : isLoadingReply
                ? "Pensando..."
                : "Toca para hablar"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.lg },
  errorText: { fontSize: 15, color: colors.danger, textAlign: "center" },
  errorInline: { fontSize: 13, color: colors.danger, textAlign: "center", paddingBottom: spacing.xs },
  link: { fontSize: 15, color: colors.primary, fontWeight: "600" },
  transcript: { padding: spacing.lg, gap: spacing.sm },
  bubble: { maxWidth: "82%", borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: spacing.md, ...shadow },
  bubbleUser: { backgroundColor: colors.primary, alignSelf: "flex-end" },
  bubbleAssistant: { backgroundColor: colors.bgSubtle, alignSelf: "flex-start" },
  bubbleInterim: { opacity: 0.5 },
  bubbleTextUser: { color: "#fff", fontSize: 15 },
  bubbleTextAssistant: { color: colors.text, fontSize: 15 },
  footer: { alignItems: "center", paddingVertical: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
  endButton: { position: "absolute", right: spacing.lg, top: spacing.xs, padding: spacing.sm },
  endButtonText: { color: colors.danger, fontSize: 13, fontWeight: "600" },
  endButtonTextDisabled: { color: colors.textSubtle },
  micButton: {
    width: 68,
    height: 68,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
    shadowOpacity: 0.18,
  },
  micButtonActive: { backgroundColor: colors.danger },
  micButtonDisabled: { backgroundColor: colors.textSubtle },
  micIcon: { fontSize: 28 },
  micHint: { fontSize: 13, color: colors.textMuted },
});
