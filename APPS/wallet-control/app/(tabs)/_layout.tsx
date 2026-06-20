import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/constants/ThemeContext';

export default function TabLayout() {
  const COLORS = useColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.tabBar,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 6,
          elevation: 8,
          shadowColor: COLORS.shadow,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 1,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textDim,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      {/* Tab order: Resumen → Tarjetas → Finando */}
      <Tabs.Screen
        name="resumen"
        options={{
          title: 'Resumen',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'bar-chart' : 'bar-chart-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="tarjetas"
        options={{
          title: 'Tarjetas',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'card' : 'card-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Finando',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'hardware-chip' : 'hardware-chip-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: 'Historial',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'time' : 'time-outline'} size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person-circle' : 'person-circle-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
