import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import { DefaultTheme, DarkTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { COLORS, DARK_COLORS } from '@/constants/theme';
import { ThemeProvider as ColorsProvider, useThemeInfo } from '@/constants/ThemeContext';
import { getUserProfile, saveUserProfile } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

// Sin esto, expo-notifications no muestra notificaciones locales mientras la
// app está en primer plano (p. ej. al activar el toggle de saldo y entrar a Resumen).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const LightNavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.bg,
    card:       COLORS.card,
    text:       COLORS.text,
    border:     COLORS.border,
    primary:    COLORS.primary,
  },
};

const DarkNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: DARK_COLORS.bg,
    card:       DARK_COLORS.card,
    text:       DARK_COLORS.text,
    border:     DARK_COLORS.border,
    primary:    DARK_COLORS.primary,
  },
};

function InnerLayout() {
  const { isDark } = useThemeInfo();
  return (
    <ThemeProvider value={isDark ? DarkNavTheme : LightNavTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: isDark ? DARK_COLORS.bg : COLORS.bg } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="ayuda" options={{ headerShown: false }} />
        <Stack.Screen name="busqueda" options={{ headerShown: false }} />
        <Stack.Screen name="categorias" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      const localProfile = await getUserProfile();
      if (localProfile?.isAnonymous) {
        setChecked(true);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        if (!localProfile || localProfile.id !== session.user.id) {
          const { data: row } = await supabase.from('profiles')
            .select('*').eq('id', session.user.id).single();
          if (row) {
            await saveUserProfile({
              id: session.user.id,
              name: row.name,
              nickname: row.nickname,
              email: session.user.email ?? '',
              avatarColor: row.avatar_color,
              avatarEmoji: row.avatar_emoji ?? undefined,
              createdAt: row.created_at,
            });
          }
        }
        setChecked(true);
        return;
      }

      setChecked(true);
      setTimeout(() => router.replace('/onboarding'), 0);
    })();
  }, [loaded]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/onboarding');
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loaded && checked) SplashScreen.hideAsync();
  }, [loaded, checked]);

  if (!loaded || !checked) return null;

  return (
    <SafeAreaProvider>
      <ColorsProvider>
        <InnerLayout />
      </ColorsProvider>
    </SafeAreaProvider>
  );
}
