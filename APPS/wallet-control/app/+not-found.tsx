import { Link, Stack } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';
import { useColors } from '@/constants/ThemeContext';
import { SPACING } from '@/constants/theme';

export default function NotFoundScreen() {
  const COLORS = useColors();

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
        <Text style={[styles.title, { color: COLORS.text }]}>Esta pantalla no existe.</Text>

        <Link href="/" style={styles.link}>
          <Text style={[styles.linkText, { color: COLORS.primary }]}>Ir al inicio</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
  },
});
