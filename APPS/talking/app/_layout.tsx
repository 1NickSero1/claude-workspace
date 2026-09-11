import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { colors } from "../src/theme";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerTitleAlign: "center",
            headerStyle: { backgroundColor: colors.bg },
            headerShadowVisible: false,
            headerTintColor: colors.primary,
            headerTitleStyle: { fontWeight: "700", color: colors.text },
          }}
        >
          <Stack.Screen name="index" options={{ title: "TALKING", headerTitleStyle: { fontWeight: "800", color: colors.primary } }} />
          <Stack.Screen name="onboarding" options={{ title: "Test de nivel", headerBackVisible: false, gestureEnabled: false }} />
          <Stack.Screen name="conversation" options={{ title: "Práctica" }} />
          <Stack.Screen
            name="summary"
            options={{ title: "Resumen", headerBackVisible: false, gestureEnabled: false }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
