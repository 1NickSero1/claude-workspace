import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import OnboardingScreen from './screens/OnboardingScreen';
import RegistroScreen from './screens/RegistroScreen';
import EstadoScreen from './screens/EstadoScreen';
import MenuPrincipalScreen from './screens/MenuPrincipalScreen';
import CategoriaScreen from './screens/CategoriaScreen';
import MiCasoScreen from './screens/MiCasoScreen';
import SOSScreen from './screens/SOSScreen';
import { getSession } from './lib/storage';

const Stack = createNativeStackNavigator();

export default function App() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    let mounted = true;
    getSession().then(s => {
      if (mounted) {
        setSession(s);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0d0221', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  const hasSession = !!(session?.nombre && session?.idioma && session?.estado);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
        initialRouteName={hasSession ? 'MenuPrincipal' : 'Onboarding'}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Registro" component={RegistroScreen} />
        <Stack.Screen name="Estado" component={EstadoScreen} />
        <Stack.Screen
          name="MenuPrincipal"
          component={MenuPrincipalScreen}
          initialParams={hasSession ? session : undefined}
        />
        <Stack.Screen name="Categoria" component={CategoriaScreen} />
        <Stack.Screen name="SOS" component={SOSScreen} />
        <Stack.Screen name="MiCaso" component={MiCasoScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
