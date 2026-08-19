import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SCENARIOS } from "../src/scenarios";
import { getProgress } from "../src/lib/storage";
import type { Difficulty } from "../src/types";

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  basico: "Básico",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  basico: "#2f9e44",
  intermedio: "#e8590c",
  avanzado: "#c92a2a",
};

export default function ScenarioListScreen() {
  const router = useRouter();
  const [streak, setStreak] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      getProgress().then((progress) => {
        setStreak(progress.streak);
        setCompleted(progress.scenariosCompleted);
      });
    }, []),
  );

  return (
    <View style={styles.container}>
      <View style={styles.streakBox}>
        <Text style={styles.streakNumber}>{streak}</Text>
        <Text style={styles.streakLabel}>{streak === 1 ? "día seguido" : "días seguidos"}</Text>
      </View>

      <Text style={styles.sectionTitle}>Elige un escenario</Text>

      <FlatList
        data={SCENARIOS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push({ pathname: "/conversation", params: { scenarioId: item.id } })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {completed.includes(item.id) && <Text style={styles.check}>✓</Text>}
            </View>
            <Text style={styles.cardDescription}>{item.description}</Text>
            <Text style={[styles.badge, { color: DIFFICULTY_COLOR[item.difficulty] }]}>
              {DIFFICULTY_LABEL[item.difficulty]}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 20, paddingTop: 12 },
  streakBox: { alignItems: "center", marginBottom: 20 },
  streakNumber: { fontSize: 40, fontWeight: "700", color: "#1c1c1e" },
  streakLabel: { fontSize: 14, color: "#6b7280" },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12, color: "#1c1c1e" },
  list: { paddingBottom: 24, gap: 12 },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    padding: 16,
    backgroundColor: "#fafafa",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 17, fontWeight: "600", color: "#1c1c1e" },
  check: { fontSize: 16, color: "#2f9e44", fontWeight: "700" },
  cardDescription: { fontSize: 14, color: "#4b5563", marginTop: 4 },
  badge: { fontSize: 12, fontWeight: "700", marginTop: 10, textTransform: "uppercase" },
});
