import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { getLastSessionResult } from "../src/lib/sessionStore";
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
          <Text style={styles.streakNumber}>{progress.streak}</Text>
          <Text style={styles.streakLabel}>{progress.streak === 1 ? "día seguido" : "días seguidos"}</Text>
        </View>

        <Text style={styles.scenarioTitle}>{session.scenarioTitle}</Text>
        <Text style={styles.turnCount}>{session.turnCount} intercambios</Text>

        <Text style={styles.sectionTitle}>Feedback de SPEAKY</Text>
        <Text style={styles.feedback}>{session.feedback}</Text>
      </ScrollView>

      <Pressable style={styles.button} onPress={() => router.replace("/")}>
        <Text style={styles.buttonText}>Volver a escenarios</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  content: { padding: 24, alignItems: "center" },
  streakBox: { alignItems: "center", marginBottom: 20 },
  streakNumber: { fontSize: 44, fontWeight: "700", color: "#1c1c1e" },
  streakLabel: { fontSize: 14, color: "#6b7280" },
  scenarioTitle: { fontSize: 20, fontWeight: "700", color: "#1c1c1e", textAlign: "center" },
  turnCount: { fontSize: 13, color: "#6b7280", marginTop: 4, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: "#1c1c1e", alignSelf: "flex-start", marginBottom: 8 },
  feedback: { fontSize: 15, color: "#374151", lineHeight: 22 },
  title: { fontSize: 16, color: "#1c1c1e" },
  link: { fontSize: 15, color: "#1c7ed6", fontWeight: "600" },
  button: { margin: 20, backgroundColor: "#1c7ed6", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
