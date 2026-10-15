import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { getLastSessionResult } from "../src/lib/sessionStore";
import { colors, radius, shadow, spacing } from "../src/theme";
import type { ProgressData, SessionRecord } from "../src/types";

export default function SummaryScreen() {
  const router = useRouter();
  const [result, setResult] = useState<{ session: SessionRecord; progress: ProgressData } | null>(null);

  useEffect(() => {
    setResult(getLastSessionResult());
  }, []);

  if (!result) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Sin resumen disponible</Text>
        <Pressable onPress={() => router.replace("/")}>
          <Text style={styles.link}>Volver a escenarios</Text>
        </Pressable>
      </View>
    );
  }

  const { session, progress } = result;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.streakBox}>
          <Text style={styles.streakEmoji}>{progress.streak > 0 ? "🔥" : "💤"}</Text>
          <View>
            <Text style={styles.streakNumber}>{progress.streak}</Text>
            <Text style={styles.streakLabel}>{progress.streak === 1 ? "día seguido" : "días seguidos"}</Text>
          </View>
        </View>

        <Text style={styles.scenarioTitle}>{session.scenarioTitle}</Text>
        <Text style={styles.turnCount}>{session.turnCount} intercambios</Text>

        <Text style={styles.sectionTitle}>Feedback de SPEAKY</Text>
        <View style={styles.feedbackCard}>
          <Text style={styles.feedback}>{session.feedback}</Text>
        </View>
      </ScrollView>

      <Pressable style={styles.button} onPress={() => router.replace("/")}>
        <Text style={styles.buttonText}>Volver a escenarios</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  content: { padding: spacing.lg, alignItems: "center" },
  streakBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow,
  },
  streakEmoji: { fontSize: 28 },
  streakNumber: { fontSize: 26, fontWeight: "800", color: colors.text, textAlign: "center" },
  streakLabel: { fontSize: 12, color: colors.textMuted },
  scenarioTitle: { fontSize: 20, fontWeight: "700", color: colors.text, textAlign: "center" },
  turnCount: { fontSize: 13, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: colors.text, alignSelf: "flex-start", marginBottom: spacing.sm },
  feedbackCard: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadow,
  },
  feedback: { fontSize: 15, color: colors.text, lineHeight: 22 },
  title: { fontSize: 16, color: colors.text },
  link: { fontSize: 15, color: colors.primary, fontWeight: "600" },
  button: { margin: spacing.lg, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
