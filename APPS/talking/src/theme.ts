export const colors = {
  bg: "#ffffff",
  bgSubtle: "#f8f9fb",
  card: "#fafafa",
  border: "#e5e7eb",
  text: "#1c1c1e",
  textMuted: "#6b7280",
  textSubtle: "#9ca3af",
  primary: "#4C5FD6",
  primaryDark: "#3742A8",
  danger: "#c92a2a",
  success: "#2f9e44",
  warning: "#e8590c",
};

export const difficultyColors: Record<"basico" | "intermedio" | "avanzado", string> = {
  basico: colors.success,
  intermedio: colors.warning,
  avanzado: colors.danger,
};

export const difficultyLabel: Record<"basico" | "intermedio" | "avanzado", string> = {
  basico: "Básico",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999,
};

export const shadow = {
  shadowColor: "#1c1c1e",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};
