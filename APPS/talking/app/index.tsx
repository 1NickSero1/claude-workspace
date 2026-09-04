import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SCENARIOS } from "../src/scenarios";
import { getLevelProfile, getProgress } from "../src/lib/storage";
import { colors, difficultyColors, difficultyLabel, radius, spacing } from "../src/theme";
import type { LevelProfile } from "../src/types";

export default function ScenarioListScreen() {
  const router = useRouter();
  const [streak, setStreak] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [levelProfile, setLevelProfile] = useState<LevelProfile | null | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([getProgress(), getLevelProfile()]).then(([progress, profile]) => {
        if (cancelled) return;
        setStreak(progress.streak);
        setCompleted(progress.scenariosCompleted);
        setLevelProfile(profile);
        if (!profile) router.replace("/onboarding");
      });
      return () => {
        cancelled = true;
      };
    }, [router]),
  );

  if (levelProfile === undefined || levelProfile === null) {
    return <View style={styles.container} />;
  }

  const scenarios = [...SCENARIOS].sort((a, b) => {
    if (a.difficulty === b.difficulty) return 0;
    return a.difficulty === levelProfile.level ? -1 : b.difficulty === levelProfile.level ? 1 : 0;
  });

  return (
    <View style={styles.container}>
      <View style={styles.streakBox}>
        <Text style={styles.streakNumber}>{streak}</Text>
        <Text style={styles.streakLabel}>{streak === 1 ? "día seguido" : "días seguidos"}</Text>
      </View>

      <Pressable style={styles.levelBanner} onPress={() => router.push("/onboarding")}>
        <View style={{ flex: 1 }}>
          <Text style={styles.levelBannerTitle}>
            Tu nivel: <Text style={{ color: difficultyColors[levelProfile.level] }}>{difficultyLabel[levelProfile.level]}</Text>
          </Text>
          <Text style={styles.levelBannerSubtitle}>{levelProfile.weakness}</Text>
        </View>
        <Text style={styles.levelBannerLink}>Repetir test</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Elige un escenario</Text>

      <FlatList
        data={scenarios}
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
            <View style={[styles.badge, { backgroundColor: `${difficultyColors[item.difficulty]}1a` }]}>
              <Text style={[styles.badgeText, { color: difficultyColors[item.difficulty] }]}>
                {difficultyLabel[item.difficulty]}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  streakBox: { alignItems: "center", marginBottom: spacing.md },
  streakNumber: { fontSize: 40, fontWeight: "700", color: colors.text },
  streakLabel: { fontSize: 14, color: colors.textMuted },
  levelBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  levelBannerTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  levelBannerSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  levelBannerLink: { fontSize: 13, fontWeight: "600", color: colors.primary },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: spacing.md, color: colors.text },
  list: { paddingBottom: spacing.xl, gap: spacing.md },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.card,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
  check: { fontSize: 16, color: colors.success, fontWeight: "700" },
  cardDescription: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  badge: { alignSelf: "flex-start", borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 3, marginTop: spacing.sm },
  badgeText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
});
