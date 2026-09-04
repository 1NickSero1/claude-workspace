import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { assessLevel } from "../src/lib/claude";
import { useVoiceConversation } from "../src/lib/speech";
import { saveLevelProfile } from "../src/lib/storage";
import { colors, difficultyLabel, radius, spacing } from "../src/theme";
import type { Difficulty } from "../src/types";

type Step = "welcome" | "introduce" | "scenario" | "struggle" | "goal" | "assessing" | "result" | "error";

const STRUGGLE_OPTIONS = [
  "Entender cuando hablan rápido",
  "Encontrar las palabras para hablar",
  "La gramática se me enreda",
  "La pronunciación",
];

function VoiceCapture({ onDone }: { onDone: (text: string) => void }) {
  const { isListening, transcript, error, startListening, stopListening } = useVoiceConversation();

  const handlePress = () => {
    if (isListening) {
      stopListening();
      if (transcript.trim()) onDone(transcript.trim());
    } else {
      startListening();
    }
  };

  return (
    <View style={styles.captureBox}>
      <Pressable
        onPress={handlePress}
        style={[styles.micButton, isListening && styles.micButtonActive]}
      >
        <Text style={styles.micIcon}>{isListening ? "●" : "🎤"}</Text>
      </Pressable>
      <Text style={styles.micHint}>{isListening ? "Escuchando... toca de nuevo para terminar" : "Toca y habla en inglés"}</Text>
      {isListening && transcript ? <Text style={styles.liveTranscript}>{transcript}</Text> : null}
      {error ? <Text style={styles.errorInline}>{error}</Text> : null}
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [introduction, setIntroduction] = useState("");
  const [scenarioResponse, setScenarioResponse] = useState("");
  const [struggle, setStruggle] = useState("");
  const [goal, setGoal] = useState("");
  const [result, setResult] = useState<{ level: Difficulty; weakness: string; goalSummary: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const runAssessment = async (finalGoal: string) => {
    setStep("assessing");
    try {
      const assessment = await assessLevel(introduction, scenarioResponse, struggle, finalGoal);
      await saveLevelProfile({
        level: assessment.level,
        weakness: assessment.weakness,
        goal: assessment.goalSummary,
        assessedAt: new Date().toISOString(),
      });
      setResult(assessment);
      setStep("result");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "No se pudo evaluar tu nivel. Intenta de nuevo.");
      setStep("error");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {step === "welcome" && (
          <>
            <Text style={styles.title}>Antes de empezar</Text>
            <Text style={styles.body}>
              Hagamos un diagnóstico corto y real — nada de examen de opción múltiple. Vas a presentarte en
              inglés, resolver un mini escenario hablado, y contarme en qué sentís que más te cuesta. Con eso
              te doy tu nivel real y armamos por dónde empezar.
            </Text>
            <Pressable style={styles.primaryButton} onPress={() => setStep("introduce")}>
              <Text style={styles.primaryButtonText}>Empezar</Text>
            </Pressable>
          </>
        )}

        {step === "introduce" && (
          <>
            <Text style={styles.title}>Preséntate en inglés</Text>
            <Text style={styles.body}>Tu nombre, a qué te dedicás, y por qué querés mejorar tu inglés.</Text>
            <VoiceCapture
              onDone={(text) => {
                setIntroduction(text);
                setStep("scenario");
              }}
            />
          </>
        )}

        {step === "scenario" && (
          <>
            <Text style={styles.title}>Mini escenario</Text>
            <Text style={styles.body}>You&apos;re ordering coffee, go ahead.</Text>
            <VoiceCapture
              onDone={(text) => {
                setScenarioResponse(text);
                setStep("struggle");
              }}
            />
          </>
        )}

        {step === "struggle" && (
          <>
            <Text style={styles.title}>¿En qué sentís que más te cuesta?</Text>
            <View style={styles.optionList}>
              {STRUGGLE_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  style={styles.optionCard}
                  onPress={() => {
                    setStruggle(option);
                    setStep("goal");
                  }}
                >
                  <Text style={styles.optionText}>{option}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {step === "goal" && (
          <>
            <Text style={styles.title}>¿Para qué querés mejorar tu inglés?</Text>
            <Text style={styles.body}>Viajar, trabajo, mudarte, lo que sea — así prioridad los escenarios correctos.</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej: para poder trabajar remoto con clientes de afuera"
              placeholderTextColor={colors.textSubtle}
              value={goal}
              onChangeText={setGoal}
              multiline
            />
            <Pressable
              style={[styles.primaryButton, !goal.trim() && styles.primaryButtonDisabled]}
              disabled={!goal.trim()}
              onPress={() => runAssessment(goal.trim())}
            >
              <Text style={styles.primaryButtonText}>Ver mi nivel</Text>
            </Pressable>
          </>
        )}

        {step === "assessing" && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.body}>Analizando tu inglés...</Text>
          </View>
        )}

        {step === "error" && (
          <>
            <Text style={styles.title}>Ups</Text>
            <Text style={[styles.body, { color: colors.danger }]}>{errorMessage}</Text>
            <Pressable style={styles.primaryButton} onPress={() => runAssessment(goal.trim())}>
              <Text style={styles.primaryButtonText}>Reintentar</Text>
            </Pressable>
          </>
        )}

        {step === "result" && result && (
          <>
            <Text style={styles.resultLabel}>Tu nivel</Text>
            <Text style={styles.resultLevel}>{difficultyLabel[result.level]}</Text>
            <View style={styles.resultCard}>
              <Text style={styles.resultCardLabel}>Lo que más te frena</Text>
              <Text style={styles.resultCardText}>{result.weakness}</Text>
            </View>
            <View style={styles.resultCard}>
              <Text style={styles.resultCardLabel}>Tu objetivo</Text>
              <Text style={styles.resultCardText}>{result.goalSummary}</Text>
            </View>
            <Pressable style={styles.primaryButton} onPress={() => router.replace("/")}>
              <Text style={styles.primaryButtonText}>Empezar a practicar</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.xl, gap: spacing.md },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, paddingTop: 80 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  body: { fontSize: 15, color: colors.textMuted, lineHeight: 21 },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  primaryButtonDisabled: { backgroundColor: colors.textSubtle },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  captureBox: { alignItems: "center", gap: spacing.sm, marginTop: spacing.lg },
  micButton: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  micButtonActive: { backgroundColor: colors.danger },
  micIcon: { fontSize: 30 },
  micHint: { fontSize: 13, color: colors.textMuted },
  liveTranscript: { fontSize: 14, color: colors.text, textAlign: "center", paddingHorizontal: spacing.lg },
  errorInline: { fontSize: 13, color: colors.danger, textAlign: "center", paddingHorizontal: spacing.lg },
  optionList: { gap: spacing.sm },
  optionCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.card,
  },
  optionText: { fontSize: 15, color: colors.text, fontWeight: "500" },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
    minHeight: 90,
    textAlignVertical: "top",
  },
  resultLabel: { fontSize: 14, color: colors.textMuted, textAlign: "center" },
  resultLevel: { fontSize: 36, fontWeight: "800", color: colors.primary, textAlign: "center", marginBottom: spacing.md },
  resultCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  resultCardLabel: { fontSize: 12, fontWeight: "700", color: colors.textSubtle, textTransform: "uppercase", marginBottom: 4 },
  resultCardText: { fontSize: 15, color: colors.text, lineHeight: 20 },
});
