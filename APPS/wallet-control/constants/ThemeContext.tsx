import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { COLORS, DARK_COLORS } from './theme';
import { getThemeMode, saveThemeMode, ThemeMode } from '@/lib/storage';

type ColorScheme = typeof COLORS;

interface ThemeCtx {
  colors: ColorScheme;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeCtx>({
  colors: COLORS,
  isDark: false,
  themeMode: 'system',
  setThemeMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    getThemeMode().then(setThemeModeState);
  }, []);

  const isDark =
    themeMode === 'dark'  ? true  :
    themeMode === 'light' ? false :
    systemScheme === 'dark';

  const colors = isDark ? DARK_COLORS : COLORS;

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    saveThemeMode(mode);
  };

  return (
    <ThemeContext.Provider value={{ colors, isDark, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useColors(): ColorScheme {
  return useContext(ThemeContext).colors;
}

export function useThemeInfo() {
  const { isDark, themeMode, setThemeMode } = useContext(ThemeContext);
  return { isDark, themeMode, setThemeMode };
}
